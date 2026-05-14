"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertCircle, FileText } from "lucide-react";
import { fetchPosts } from "@/lib/api";
import { PostCard } from "@/components/post-card";
import { FiltersBar } from "@/components/filters-bar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post, PostsFilters } from "@/lib/types";

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PostsFilters>({});

  const loadPosts = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await fetchPosts({
        destination: filters.destination || undefined,
        experience_type: filters.experience_type || undefined,
        urgency_level: filters.urgency_level || undefined,
      });
      setPosts(data);
    } catch (err: any) {
      setError(err.message || "Error cargando posts");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Extraer destinos únicos de los posts para el filtro
  const destinations = Array.from(
    new Set(posts.map((p) => p.destination).filter(Boolean) as string[])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-sky-600">
          <FileText className="h-3.5 w-3.5" />
          Posts analizados
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Catálogo
        </h1>
        <p className="text-sm text-slate-500">
          Filtrá por destino, experiencia o urgencia para encontrar oportunidades.
        </p>
      </div>

      <FiltersBar
        onFilterChange={setFilters}
        destinations={destinations}
        showSort={true}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-400 mb-4" />
          <h4 className="text-base font-semibold text-slate-900">Sin posts</h4>
          <p className="text-sm text-slate-500 mt-1">
            No se encontraron posts con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              showAgency
              delay={Math.min(i, 12) * 0.04}
            />
          ))}
        </div>
      )}
    </div>
  );
}
