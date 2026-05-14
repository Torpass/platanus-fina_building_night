export interface Post {
  id: string;
  profile_id: string;
  instagram_post_id: string;
  caption: string | null;
  image_url: string;
  likes_count: number;
  comments_count: number;
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
  engagement_score: number | null;
  created_at: string;
  /** Profile joined desde el backend (opcional según endpoint). */
  profile?: Profile | null;
}

export interface Profile {
  id: string;
  instagram_handle: string;
  full_name: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  profile_pic_url: string | null;
  status: string;
  last_scraped_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostsFilters {
  search?: string;
  destination?: string;
  experience_type?: string;
  urgency_level?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: "date" | "engagement" | "likes";
}
