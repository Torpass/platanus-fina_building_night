import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  getProfileById,
  updateProfileStatus,
  updateScrapingJob,
  upsertPost,
} from "../services/supabase.service";
import { apifyService } from "../services/apify.service";
import { analysisQueue } from "../queues/instagram-analysis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const scrapingWorker = new Worker(
  "instagram-scraping",
  async (job) => {
    const { profileId, instagramHandle, scrapingJobId, maxPosts = 50 } = job.data;
    console.log(`[ScrapingWorker] Starting job ${job.id} for @${instagramHandle}`);

    try {
      // 1. Update profile to scraping
      await updateProfileStatus(profileId, "scraping");

      // 2. Update scraping_job to running
      await updateScrapingJob(scrapingJobId, {
        status: "running",
        started_at: new Date().toISOString(),
      });

      // 3. Call Apify to scrape profile
      const { posts, profileInfo } = await apifyService.scrapeProfile(
        instagramHandle,
        maxPosts
      );

      console.log(
        `[ScrapingWorker] Scraped ${posts.length} posts for @${instagramHandle}`
      );

      // 4. Save posts and enqueue analysis jobs
      let enqueuedCount = 0;
      for (const post of posts) {
        const savedPost = await upsertPost({
          profile_id: profileId,
          instagram_post_id: post.id,
          caption: post.caption,
          image_url: post.images[0] || post.url,
          image_storage_path: null,
          likes_count: post.likesCount,
          comments_count: post.commentsCount,
          comments_content: null,
          posted_at: post.timestamp,
          destination: null,
          experience_type: null,
          price_estimate: null,
          urgency_level: null,
          offer_expiry_date: null,
          keywords: null,
          summary: null,
          sentiment: null,
          raw_ai_analysis: null,
          engagement_score: null,
        });

        // Enqueue analysis job only if the post hasn't been analyzed yet
        if (!savedPost.destination) {
          await analysisQueue.add("analyze-post", {
            postId: savedPost.id,
            imageUrl: savedPost.image_url,
            caption: savedPost.caption || "",
            comments: savedPost.comments_content || [],
            profileId,
            scrapingJobId,
          });
          enqueuedCount++;
        }
      }

      // 5. Update profile
      // NOTE: use !== undefined/null checks for numeric fields so that a real 0
      // (e.g. brand-new account with 0 followers) is not skipped by truthy check.
      const profileUpdates: Partial<{
        status: any;
        last_scraped_at: string;
        followers_count: number;
        following_count: number;
        full_name: string;
        bio: string;
        profile_pic_url: string;
      }> = {
        // Only stay in "analyzing" if we actually queued analysis work.
        // If posts arrived but all already had destinations (upsert hit),
        // there is nothing to analyze → go straight to completed.
        status: enqueuedCount > 0 ? "analyzing" : "completed",
        last_scraped_at: new Date().toISOString(),
      };

      if (
        profileInfo?.followersCount !== undefined &&
        profileInfo?.followersCount !== null
      ) {
        profileUpdates.followers_count = profileInfo.followersCount;
      }
      if (
        profileInfo?.followingCount !== undefined &&
        profileInfo?.followingCount !== null
      ) {
        profileUpdates.following_count = profileInfo.followingCount;
      }
      if (profileInfo?.fullName) profileUpdates.full_name = profileInfo.fullName;
      if (profileInfo?.biography) profileUpdates.bio = profileInfo.biography;
      if (profileInfo?.profilePicUrl) profileUpdates.profile_pic_url = profileInfo.profilePicUrl;

      await updateProfileStatus(profileId, profileUpdates.status!, profileUpdates);

      // 6. Update scraping_job to completed.
      // total_posts MUST reflect the number of analysis jobs we actually
      // enqueued, because that is what processed_posts will be compared to
      // by the analysis-worker self-heal logic. If we set total_posts to
      // posts.length but only enqueued enqueuedCount, the profile would
      // stay on "analyzing" forever.
      await updateScrapingJob(scrapingJobId, {
        status: "completed",
        total_posts: enqueuedCount,
        completed_at: new Date().toISOString(),
      });

      console.log(`[ScrapingWorker] Completed job ${job.id}`);
    } catch (err: any) {
      console.error(`[ScrapingWorker] Error in job ${job.id}:`, err);

      await updateProfileStatus(profileId, "error", {
        error_message: err.message || "Unknown error",
      });

      await updateScrapingJob(scrapingJobId, {
        status: "failed",
        error_message: err.message || "Unknown error",
        completed_at: new Date().toISOString(),
      });

      throw err;
    }
  },
  { connection: redisConnection }
);

scrapingWorker.on("failed", (job, err) => {
  console.error(`[ScrapingWorker] Job ${job?.id} failed:`, err);
});
