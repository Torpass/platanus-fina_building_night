"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, FileText, CheckCircle, Activity, Sparkles } from "lucide-react";
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
        const analyzed = data.filter((p: Post) => p.destination !== null);
        setPosts(analyzed.slice(0, 8));
      } catch (err: any) {
        console.error("Error cargando posts:", err);
      } finally {
        setPostsLoading(false);
      }
    };

    loadStats();
    loadPosts();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-white p-6 md:p-8"
      >
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-gradient-to-br from-fuchsia-400/30 via-rose-400/20 to-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-gradient-to-tr from-sky-400/20 to-violet-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur">
            <Sparkles className="h-3 w-3 text-rose-500" />
            Travel intel · análisis automático
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Bienvenido <span className="text-gradient-brand">de vuelta</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
            Resumen del scraping y del análisis IA sobre las agencias que estás
            siguiendo.
          </p>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Perfiles"
          value={stats?.total_profiles ?? 0}
          icon={Users}
          loading={statsLoading}
          index={0}
          accent="violet"
        />
        <StatsCard
          title="Total Posts"
          value={stats?.total_posts ?? 0}
          icon={FileText}
          loading={statsLoading}
          index={1}
          accent="sky"
        />
        <StatsCard
          title="Posts Analizados"
          value={stats?.analyzed_posts ?? 0}
          icon={CheckCircle}
          loading={statsLoading}
          index={2}
          accent="emerald"
        />
        <StatsCard
          title="Jobs Activos"
          value={stats?.active_jobs ?? 0}
          icon={Activity}
          loading={statsLoading}
          index={3}
          accent="amber"
        />
      </div>

      {/* Latest analyzed */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Últimos posts analizados
            </h2>
            <p className="text-sm text-slate-500">
              Los más recientes que pasaron por la IA.
            </p>
          </div>
        </div>

        {postsLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
            <FileTextIcon className="mx-auto mb-4 h-10 w-10 text-slate-400" />
            <h4 className="text-base font-semibold text-slate-900">
              Sin posts analizados
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Aún no hay posts con análisis completado.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                showAgency
                delay={i * 0.05}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
