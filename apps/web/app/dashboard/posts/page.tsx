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
      <h1 className="text-2xl font-bold md:text-3xl">Posts</h1>

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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium">Sin posts</h4>
          <p className="text-sm text-muted-foreground mt-1">
            No se encontraron posts con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
