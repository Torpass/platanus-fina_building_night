import { Worker } from "bullmq";
import IORedis from "ioredis";
import { createAIProvider } from "@repo/ai-provider";
import {
  getPostById,
  updatePostAnalysis,
  updateProfileStatus,
  getScrapingJobById,
  updateScrapingJob,
  countUnanalyzedPostsByProfile,
} from "../services/supabase.service";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

const SYSTEM_PROMPT = `Eres un analista experto en marketing de viajes y turismo.
Analiza esta publicación de Instagram de una agencia de viajes o influencer de viajes.

Extrae y devuelve SOLO un JSON con este formato exacto:
{
  "destination": "Ciudad/País detectado",
  "experience_type": "playa|montaña|gastronomía|aventura|cultural|relax|otro",
  "price_estimate": "Precio mencionado o estimado",
  "urgency_level": "low|medium|high",
  "offer_expiry_date": "YYYY-MM-DD o null",
  "keywords": ["keyword1", "keyword2"],
  "summary": "Resumen de 2-3 oraciones",
  "sentiment": "positive|neutral|negative"
}

Detecta urgencia analizando frases como "últimos cupos", "hasta el 15", "termina pronto".
El sentimiento debe analizar el tono general de los comentarios (si se proporcionan).`;

/**
 * Increment processed_posts for the scraping_job and, if the profile has
 * finished processing (success OR failure), mark the profile as completed.
 *
 * This is called in BOTH the success and failure paths so a single bad post
 * (Gemini quota, broken image, timeout, etc.) does not leave the profile
 * stuck on "analyzing" forever.
 */
async function markPostProcessed(
  scrapingJobId: string,
  profileId: string
): Promise<void> {
  try {
    const scrapingJob = await getScrapingJobById(scrapingJobId);
    const newProcessed = (scrapingJob.processed_posts || 0) + 1;
    await updateScrapingJob(scrapingJobId, {
      processed_posts: newProcessed,
    });

    // Primary signal: job-level counter reached total_posts
    const reachedTotal =
      typeof scrapingJob.total_posts === "number" &&
      scrapingJob.total_posts !== null &&
      newProcessed >= scrapingJob.total_posts;

    if (reachedTotal) {
      await updateProfileStatus(profileId, "completed");
      console.log(
        `[AnalysisWorker] processed_posts (${newProcessed}) reached total_posts (${scrapingJob.total_posts}) for profile ${profileId}. Status set to completed.`
      );
      return;
    }

    // Secondary signal (happy path): no posts with destination=NULL remaining.
    // This still works when every post analysis succeeded.
    const unanalyzedCount = await countUnanalyzedPostsByProfile(profileId);
    if (unanalyzedCount === 0) {
      await updateProfileStatus(profileId, "completed");
      console.log(
        `[AnalysisWorker] All posts analyzed for profile ${profileId} (no unanalyzed remaining). Status set to completed.`
      );
    }
  } catch (err) {
    console.error(
      `[AnalysisWorker] Failed to mark post processed for profile ${profileId}:`,
      err
    );
  }
}

export const analysisWorker = new Worker(
  "instagram-analysis",
  async (job) => {
    const { postId, imageUrl, caption, comments, profileId, scrapingJobId } = job.data;
    console.log(`[AnalysisWorker] Starting job ${job.id} for post ${postId}`);

    let didThrow = false;
    let thrownErr: any;

    try {
      // 1. Verify post exists
      const post = await getPostById(postId);
      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // 2. Call AI provider
      const aiProvider = createAIProvider();
      const analysis = await aiProvider.analyze({
        imageUrl: imageUrl || post.image_url,
        caption: caption || post.caption || "",
        comments: comments || post.comments_content || [],
        systemPrompt: SYSTEM_PROMPT,
      });

      // 3. Save analysis result
      await updatePostAnalysis(postId, {
        destination: analysis.destination,
        experience_type: analysis.experience_type as any,
        price_estimate: analysis.price_estimate,
        urgency_level: analysis.urgency_level as any,
        offer_expiry_date: analysis.offer_expiry_date || null,
        keywords: analysis.keywords,
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        raw_ai_analysis: analysis as unknown as Record<string, unknown>,
      });

      console.log(`[AnalysisWorker] Saved analysis for post ${postId}`);
      console.log(`[AnalysisWorker] Completed job ${job.id}`);
    } catch (err: any) {
      didThrow = true;
      thrownErr = err;
      console.error(`[AnalysisWorker] Error in job ${job.id}:`, err);

      // Mark scraping job as having an error but don't fail the whole job
      // so other analyses can continue
      try {
        await updateScrapingJob(scrapingJobId, {
          error_message: `Analysis failed for post ${postId}: ${err.message || "Unknown error"}`,
        });
      } catch (updateErr) {
        console.error("[AnalysisWorker] Failed to update scraping job error:", updateErr);
      }
    } finally {
      // ALWAYS count this post as processed — success or failure.
      // Without this, a single failed analysis (e.g. Gemini quota error) leaves
      // the profile stuck on "analyzing" forever because destination stays NULL.
      await markPostProcessed(scrapingJobId, profileId);
    }

    if (didThrow) {
      throw thrownErr;
    }
  },
  { connection: redisConnection }
);

analysisWorker.on("failed", (job, err) => {
  console.error(`[AnalysisWorker] Job ${job?.id} failed:`, err);
});
