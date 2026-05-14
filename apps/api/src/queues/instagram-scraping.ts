import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export interface ScrapingJobData {
  profileId: string;
  instagramHandle: string;
  scrapingJobId: string;
  maxPosts?: number;
}

export const scrapingQueue = new Queue<ScrapingJobData>("instagram-scraping", {
  connection: redisConnection,
});

export async function addScrapingJob(
  profileId: string,
  instagramHandle: string,
  scrapingJobId: string,
  maxPosts = 50
) {
  const job = await scrapingQueue.add("scrape-profile", {
    profileId,
    instagramHandle,
    scrapingJobId,
    maxPosts,
  });
  return job;
}
