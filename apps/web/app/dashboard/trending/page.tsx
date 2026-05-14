"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  TrendingUp,
  Users,
  Tag,
  MapPin,
  LayoutGrid,
  Heart,
  MessageCircle,
  Crown,
  Medal,
} from "lucide-react";
import { fetchTrendingPosts } from "@/lib/api";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

type GroupBy = "none" | "agency" | "experience" | "destination";

const groupings: {
  id: GroupBy;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: "none", label: "Sin agrupar", icon: LayoutGrid },
  { id: "agency", label: "Por agencia", icon: Users },
  { id: "experience", label: "Por experiencia", icon: Tag },
  { id: "destination", label: "Por destino", icon: MapPin },
];

function getGroupKey(p: Post, by: GroupBy): string {
  switch (by) {
    case "agency":
      return p.profile?.instagram_handle || "sin-perfil";
    case "experience":
      return p.experience_type || "otro";
    case "destination":
      return p.destination || "sin-destino";
    default:
      return "all";
  }
}

function getGroupLabel(p: Post, by: GroupBy): string {
  switch (by) {
    case "agency":
      return p.profile?.full_name || `@${p.profile?.instagram_handle ?? "—"}`;
    case "experience":
      return (p.experience_type || "otro").replace(/^./, (c) => c.toUpperCase());
    case "destination":
      return p.destination || "Sin destino";
    default:
      return "Todos";
  }
}

export default function TrendingPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchTrendingPosts();
        setPosts(data);
      } catch (err: any) {
        setError(err.message || "Error cargando trending posts");
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, []);

  const top3 = useMemo(() => posts.slice(0, 3), [posts]);
  const rest = useMemo(() => posts.slice(3), [posts]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<
      string,
      { label: string; items: Post[]; totalEngagement: number; sample: Post }
    >();
    posts.forEach((p) => {
      const key = getGroupKey(p, groupBy);
      const label = getGroupLabel(p, groupBy);
      if (!map.has(key)) {
        map.set(key, {
          label,
          items: [],
          totalEngagement: 0,
          sample: p,
        });
      }
      const g = map.get(key)!;
      g.items.push(p);
      g.totalEngagement += p.engagement_score ?? 0;
    });
    // sort groups by total engagement desc
    return Array.from(map.entries())
      .map(([key, value]) => ({
        key,
        ...value,
        avgEngagement: value.totalEngagement / Math.max(value.items.length, 1),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [posts, groupBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-orange-600">
          <TrendingUp className="h-3.5 w-3.5" />
          Top engagement
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Trending
        </h1>
        <p className="text-sm text-slate-500">
          Posts con mayor engagement. Agrupá por agencia, experiencia o destino
          para detectar patrones.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Group toggle */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 p-2 backdrop-blur">
        {groupings.map((g) => {
          const Icon = g.icon;
          const isActive = groupBy === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGroupBy(g.id)}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="trending-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-md shadow-orange-500/30"
                  transition={{ type: "spring", stiffness: 360, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                {g.label}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-full rounded-2xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState />
      ) : groupBy === "none" ? (
        <>
          {/* Podium top 3 */}
          {top3.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Podio
              </h2>
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {top3.map((post, idx) => (
                  <PodiumCard key={post.id} post={post} rank={idx + 1} />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Resto del ranking
              </h2>
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rest.map((post, idx) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    rank={idx + 4}
                    showAgency
                    delay={Math.min(idx, 12) * 0.035}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={groupBy}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
          >
            {grouped!.map((g, i) => (
              <GroupSection key={g.key} group={g} groupBy={groupBy} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------

function GroupSection({
  group,
  groupBy,
  index,
}: {
  group: {
    key: string;
    label: string;
    items: Post[];
    totalEngagement: number;
    avgEngagement: number;
    sample: Post;
  };
  groupBy: GroupBy;
  index: number;
}) {
  const totalLikes = group.items.reduce((s, p) => s + p.likes_count, 0);
  const totalComments = group.items.reduce((s, p) => s + p.comments_count, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45 }}
    >
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          {groupBy === "agency" && group.sample.profile?.profile_pic_url ? (
            <Image
              src={group.sample.profile.profile_pic_url}
              alt={group.label}
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white">
              {groupBy === "agency" ? (
                <Users className="h-5 w-5" />
              ) : groupBy === "experience" ? (
                <Tag className="h-5 w-5" />
              ) : (
                <MapPin className="h-5 w-5" />
              )}
            </div>
          )}
          <div className="leading-tight">
            <h3 className="text-base font-semibold text-slate-900">
              {group.label}
            </h3>
            {groupBy === "agency" && group.sample.profile && (
              <Link
                href={`/dashboard/profiles/${group.sample.profile.id}`}
                className="text-xs text-slate-500 hover:text-slate-900 hover:underline"
              >
                @{group.sample.profile.instagram_handle}
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <Metric
            label="Posts"
            value={group.items.length.toLocaleString()}
          />
          <Metric
            label="Eng. promedio"
            value={`${group.avgEngagement.toFixed(1)}%`}
            accent
          />
          <Metric
            label="Interacciones"
            value={(totalLikes + totalComments).toLocaleString()}
          />
        </div>
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {group.items.slice(0, 8).map((post, idx) => (
          <PostCard
            key={post.id}
            post={post}
            rank={idx + 1}
            showAgency={groupBy !== "agency"}
            delay={Math.min(idx, 8) * 0.04}
          />
        ))}
      </div>
    </motion.section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center">
      <div
        className={cn(
          "text-sm font-bold tabular-nums",
          accent ? "text-orange-600" : "text-slate-900"
        )}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

const podiumThemes = [
  {
    ring: "ring-amber-300",
    badge: "from-amber-400 via-yellow-300 to-amber-500",
    icon: Crown,
    iconColor: "text-amber-600",
    label: "1°",
  },
  {
    ring: "ring-slate-300",
    badge: "from-slate-300 via-slate-200 to-slate-400",
    icon: Medal,
    iconColor: "text-slate-500",
    label: "2°",
  },
  {
    ring: "ring-orange-300",
    badge: "from-orange-400 via-orange-300 to-orange-500",
    icon: Medal,
    iconColor: "text-orange-600",
    label: "3°",
  },
];

function PodiumCard({ post, rank }: { post: Post; rank: number }) {
  const theme = podiumThemes[rank - 1];
  const Icon = theme.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.05 * rank,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-md ring-2",
        theme.ring
      )}
    >
      {/* Image with overlay */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {post.image_url && (
          <Image
            src={post.image_url}
            alt={post.destination || "Trending post"}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

        {/* Rank badge */}
        <div
          className={cn(
            "absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br px-3 py-1 text-sm font-bold shadow-lg",
            theme.badge
          )}
        >
          <Icon className={cn("h-4 w-4", theme.iconColor)} />
          {theme.label}
        </div>

        {/* Engagement chip */}
        {post.engagement_score !== null && (
          <div className="absolute right-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur">
            {post.engagement_score.toFixed(1)}% eng
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="line-clamp-1 text-lg font-bold drop-shadow-sm">
            {post.destination || "Sin destino"}
          </p>
          {post.profile && (
            <Link
              href={`/dashboard/profiles/${post.profile.id}`}
              className="text-xs text-white/90 hover:text-white hover:underline"
            >
              @{post.profile.instagram_handle}
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 p-4 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            {post.likes_count.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5 text-sky-500" />
            {post.comments_count.toLocaleString()}
          </span>
        </div>
        <a
          href={`https://instagram.com/p/${post.instagram_post_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-700 hover:text-slate-900 hover:underline"
        >
          Ver post →
        </a>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100">
        <TrendingUp className="h-5 w-5 text-orange-600" />
      </div>
      <h4 className="text-base font-semibold text-slate-900">
        Sin posts trending
      </h4>
      <p className="mt-1 text-sm text-slate-500">
        Aún no hay posts con engagement suficiente. Dispará un scraping desde
        Perfiles.
      </p>
    </div>
  );
}
