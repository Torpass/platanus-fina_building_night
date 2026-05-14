"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { fetchUrgentPosts } from "@/lib/api";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post } from "@/lib/types";

export default function UrgentPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchUrgentPosts();
        setPosts(data);
      } catch (err: any) {
        setError(err.message || "Error cargando posts urgentes");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Urgentes</h1>

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
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium">Sin posts urgentes</h4>
          <p className="text-sm text-muted-foreground mt-1">
            No hay posts con alta urgencia o próximos a expirar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showExpiry={true} />
          ))}
        </div>
      )}
    </div>
  );
}
