"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiGet, apiPost, deleteProfile as deleteProfileApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  Users,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Profile } from "@/lib/types";

type SortBy = "handle" | "followers" | "last_scraped";
type SortDir = "asc" | "desc";

interface ScrapingJob {
  id: string;
  profile_id: string;
  status: string;
  total_posts: number | null;
  processed_posts: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Nunca";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "hace unos segundos";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  return `hace ${months}m`;
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("es-ES");
}

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("last_scraped");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const intervalsRef = useRef<Record<string, number>>({});

  const fetchProfiles = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGet<Profile[]>("/profiles");
      setProfiles(data);
    } catch (err: any) {
      setError(err.message || "Error cargando perfiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Polling for active profiles
  useEffect(() => {
    const activeProfiles = profiles.filter(
      (p) => p.status === "scraping" || p.status === "analyzing"
    );

    // Clean up intervals for profiles that are no longer active
    Object.keys(intervalsRef.current).forEach((profileId) => {
      if (!activeProfiles.find((p) => p.id === profileId)) {
        window.clearInterval(intervalsRef.current[profileId]);
        delete intervalsRef.current[profileId];
      }
    });

    activeProfiles.forEach((profile) => {
      if (intervalsRef.current[profile.id]) return;

      const interval = window.setInterval(async () => {
        try {
          const jobs = await apiGet<ScrapingJob[]>(
            `/jobs/profile/${profile.id}`
          );
          const latest = jobs[0];
          if (!latest) return;

          setProfiles((prev) =>
            prev.map((p) => {
              if (p.id !== profile.id) return p;
              // Map job status to profile status
              let newStatus: Profile["status"] = p.status;
              if (latest.status === "running") newStatus = "scraping";
              else if (latest.status === "completed") newStatus = "completed";
              else if (latest.status === "failed") newStatus = "error";
              return { ...p, status: newStatus };
            })
          );
        } catch {
          // ignore polling errors
        }
      }, 3000);

      intervalsRef.current[profile.id] = interval;
    });

    return () => {
      Object.values(intervalsRef.current).forEach((id) =>
        window.clearInterval(id)
      );
      intervalsRef.current = {};
    };
  }, [profiles]);

  const filteredAndSorted = useMemo(() => {
    let result = [...profiles];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.instagram_handle.toLowerCase().includes(q) ||
          (p.full_name?.toLowerCase().includes(q) ?? false)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    const dirMul = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      if (sortBy === "handle") {
        return (
          a.instagram_handle.localeCompare(b.instagram_handle, "es", {
            sensitivity: "base",
          }) * dirMul
        );
      }
      if (sortBy === "followers") {
        return ((a.followers_count ?? 0) - (b.followers_count ?? 0)) * dirMul;
      }
      // last_scraped: nulls always last regardless of direction
      const aT = a.last_scraped_at ? new Date(a.last_scraped_at).getTime() : null;
      const bT = b.last_scraped_at ? new Date(b.last_scraped_at).getTime() : null;
      if (aT === null && bT === null) return 0;
      if (aT === null) return 1;
      if (bT === null) return -1;
      return (aT - bT) * dirMul;
    });

    return result;
  }, [profiles, search, statusFilter, sortBy, sortDir]);

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      // Sensible defaults: text asc, numeric/date desc
      setSortDir(column === "handle" ? "asc" : "desc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const SortIcon = ({ column }: { column: SortBy }) => {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const handleAddProfile = async () => {
    const handle = newHandle.trim().replace(/^@/, "");
    if (!handle) return;
    setSaving(true);
    try {
      await apiPost("/profiles", { instagramHandle: handle });
      setNewHandle("");
      setDialogOpen(false);
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || "Error creando perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleScrape = async (id: string) => {
    setScrapingIds((prev) => new Set(prev).add(id));
    try {
      await apiPost(`/profiles/${id}/scrape`);
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || "Error iniciando análisis");
    } finally {
      setScrapingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const canScrape = (status: Profile["status"]) =>
    status === "pending" || status === "completed" || status === "error";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Stop any polling for this profile before removing it
      if (intervalsRef.current[deleteTarget.id]) {
        window.clearInterval(intervalsRef.current[deleteTarget.id]);
        delete intervalsRef.current[deleteTarget.id];
      }
      await deleteProfileApi(deleteTarget.id);
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || "Error eliminando perfil");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">
          Perfiles de Instagram
        </h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Perfil
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Agregar Perfil</DialogTitle>
            <DialogDescription>
              Ingresa el handle de Instagram que deseas trackear.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Instagram Handle</label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                placeholder="agencyname"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddProfile();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddProfile} disabled={saving || !newHandle.trim()}>
              {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters: hidden until profiles are loaded and there is at least one */}
      {!loading && profiles.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por handle o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="scraping">Scrapeando</SelectItem>
                <SelectItem value="analyzing">Analizando</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card shadow-sm">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay perfiles</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Agrega un perfil de Instagram para comenzar a trackear.
            </p>
            <Button
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Perfil
            </Button>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Sin resultados</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No hay resultados para los filtros aplicados.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={clearFilters}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  onClick={() => toggleSort("handle")}
                  className="cursor-pointer select-none hover:bg-muted/50"
                >
                  <span className="inline-flex items-center gap-1">
                    Handle
                    <SortIcon column="handle" />
                  </span>
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead
                  onClick={() => toggleSort("followers")}
                  className="cursor-pointer select-none hover:bg-muted/50"
                >
                  <span className="inline-flex items-center gap-1">
                    Seguidores
                    <SortIcon column="followers" />
                  </span>
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead
                  onClick={() => toggleSort("last_scraped")}
                  className="cursor-pointer select-none hover:bg-muted/50"
                >
                  <span className="inline-flex items-center gap-1">
                    Último análisis
                    <SortIcon column="last_scraped" />
                  </span>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {profile.profile_pic_url ? (
                        <div className="relative h-9 w-9 flex-shrink-0">
                          <Image
                            src={profile.profile_pic_url}
                            alt={profile.instagram_handle}
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-muted"
                          />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground ring-1 ring-muted">
                          {profile.instagram_handle[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span>@{profile.instagram_handle}</span>
                    </div>
                  </TableCell>
                  <TableCell>{profile.full_name || "—"}</TableCell>
                  <TableCell>
                    {formatNumber(profile.followers_count)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={profile.status} />
                      {profile.status === "error" && profile.error_message && (
                        <span 
                          className="text-xs text-destructive max-w-[200px] truncate" 
                          title={profile.error_message}
                        >
                          {profile.error_message}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {timeAgo(profile.last_scraped_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canScrape(profile.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScrape(profile.id)}
                          disabled={scrapingIds.has(profile.id)}
                        >
                          {scrapingIds.has(profile.id) ? (
                            <LoadingSpinner size="sm" className="mr-1" />
                          ) : (
                            <RefreshCw className="mr-1 h-3.5 w-3.5" />
                          )}
                          Analizar
                        </Button>
                      )}
                      {(profile.status === "scraping" ||
                        profile.status === "analyzing") && (
                        <span className="text-xs text-muted-foreground">
                          En progreso...
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          router.push(`/dashboard/profiles/${profile.id}`)
                        }
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(profile)}
                        title="Eliminar perfil y sus posts"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
      >
        <DialogContent onClose={() => !deleting && setDeleteTarget(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="h-5 w-5" />
              Eliminar perfil
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés eliminar el perfil{" "}
              <span className="font-semibold text-slate-900">
                @{deleteTarget?.instagram_handle}
              </span>
              ?<br />
              Esta acción borra el perfil <strong>y todos sus posts
              analizados</strong>. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleting ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
