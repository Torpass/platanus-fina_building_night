import { supabase } from "@repo/database";
import type { Post, Profile, ScrapingJob } from "@repo/database";

export async function createProfile(data: {
  instagram_handle: string;
  status?: Profile["status"];
}) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({ ...data, status: data.status ?? "pending" })
    .select()
    .single();
  if (error) throw error;
  return profile as Profile;
}

export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, posts(*)")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getProfileByHandle(handle: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("instagram_handle", handle)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as Profile | null;
}

export async function listProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function updateProfileStatus(
  id: string,
  status: Profile["status"],
  extra?: Partial<Profile>
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function createPost(data: Partial<Post>) {
  const { data: post, error } = await supabase
    .from("posts")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return post as Post;
}

export async function upsertPost(data: Partial<Post>) {
  const { data: post, error } = await supabase
    .from("posts")
    .upsert(data, {
      onConflict: "instagram_post_id",
      ignoreDuplicates: false,
    })
    .select()
    .single();
  if (error) throw error;
  return post as Post;
}

export async function updatePostAnalysis(
  id: string,
  analysisData: Partial<Post>
) {
  const { data, error } = await supabase
    .from("posts")
    .update(analysisData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Post;
}

export async function createScrapingJob(data: Partial<ScrapingJob>) {
  const { data: job, error } = await supabase
    .from("scraping_jobs")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return job as ScrapingJob;
}

export async function updateScrapingJob(
  id: string,
  data: Partial<ScrapingJob>
) {
  const { data: job, error } = await supabase
    .from("scraping_jobs")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return job as ScrapingJob;
}

export async function listPosts(filters?: {
  profile_id?: string;
  destination?: string;
  experience_type?: string;
  urgency_level?: string;
  trending?: boolean;
}) {
  let query = supabase.from("posts").select("*");

  if (filters?.profile_id) {
    query = query.eq("profile_id", filters.profile_id);
  }
  if (filters?.destination) {
    query = query.eq("destination", filters.destination);
  }
  if (filters?.experience_type) {
    query = query.eq("experience_type", filters.experience_type);
  }
  if (filters?.urgency_level) {
    query = query.eq("urgency_level", filters.urgency_level);
  }
  if (filters?.trending) {
    query = query.order("engagement_score", { ascending: false });
  } else {
    query = query.order("posted_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Post[];
}

export async function getTrendingPosts(limit = 20) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("engagement_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Post[];
}

export async function getUrgentPosts() {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const dateStr = sevenDaysFromNow.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .or(
      `urgency_level.eq.high,offer_expiry_date.lte.${dateStr}`
    )
    .order("offer_expiry_date", { ascending: true });

  if (error) throw error;
  return (data || []) as Post[];
}

export async function getPostById(id: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Post;
}

export async function getScrapingJobById(id: string) {
  const { data, error } = await supabase
    .from("scraping_jobs")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ScrapingJob;
}

export async function countUnanalyzedPostsByProfile(profileId: string) {
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .is("destination", null);
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardStats() {
  // Contar perfiles totales
  const { count: totalProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  if (profilesError) throw profilesError;

  // Contar posts analizados (destination no es null)
  const { count: analyzedPosts, error: postsError } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .not("destination", "is", null);
  if (postsError) throw postsError;

  // Contar posts totales
  const { count: totalPosts, error: totalPostsError } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });
  if (totalPostsError) throw totalPostsError;

  // Contar jobs activos (queued o running)
  const { count: activeJobs, error: jobsError } = await supabase
    .from("scraping_jobs")
    .select("*", { count: "exact", head: true })
    .in("status", ["queued", "running"]);
  if (jobsError) throw jobsError;

  return {
    total_profiles: totalProfiles ?? 0,
    total_posts: totalPosts ?? 0,
    analyzed_posts: analyzedPosts ?? 0,
    active_jobs: activeJobs ?? 0,
  };
}
