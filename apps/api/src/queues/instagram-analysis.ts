import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export interface AnalysisJobData {
  postId: string;
  imageUrl: string;
  caption: string;
  comments: string[];
  profileId: string;
  scrapingJobId: string;
}

export const analysisQueue = new Queue<AnalysisJobData>("instagram-analysis", {
  connection: redisConnection,
});

export async function addAnalysisJob(data: AnalysisJobData) {
  const job = await analysisQueue.add("analyze-post", data);
  return job;
}
