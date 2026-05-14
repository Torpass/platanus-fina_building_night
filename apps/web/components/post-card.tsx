import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, ExternalLink, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
  rank?: number;
  showExpiry?: boolean;
}

const experienceTypeColors: Record<string, string> = {
  playa: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  montaña: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  gastronomía: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  aventura: "bg-red-100 text-red-800 hover:bg-red-100",
  cultural: "bg-violet-100 text-violet-800 hover:bg-violet-100",
  relax: "bg-teal-100 text-teal-800 hover:bg-teal-100",
  otro: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

function getExperienceColor(type: string | null) {
  if (!type) return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  return experienceTypeColors[type] || "bg-gray-100 text-gray-800 hover:bg-gray-100";
}

function truncate(text: string | null, maxLength: number) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function getInstagramUrl(id: string) {
  if (/^\d{17,}$/.test(id)) {
    try {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
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
  if (id.includes('_')) {
     const cleanId = id.split('_')[0];
     if (/^\d{17,}$/.test(cleanId)) {
        try {
          const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
          let num = BigInt(cleanId);
          let code = "";
          while (num > 0n) {
            code = alphabet[Number(num % 64n)] + code;
            num /= 64n;
          }
          return `https://instagram.com/p/${code}`;
        } catch {}
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

export function PostCard({ post, rank, showExpiry }: PostCardProps) {
  const daysRemaining = showExpiry ? getDaysRemaining(post.offer_expiry_date) : null;

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      <div className="relative aspect-[4/5] bg-muted">
        {post.image_url ? (
          <Image
            src={post.image_url}
            alt={post.caption || "Post image"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Sin imagen
          </div>
        )}
        {rank && rank <= 5 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-bold">
            <Flame className="h-3 w-3 text-orange-400" />
            #{rank}
          </div>
        )}
        {daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0 && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
            🔥 Últimos cupos
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        {post.destination && (
          <h3 
            className="font-semibold text-base leading-tight truncate" 
            title={post.destination}
          >
            {post.destination}
          </h3>
        )}

        <div className="flex flex-wrap gap-1.5">
          {post.experience_type && (
            <Badge variant="secondary" className={getExperienceColor(post.experience_type)}>
              {post.experience_type}
            </Badge>
          )}
          {post.urgency_level && post.urgency_level !== "low" && (
            <Badge
              variant={post.urgency_level === "high" ? "destructive" : "default"}
              className={post.urgency_level === "medium" ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              {post.urgency_level === "high" ? "Urgente" : "Medio"}
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2" title={post.caption || ""}>
          {truncate(post.caption, 150)}
        </p>

        <div className="text-sm">
          <span className="text-emerald-600 font-medium">price: </span>
          <span className="font-semibold text-emerald-700">
            {!post.price_estimate || post.price_estimate.toUpperCase() === "N/A" 
              ? "no especificado" 
              : post.price_estimate}
          </span>
        </div>

        {showExpiry && daysRemaining !== null && (
          <div className="text-xs font-medium">
            {daysRemaining < 0 ? (
              <span className="text-destructive">Expirado</span>
            ) : daysRemaining === 0 ? (
              <span className="text-destructive">Expira hoy</span>
            ) : (
              <span className="text-amber-600">
                Expira en {daysRemaining} {daysRemaining === 1 ? "día" : "días"}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 mt-auto pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" title="Likes">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                {post.likes_count.toLocaleString()}
              </span>
              <span className="flex items-center gap-1" title="Comments">
                <MessageCircle className="h-3.5 w-3.5 text-sky-500" />
                {post.comments_count.toLocaleString()}
              </span>
            </div>
            
            {post.engagement_score !== null && (
              <div 
                className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                title="Engagement Score"
              >
                Eng: {post.engagement_score.toFixed(1)}%
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <Link
              href={`/dashboard/profiles/${post.profile_id}`}
              className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Ver perfil
            </Link>
        <a
          href={getInstagramUrl(post.instagram_post_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary font-medium hover:underline underline-offset-4"
        >
          Ver en Instagram
          <ExternalLink className="h-3 w-3" />
        </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
