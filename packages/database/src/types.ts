export interface Profile {
  id: string;
  instagram_handle: string;
  full_name: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  profile_pic_url: string | null;
  status: "pending" | "scraping" | "analyzing" | "completed" | "error";
  last_scraped_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  profile_id: string;
  instagram_post_id: string;
  caption: string | null;
  image_url: string;
  image_storage_path: string | null;
  likes_count: number;
  comments_count: number;
  comments_content: string[] | null;
  posted_at: string | null;
  destination: string | null;
  experience_type:
    | "playa"
    | "montaña"
    | "gastronomía"
    | "aventura"
    | "cultural"
    | "relax"
    | "otro"
    | null;
  price_estimate: string | null;
  urgency_level: "low" | "medium" | "high" | null;
  offer_expiry_date: string | null;
  keywords: string[] | null;
  summary: string | null;
  sentiment: string | null;
  raw_ai_analysis: Record<string, unknown> | null;
  engagement_score: number | null;
  created_at: string;
}

export interface ScrapingJob {
  id: string;
  profile_id: string;
  status: "queued" | "running" | "completed" | "failed";
  total_posts: number | null;
  processed_posts: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}
