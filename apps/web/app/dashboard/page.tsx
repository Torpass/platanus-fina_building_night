"use client";

import { useEffect, useState } from "react";
import { Users, FileText, CheckCircle, Activity } from "lucide-react";
import { fetchDashboardStats, fetchPosts } from "@/lib/api";
import { StatsCard } from "@/components/stats-card";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText as FileTextIcon } from "lucide-react";
import type { Post } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    total_profiles: number;
    total_posts: number;
    analyzed_posts: number;
    active_jobs: number;
  } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setError(null);
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Error cargando estadísticas");
      } finally {
        setStatsLoading(false);
      }
    };

    const loadPosts = async () => {
      try {
        const data = await fetchPosts();
        // Tomar los primeros 6 posts analizados (con destination)
        const analyzed = data.filter((p: Post) => p.destination !== null);
        setPosts(analyzed.slice(0, 6));
      } catch (err: any) {
        // No mostrar error de posts como crítico
        console.error("Error cargando posts:", err);
      } finally {
        setPostsLoading(false);
      }
    };

    loadStats();
    loadPosts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Perfiles"
          value={stats?.total_profiles ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatsCard
          title="Total Posts"
          value={stats?.total_posts ?? 0}
          icon={FileText}
          loading={statsLoading}
        />
        <StatsCard
          title="Posts Analizados"
          value={stats?.analyzed_posts ?? 0}
          icon={CheckCircle}
          loading={statsLoading}
        />
        <StatsCard
          title="Jobs Activos"
          value={stats?.active_jobs ?? 0}
          icon={Activity}
          loading={statsLoading}
        />
      </div>

      {/* Latest Analyzed Posts */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Últimos posts analizados</h2>
        {postsLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
            <FileTextIcon className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium">Sin posts analizados</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Aún no hay posts con análisis completado.
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
    </div>
  );
}
