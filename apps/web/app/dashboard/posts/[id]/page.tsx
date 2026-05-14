"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  ExternalLink,
  MapPin,
  Tag,
  Clock,
  Sparkles,
  Hash,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Brain,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { fetchPost } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

const experienceColors: Record<string, string> = {
  playa: "bg-sky-100 text-sky-800 ring-sky-200",
  montaña: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  gastronomía: "bg-orange-100 text-orange-800 ring-orange-200",
  aventura: "bg-red-100 text-red-800 ring-red-200",
  cultural: "bg-violet-100 text-violet-800 ring-violet-200",
  relax: "bg-teal-100 text-teal-800 ring-teal-200",
  otro: "bg-gray-100 text-gray-800 ring-gray-200",
};

const urgencyMeta: Record<
  string,
  { label: string; cls: string; icon: typeof AlertTriangle }
> = {
  high: {
    label: "Alta",
    cls: "bg-rose-100 text-rose-800 ring-rose-200",
    icon: AlertTriangle,
  },
  medium: {
    label: "Media",
    cls: "bg-amber-100 text-amber-800 ring-amber-200",
    icon: Clock,
  },
  low: {
    label: "Baja",
    cls: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: Clock,
  },
};

const sentimentMeta: Record<
  string,
  { label: string; icon: typeof Smile; cls: string }
> = {
  positive: {
    label: "Positivo",
    icon: Smile,
    cls: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  neutral: {
    label: "Neutral",
    icon: Meh,
    cls: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  negative: {
    label: "Negativo",
    icon: Frown,
    cls: "bg-rose-100 text-rose-700 ring-rose-200",
  },
};

function daysFromNow(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function instagramUrl(id: string) {
  if (/^\d{17,}$/.test(id)) {
    try {
      const alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let num = BigInt(id);
      let code = "";
      while (num > 0n) {
        code = alphabet[Number(num % 64n)] + code;
        num /= 64n;
      }
      return `https://instagram.com/p/${code}`;
    } catch {
      return `https://instagram.com/p/${id}`;
    }
  }
  return `https://instagram.com/p/${id}`;
}

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchPost(id);
        setPost(data);
      } catch (err: any) {
        setError(err.message || "Error cargando el post");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
          <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-sm text-destructive">
          {error || "Post no disponible"}
        </div>
      </div>
    );
  }

  const days = daysFromNow(post.offer_expiry_date);
  const isAnalyzed = post.destination !== null;
  const sentiment = post.sentiment ? sentimentMeta[post.sentiment] : null;
  const urgency = post.urgency_level ? urgencyMeta[post.urgency_level] : null;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <a
          href={instagramUrl(post.instagram_post_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-rose-500/20 transition-transform hover:scale-[1.02]"
        >
          Ver en Instagram
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
      >
        {/* LEFT: image + agency */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 shadow-sm">
            {post.image_url ? (
              <Image
                src={post.image_url}
                alt={post.caption || "Post"}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 420px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                Sin imagen
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>

          {post.profile && (
            <Link
              href={`/dashboard/profiles/${post.profile.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 transition-colors hover:bg-slate-50"
            >
              {post.profile.profile_pic_url ? (
                <Image
                  src={post.profile.profile_pic_url}
                  alt={post.profile.instagram_handle}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-500 text-sm font-bold text-white">
                  {post.profile.instagram_handle[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {post.profile.full_name || `@${post.profile.instagram_handle}`}
                </p>
                <p className="truncate text-xs text-slate-500">
                  @{post.profile.instagram_handle} ·{" "}
                  {post.profile.followers_count.toLocaleString()} seguidores
                </p>
              </div>
              <ArrowLeft className="h-4 w-4 rotate-180 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
            </Link>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <MetricBox
              icon={Heart}
              iconCls="text-rose-500"
              label="Likes"
              value={post.likes_count.toLocaleString()}
            />
            <MetricBox
              icon={MessageCircle}
              iconCls="text-sky-500"
              label="Comments"
              value={post.comments_count.toLocaleString()}
            />
            <MetricBox
              icon={TrendingUp}
              iconCls="text-emerald-600"
              label="Engagement"
              value={
                post.engagement_score !== null
                  ? `${post.engagement_score.toFixed(1)}%`
                  : "—"
              }
            />
          </div>
        </div>

        {/* RIGHT: details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fuchsia-600">
              <Sparkles className="h-3.5 w-3.5" />
              Análisis IA
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              {post.destination || (
                <span className="text-slate-400">Sin análisis aún</span>
              )}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {post.experience_type && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "ring-1 ring-inset border-transparent",
                    experienceColors[post.experience_type] ||
                      experienceColors.otro
                  )}
                >
                  <Tag className="mr-1 h-3 w-3" />
                  {post.experience_type}
                </Badge>
              )}
              {urgency && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "ring-1 ring-inset border-transparent",
                    urgency.cls
                  )}
                >
                  <urgency.icon className="mr-1 h-3 w-3" />
                  {urgency.label} urgencia
                </Badge>
              )}
              {sentiment && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "ring-1 ring-inset border-transparent",
                    sentiment.cls
                  )}
                >
                  <sentiment.icon className="mr-1 h-3 w-3" />
                  {sentiment.label}
                </Badge>
              )}
              {post.price_estimate &&
                post.price_estimate.toUpperCase() !== "N/A" && (
                  <Badge
                    variant="secondary"
                    className="border-transparent bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                  >
                    💰 {post.price_estimate}
                  </Badge>
                )}
              {days !== null &&
                (days < 0 ? (
                  <Badge variant="destructive">Oferta expirada</Badge>
                ) : days === 0 ? (
                  <Badge variant="destructive">Vence hoy</Badge>
                ) : days <= 7 ? (
                  <Badge
                    variant="secondary"
                    className="border-transparent bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    Quedan {days} {days === 1 ? "día" : "días"}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="border-transparent bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200"
                  >
                    <Calendar className="mr-1 h-3 w-3" />
                    Expira en {days} días
                  </Badge>
                ))}
            </div>
          </div>

          {/* Summary */}
          {post.summary && (
            <SectionCard icon={Brain} title="Resumen del análisis">
              <p className="text-sm leading-relaxed text-slate-700">
                {post.summary}
              </p>
            </SectionCard>
          )}

          {/* Keywords */}
          {post.keywords && post.keywords.length > 0 && (
            <SectionCard icon={Hash} title="Palabras clave">
              <div className="flex flex-wrap gap-1.5">
                {post.keywords.map((k, i) => (
                  <motion.span
                    key={`${k}-${i}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    className="inline-flex items-center rounded-full bg-gradient-to-br from-violet-50 to-fuchsia-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200"
                  >
                    #{k}
                  </motion.span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Tabs (caption / comments / raw json) */}
          <Tabs defaultValue="caption" className="w-full">
            <TabsList className="inline-flex h-10 items-center gap-1 rounded-xl bg-slate-100 p-1">
              <TabsTrigger value="caption" className="rounded-lg text-xs">
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Caption
              </TabsTrigger>
              <TabsTrigger value="comments" className="rounded-lg text-xs">
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Comentarios
                {post.comments_content && post.comments_content.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold">
                    {post.comments_content.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="raw" className="rounded-lg text-xs">
                <Brain className="mr-1.5 h-3.5 w-3.5" />
                JSON IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="caption" className="mt-3">
              <SectionCard noIcon>
                {post.caption ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {post.caption}
                  </p>
                ) : (
                  <p className="text-sm italic text-slate-400">
                    Este post no tiene caption.
                  </p>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="comments" className="mt-3">
              <SectionCard noIcon>
                {post.comments_content && post.comments_content.length > 0 ? (
                  <ul className="space-y-2.5">
                    {post.comments_content.map((c, i) => (
                      <li
                        key={i}
                        className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm italic text-slate-400">
                    No se capturaron comentarios para este post.
                  </p>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="raw" className="mt-3">
              <RawJsonCard data={post.raw_ai_analysis} isAnalyzed={isAnalyzed} />
            </TabsContent>
          </Tabs>

          {/* Meta footer */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-xs text-slate-500 backdrop-blur">
            <div className="grid grid-cols-2 gap-y-1 sm:grid-cols-3">
              <span className="font-medium text-slate-700">Posteado</span>
              <span className="col-span-1 sm:col-span-2">
                {post.posted_at
                  ? new Date(post.posted_at).toLocaleString("es-ES", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })
                  : "Sin fecha"}
              </span>
              <span className="font-medium text-slate-700">Analizado</span>
              <span className="col-span-1 sm:col-span-2">
                {isAnalyzed ? "Sí ✓" : "Pendiente"}
              </span>
              <span className="font-medium text-slate-700">Post ID</span>
              <span className="col-span-1 truncate font-mono sm:col-span-2">
                {post.instagram_post_id}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// -------------------------------------------------------------------------

function MetricBox({
  icon: Icon,
  iconCls,
  label,
  value,
}: {
  icon: typeof Heart;
  iconCls: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-3 text-center">
      <Icon className={cn("mx-auto h-4 w-4", iconCls)} />
      <div className="mt-1 text-sm font-bold tabular-nums text-slate-900">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  noIcon,
}: {
  icon?: typeof Brain;
  title?: string;
  children: React.ReactNode;
  noIcon?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {!noIcon && Icon && title && (
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Icon className="h-3.5 w-3.5 text-fuchsia-500" />
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function RawJsonCard({
  data,
  isAnalyzed,
}: {
  data: Record<string, unknown> | null;
  isAnalyzed: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <SectionCard noIcon>
        <p className="text-sm italic text-slate-400">
          {isAnalyzed
            ? "El análisis se realizó pero no se guardó el JSON crudo."
            : "Aún no se ha analizado este post."}
        </p>
      </SectionCard>
    );
  }

  const json = JSON.stringify(data, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/5 bg-slate-900 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          raw_ai_analysis
        </span>
        <button
          onClick={copy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            copied
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </>
          )}
        </button>
      </div>
      <pre className="max-h-[480px] overflow-auto p-4 text-xs leading-relaxed text-slate-200">
        <code>{json}</code>
      </pre>
    </div>
  );
}
