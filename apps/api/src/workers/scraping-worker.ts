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
        }
      }

      // 5. Update profile
      const profileUpdates: Partial<{
        status: any;
        last_scraped_at: string;
        followers_count: number;
      }> = {
        status: posts.length > 0 ? "analyzing" : "completed",
        last_scraped_at: new Date().toISOString(),
      };

      if (profileInfo?.followersCount) {
        profileUpdates.followers_count = profileInfo.followersCount;
      }

      await updateProfileStatus(profileId, profileUpdates.status!, profileUpdates);

      // 6. Update scraping_job to completed
      await updateScrapingJob(scrapingJobId, {
        status: "completed",
        total_posts: posts.length,
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
