"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import type { Profile } from "@/lib/types";

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
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Handle</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Seguidores</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último análisis</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    @{profile.instagram_handle}
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
