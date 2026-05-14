"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  ExternalLink,
  Flame,
  Clock,
  Tag,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
  rank?: number;
  showExpiry?: boolean;
  showAgency?: boolean;
  /** Override del delay para el stagger (segundos). */
  delay?: number;
}

const experienceTypeColors: Record<string, string> = {
  playa: "bg-sky-100 text-sky-800 ring-sky-200",
  montaña: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  gastronomía: "bg-orange-100 text-orange-800 ring-orange-200",
  aventura: "bg-red-100 text-red-800 ring-red-200",
  cultural: "bg-violet-100 text-violet-800 ring-violet-200",
  relax: "bg-teal-100 text-teal-800 ring-teal-200",
  otro: "bg-gray-100 text-gray-800 ring-gray-200",
};

function getExperienceColor(type: string | null) {
  if (!type) return experienceTypeColors.otro;
  return experienceTypeColors[type] || experienceTypeColors.otro;
}

function truncate(text: string | null, maxLength: number) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

function getInstagramUrl(id: string) {
  const tryEncode = (numeric: string) => {
    try {
      const alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let num = BigInt(numeric);
      let code = "";
      while (num > 0n) {
        code = alphabet[Number(num % 64n)] + code;
        num /= 64n;
      }
      return code;
    } catch {
      return null;
    }
  };

  if (/^\d{17,}$/.test(id)) {
    const code = tryEncode(id);
    if (code) return `https://instagram.com/p/${code}`;
  }
  if (id.includes("_")) {
    const cleanId = id.split("_")[0];
    if (/^\d{17,}$/.test(cleanId)) {
      const code = tryEncode(cleanId);
      if (code) return `https://instagram.com/p/${code}`;
    }
  }
  return `https://instagram.com/p/${id}`;
}

function getDaysRemaining(expiryDate: string | null) {
  if (!expiryDate) return null;
  const days = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return days;
}

const rankStyles: Record<number, string> = {
  1: "from-amber-400 via-yellow-300 to-amber-500 text-amber-950 ring-amber-300",
  2: "from-slate-300 via-slate-200 to-slate-400 text-slate-900 ring-slate-300",
  3: "from-orange-400 via-orange-300 to-orange-500 text-orange-950 ring-orange-300",
};

export function PostCard({
  post,
  rank,
  showExpiry,
  showAgency,
  delay = 0,
}: PostCardProps) {
  const daysRemaining = showExpiry
    ? getDaysRemaining(post.offer_expiry_date)
    : null;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  const agencyName =
    post.profile?.full_name || post.profile?.instagram_handle || null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.45,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-300 hover:shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        {post.image_url ? (
          <Image
            src={post.image_url}
            alt={post.caption || "Post image"}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            Sin imagen
          </div>
        )}

        {/* Gradient overlay for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

        {/* Rank medal */}
        {rank && rank <= 3 && (
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.15, type: "spring", stiffness: 220 }}
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br px-2.5 py-1 text-xs font-bold shadow-lg ring-2 ${rankStyles[rank]}`}
          >
            <Flame className="h-3 w-3" />#{rank}
          </motion.div>
        )}
        {rank && rank > 3 && rank <= 10 && (
          <div className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            #{rank}
          </div>
        )}

        {/* Urgent ribbon */}
        {daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0 && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.2 }}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-600 to-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-red-500/30"
          >
            <Flame className="h-3 w-3 animate-pulse" />
            {daysRemaining === 0 ? "Hoy" : `${daysRemaining}d`}
          </motion.div>
        )}

        {/* Agency chip */}
        {showAgency && agencyName && (
          <Link
            href={`/dashboard/profiles/${post.profile_id}`}
            className="absolute bottom-3 left-3 inline-flex max-w-[80%] items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm backdrop-blur transition-colors hover:bg-white"
          >
            <span className="truncate">@{post.profile?.instagram_handle}</span>
          </Link>
        )}

        {/* Engagement chip */}
        {post.engagement_score !== null && (
          <div
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur"
            title="Engagement Score"
          >
            <TrendingUp className="h-3 w-3 text-emerald-600" />
            {post.engagement_score.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {post.destination && (
          <h3
            className="line-clamp-1 text-base font-semibold text-slate-900"
            title={post.destination}
          >
            {post.destination}
          </h3>
        )}

        <div className="flex flex-wrap gap-1.5">
          {post.experience_type && (
            <Badge
              variant="secondary"
              className={`${getExperienceColor(
                post.experience_type
              )} ring-1 ring-inset border-transparent`}
            >
              {post.experience_type}
            </Badge>
          )}
          {post.urgency_level && post.urgency_level !== "low" && (
            <Badge
              variant={post.urgency_level === "high" ? "destructive" : "default"}
              className={
                post.urgency_level === "medium"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : ""
              }
            >
              {post.urgency_level === "high" ? "Urgente" : "Medio"}
            </Badge>
          )}
        </div>

        <p
          className="line-clamp-2 text-sm text-slate-600"
          title={post.caption || ""}
        >
          {truncate(post.caption, 150)}
        </p>

        <div className="flex items-center gap-1.5 text-sm">
          <Tag className="h-3.5 w-3.5 text-emerald-600" />
          <span
            className={
              !post.price_estimate || post.price_estimate.toUpperCase() === "N/A"
                ? "text-slate-400"
                : "font-semibold text-emerald-700"
            }
          >
            {!post.price_estimate || post.price_estimate.toUpperCase() === "N/A"
              ? "Sin precio"
              : post.price_estimate}
          </span>
        </div>

        {showExpiry && daysRemaining !== null && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium">
            <Clock
              className={`h-3.5 w-3.5 ${
                isExpired
                  ? "text-destructive"
                  : daysRemaining <= 3
                    ? "text-rose-600"
                    : "text-amber-600"
              }`}
            />
            {isExpired ? (
              <span className="text-destructive">Expirado</span>
            ) : daysRemaining === 0 ? (
              <span className="text-rose-600 font-semibold">Expira hoy</span>
            ) : (
              <span
                className={
                  daysRemaining <= 3
                    ? "text-rose-600 font-semibold"
                    : "text-amber-700"
                }
              >
                Quedan {daysRemaining} {daysRemaining === 1 ? "día" : "días"}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
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
            <Link
              href={`/dashboard/profiles/${post.profile_id}`}
              className="text-slate-500 underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
            >
              Perfil
            </Link>
          </div>

          <a
            href={getInstagramUrl(post.instagram_post_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/20 transition-transform hover:scale-[1.02]"
          >
            Ver en Instagram
            <ExternalLink className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
          </a>
        </div>
      </div>
    </motion.article>
  );
}
