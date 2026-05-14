"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Clock, Flame, CalendarDays } from "lucide-react";
import { fetchUrgentPosts } from "@/lib/api";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

type Bucket = "all" | "today" | "soon" | "week" | "no_date";

function daysToExpiry(post: Post): number | null {
  if (!post.offer_expiry_date) return null;
  return Math.ceil(
    (new Date(post.offer_expiry_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );
}

const filters: { id: Bucket; label: string; description: string }[] = [
  { id: "all", label: "Todas", description: "Próximas 2 semanas" },
  { id: "today", label: "Hoy", description: "Vencen hoy" },
  { id: "soon", label: "≤ 3 días", description: "Críticas" },
  { id: "week", label: "Esta semana", description: "Hasta 7 días" },
  { id: "no_date", label: "Sin fecha", description: "Alta urgencia, sin deadline" },
];

export default function UrgentPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Bucket>("all");

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

  const counts = useMemo(() => {
    const c = { all: 0, today: 0, soon: 0, week: 0, no_date: 0 } as Record<
      Bucket,
      number
    >;
    posts.forEach((p) => {
      const d = daysToExpiry(p);
      c.all += 1;
      if (d === null) c.no_date += 1;
      else if (d === 0) c.today += 1;
      if (d !== null && d >= 0 && d <= 3) c.soon += 1;
      if (d !== null && d >= 0 && d <= 7) c.week += 1;
    });
    return c;
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const d = daysToExpiry(p);
      switch (active) {
        case "all":
          return true;
        case "today":
          return d === 0;
        case "soon":
          return d !== null && d >= 0 && d <= 3;
        case "week":
          return d !== null && d >= 0 && d <= 7;
        case "no_date":
          return d === null;
      }
    });
  }, [posts, active]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-rose-600">
          <Flame className="h-3.5 w-3.5" />
          Próximas a expirar
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Ofertas urgentes
        </h1>
        <p className="text-sm text-slate-500">
          Mostramos solo posts con deadline a futuro o alta urgencia sin fecha.
          Las ya vencidas se filtran automáticamente.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-2 backdrop-blur">
        {filters.map((f) => {
          const isActive = active === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="urgent-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-md shadow-rose-500/30"
                  transition={{ type: "spring", stiffness: 360, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {f.id === "today" ? (
                  <Flame className="h-3.5 w-3.5" />
                ) : f.id === "no_date" ? (
                  <CalendarDays className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                {f.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {counts[f.id]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState bucket={active} />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((post, idx) => (
              <PostCard
                key={post.id}
                post={post}
                showExpiry
                showAgency
                delay={Math.min(idx, 12) * 0.04}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function EmptyState({ bucket }: { bucket: Bucket }) {
  const map: Record<Bucket, { title: string; desc: string }> = {
    all: {
      title: "Sin urgentes a la vista",
      desc: "No hay posts próximos a expirar en las próximas 2 semanas.",
    },
    today: { title: "Nada vence hoy", desc: "Buen momento para respirar." },
    soon: {
      title: "Nada crítico en 3 días",
      desc: "Las ofertas más cercanas vencen más allá del horizonte corto.",
    },
    week: {
      title: "Sin vencimientos esta semana",
      desc: "Probá ampliar a las próximas 2 semanas.",
    },
    no_date: {
      title: "Sin posts de alta urgencia sin fecha",
      desc: "Los urgentes detectados ya tienen deadline asignado.",
    },
  };
  const m = map[bucket];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
        <Clock className="h-5 w-5 text-slate-500" />
      </div>
      <h4 className="text-base font-semibold text-slate-900">{m.title}</h4>
      <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
    </motion.div>
  );
}
