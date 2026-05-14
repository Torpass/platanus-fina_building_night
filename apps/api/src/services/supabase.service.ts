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

/**
 * Self-healing list: for profiles stuck in "analyzing" or "scraping", inspect
 * the latest scraping_job. If the job is already completed/failed and finished
 * more than `staleAfterMs` ago, persist a corrected status and return the
 * corrected rows. This recovers from cases where a worker died, a post failed
 * analysis silently, or the completion signal never fired.
 */
export async function listProfilesWithSelfHeal(
  staleAfterMs: number = 30_000
): Promise<Profile[]> {
  const profiles = await listProfiles();

  const stuck = profiles.filter(
    (p) => p.status === "analyzing" || p.status === "scraping"
  );
  if (stuck.length === 0) return profiles;

  const now = Date.now();

  // Fetch latest scraping_job per stuck profile in parallel
  const correctionResults = await Promise.all(
    stuck.map(async (profile) => {
      try {
        const { data: jobs, error: jobsErr } = await supabase
          .from("scraping_jobs")
          .select("*")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (jobsErr) {
          console.error(
            `[listProfilesWithSelfHeal] Failed to load latest job for profile ${profile.id}:`,
            jobsErr
          );
          return null;
        }

        const latestJob = (jobs && jobs[0]) as ScrapingJob | undefined;
        if (!latestJob) return null;

        const isTerminal =
          latestJob.status === "completed" || latestJob.status === "failed";
        if (!isTerminal) return null;
        if (!latestJob.completed_at) return null;

        const completedAtMs = new Date(latestJob.completed_at).getTime();
        if (Number.isNaN(completedAtMs)) return null;
        if (now - completedAtMs < staleAfterMs) return null;

        const newStatus: Profile["status"] =
          latestJob.status === "completed" ? "completed" : "error";

        const updates: Partial<Profile> = { status: newStatus };
        if (newStatus === "error" && latestJob.error_message) {
          updates.error_message = latestJob.error_message;
        }

        const updated = await updateProfileStatus(
          profile.id,
          newStatus,
          updates
        );
        console.log(
          `[listProfilesWithSelfHeal] Healed profile ${profile.id} (${profile.instagram_handle}): ${profile.status} -> ${newStatus}`
        );
        return { id: profile.id, updated };
      } catch (err) {
        console.error(
          `[listProfilesWithSelfHeal] Error healing profile ${profile.id}:`,
          err
        );
        return null;
      }
    })
  );

  const byId = new Map<string, Profile>();
  for (const r of correctionResults) {
    if (r && r.updated) byId.set(r.id, r.updated);
  }

  if (byId.size === 0) return profiles;

  // Merge corrections into the original list, preserving order
  return profiles.map((p) => byId.get(p.id) ?? p);
}

/**
 * Update only profile metadata fields (full_name, followers_count,
 * following_count, bio, profile_pic_url) plus updated_at. Does NOT touch
 * `status` or `last_scraped_at` — those belong to the scraping flow.
 */
export async function updateProfileInfo(
  id: string,
  info: Partial<{
    full_name: string;
    followers_count: number;
    following_count: number;
    bio: string;
    profile_pic_url: string;
  }>
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...info, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
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
  let query = supabase.from("posts").select("*, profile:profiles(*)");

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

export async function getTrendingPosts(limit = 50) {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profile:profiles(*)")
    .not("destination", "is", null)
    .order("engagement_score", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Post[];
}

/**
 * Devuelve posts urgentes "todavía explotables":
 *   - offer_expiry_date está entre HOY y HOY + windowDays (no expirados)
 *   - OR urgency_level = "high" sin fecha de expiración (offer_expiry_date NULL)
 *
 * Por defecto NO se incluyen posts ya expirados.
 * Si querés verlos pasale ?includeExpired=true (no es lo usual).
 */
export async function getUrgentPosts(opts?: {
  windowDays?: number;
  includeExpired?: boolean;
}) {
  const windowDays = opts?.windowDays ?? 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + windowDays);
  const horizonStr = horizon.toISOString().split("T")[0];

  let query = supabase
    .from("posts")
    .select("*, profile:profiles(*)");

  if (opts?.includeExpired) {
    // Solo filtra por urgencia o cualquier fecha <= horizonte (sin excluir pasadas)
    query = query.or(`urgency_level.eq.high,offer_expiry_date.lte.${horizonStr}`);
  } else {
    // Próximos a expirar (entre hoy y hoy+window) o high-urgency sin fecha
    query = query.or(
      `and(offer_expiry_date.gte.${todayStr},offer_expiry_date.lte.${horizonStr}),` +
        `and(offer_expiry_date.is.null,urgency_level.eq.high)`
    );
  }

  const { data, error } = await query.order("offer_expiry_date", {
    ascending: true,
    nullsFirst: false,
  });

  if (error) throw error;
  return (data || []) as Post[];
}

export async function getPostById(id: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profile:profiles(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Post;
}

export async function deleteProfile(id: string) {
  // Posts y scraping_jobs caen por ON DELETE CASCADE en la FK.
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
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
