"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost, deleteProfile as deleteProfileApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  RefreshCw,
  Heart,
  MessageCircle,
  MapPin,
  AlertCircle,
  FileText,
  Trash2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import type { Profile, Post } from "@/lib/types";

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("es-ES");
}

function urgencyColor(level: string | null): React.ComponentProps<typeof Badge>["variant"] {
  switch (level) {
    case "high":
      return "destructive";
    case "medium":
      return "warning";
    case "low":
      return "success";
    default:
      return "outline";
  }
}

function experienceColor(type: string | null): string {
  switch (type) {
    case "playa":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100";
    case "montaña":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100";
    case "gastronomía":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    case "aventura":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "cultural":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
    case "relax":
      return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
  }
}

export default function ProfileDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [refreshingInfo, setRefreshingInfo] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = async () => {
    try {
      setError(null);
      const data = await apiGet<Profile & { posts?: Post[] }>(`/profiles/${id}`);
      setProfile(data);
      setPosts(data.posts || []);
    } catch (err: any) {
      setError(err.message || "Error cargando perfil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchProfile();
  }, [id]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await apiPost(`/profiles/${id}/scrape`);
      await fetchProfile();
    } catch (err: any) {
      setError(err.message || "Error reanalizando");
    } finally {
      setReanalyzing(false);
    }
  };

  const handleRefreshInfo = async () => {
    setRefreshingInfo(true);
    try {
      await apiPost(`/profiles/${id}/refresh-info`);
      await fetchProfile();
    } catch (err: any) {
      setError(err.message || "Error actualizando info");
    } finally {
      setRefreshingInfo(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    setDeleting(true);
    try {
      await deleteProfileApi(profile.id);
      router.push("/dashboard/profiles");
    } catch (err: any) {
      setError(err.message || "Error eliminando perfil");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/profiles")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          {profile && (
            <h1 className="text-2xl font-bold">@{profile.instagram_handle}</h1>
          )}
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshInfo}
              disabled={refreshingInfo}
              title="Actualizar nombre, foto, seguidores y bio (sin reanalizar posts)"
            >
              {refreshingInfo ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Actualizar info
            </Button>
            <Button
              size="sm"
              onClick={handleReanalyze}
              disabled={reanalyzing || profile.status === "scraping" || profile.status === "analyzing"}
            >
              {reanalyzing ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reanalizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              title="Eliminar perfil y posts"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : profile ? (
        <>
          {/* Profile Info */}
          <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm sm:flex-row sm:items-start">
            <div className="flex-shrink-0">
              {profile.profile_pic_url ? (
                <div className="relative h-20 w-20">
                  <Image
                    src={profile.profile_pic_url}
                    alt={profile.instagram_handle}
                    fill
                    className="rounded-full object-cover ring-2 ring-muted"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
                  @{profile.instagram_handle[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">
                  {profile.full_name || profile.instagram_handle}
                </h2>
                <StatusBadge status={profile.status} />
              </div>
              {profile.bio && (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="font-semibold">
                    {formatNumber(profile.followers_count)}
                  </span>{" "}
                  <span className="text-muted-foreground">seguidores</span>
                </div>
                <div>
                  <span className="font-semibold">
                    {formatNumber(profile.following_count)}
                  </span>{" "}
                  <span className="text-muted-foreground">siguiendo</span>
                </div>
                <div>
                  <span className="font-semibold">
                    {formatNumber(posts.length)}
                  </span>{" "}
                  <span className="text-muted-foreground">posts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Grid */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Posts analizados</h3>
            {posts.length === 0 ? (
              <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium">Sin posts</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Este perfil aún no tiene posts analizados.
                </p>
                <Button className="mt-4" onClick={handleReanalyze}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Analizar ahora
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/dashboard/posts/${post.id}`}
                    className="group block"
                  >
                    <Card className="h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                      {post.image_url && (
                        <div className="aspect-square bg-muted relative overflow-hidden">
                          <Image
                            src={post.image_url}
                            alt={post.caption || "Post"}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-700 opacity-0 shadow-sm backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                            <Sparkles className="h-3 w-3" />
                            Ver análisis
                          </div>
                        </div>
                      )}
                      <CardContent className="space-y-3 p-4">
                        <p className="line-clamp-2 text-sm">
                          {post.caption || "Sin caption"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            {formatNumber(post.likes_count)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {formatNumber(post.comments_count)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {post.destination && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              {post.destination}
                            </Badge>
                          )}
                          {post.experience_type && (
                            <Badge className={`text-xs ${experienceColor(post.experience_type)}`}>
                              {post.experience_type}
                            </Badge>
                          )}
                          {post.urgency_level && (
                            <Badge variant={urgencyColor(post.urgency_level)} className="text-xs">
                              {post.urgency_level === "high"
                                ? "Urgente"
                                : post.urgency_level === "medium"
                                ? "Medio"
                                : "Bajo"}
                            </Badge>
                          )}
                          {post.engagement_score !== null && (
                            <Badge variant="outline" className="text-xs">
                              Engagement {post.engagement_score.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => !deleting && setDeleteOpen(open)}
      >
        <DialogContent onClose={() => !deleting && setDeleteOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="h-5 w-5" />
              Eliminar perfil
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés eliminar el perfil{" "}
              <span className="font-semibold text-slate-900">
                @{profile?.instagram_handle}
              </span>
              ?<br />
              Se eliminarán también{" "}
              <span className="font-semibold text-slate-900">
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>{" "}
              y todos sus análisis. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
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
