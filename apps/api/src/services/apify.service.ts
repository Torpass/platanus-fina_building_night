import axios from "axios";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_BASE_URL = "https://api.apify.com/v2";

export interface ApifyPost {
  id: string;
  caption: string;
  url: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  images: string[];
}

export interface ApifyProfileInfo {
  username?: string;
  followersCount?: number;
  followingCount?: number;
  fullName?: string;
  biography?: string;
  profilePicUrl?: string;
}

export interface ScrapedResult {
  posts: ApifyPost[];
  profileInfo?: ApifyProfileInfo;
}

class ApifyService {
  private token: string;
  private baseUrl: string;

  constructor() {
    this.token = APIFY_TOKEN;
    this.baseUrl = APIFY_BASE_URL;
  }

  async scrapeProfile(
    instagramHandle: string,
    maxPosts = 50
  ): Promise<ScrapedResult> {
    const cleanHandle = instagramHandle.replace(/^@/, "").trim();

    console.log(`[ApifyService] Starting scrape for @${cleanHandle}`);

    // Build Apify input using standard proxyConfiguration format
    const apifyInput = {
      directUrls: [`https://www.instagram.com/${cleanHandle}/`],
      resultsType: "posts",
      resultsLimit: maxPosts,
      includeReplies: false,
      proxyConfiguration: {
        useApifyProxy: true,
      },
    };

    console.log(`[ApifyService] Input payload:`, JSON.stringify(apifyInput, null, 2));

    // Use synchronous endpoint: runs actor, waits for completion, returns dataset items
    // This endpoint handles proxy and run configuration like the console does
    const response = await axios.post(
      `${this.baseUrl}/acts/apify~instagram-scraper/run-sync-get-dataset-items`,
      apifyInput,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        timeout: 300000, // 5 minutes (Apify sync timeout is 300s)
        params: {
          clean: true,
          limit: 10000,
        },
      }
    );

    const items = response.data || [];

    console.log(`[ApifyService] Fetched ${items.length} items for @${cleanHandle}`);

    // Log first item for debugging
    if (items.length > 0) {
      console.log(`[ApifyService] First item keys:`, Object.keys(items[0]));
      console.log(`[ApifyService] First item sample:`, JSON.stringify(items[0], null, 2).substring(0, 500));
    }

    // Check if Apify returned an error object instead of posts
    if (items.length === 1 && items[0]?.error) {
      const errorMsg = items[0].errorDescription || items[0].error;
      throw new Error(`Apify could not scrape @${cleanHandle}: ${errorMsg}`);
    }

    // Parse items
    const posts: ApifyPost[] = [];
    let profileInfo: ApifyProfileInfo | undefined;

    for (const item of items) {
      // Some versions of the actor include profile info as a separate item
      if (item.username && !item.url) {
        profileInfo = {
          username: item.username,
          followersCount: item.followersCount,
          followingCount: item.followingCount,
          fullName: item.fullName,
          biography: item.biography,
          profilePicUrl: item.profilePicUrl,
        };
        continue;
      }

      // Priorizar el shortCode para la URL, luego extraerlo de la url si es necesario
      const shortCodeFromUrl = item.url ? item.url.match(/\/p\/([^\/?]+)/)?.[1] : null;
      const finalId = item.shortCode || shortCodeFromUrl || item.id || `apify_${Date.now()}`;

      const post: ApifyPost = {
        id: finalId,
        caption: item.caption || item.text || "",
        url: item.url || `https://instagram.com/p/${finalId}`,
        likesCount: typeof item.likesCount === "number" ? item.likesCount : 0,
        commentsCount:
          typeof item.commentsCount === "number" ? item.commentsCount : 0,
        timestamp: item.timestamp || item.createdTime || new Date().toISOString(),
        images: this.extractImages(item),
      };

      posts.push(post);
    }

    return { posts, profileInfo };
  }

  private async waitForRunCompletion(
    runId: string,
    maxWaitMs = 10 * 60 * 1000, // 10 minutes max
    pollIntervalMs = 10000 // 10 seconds
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const statusResponse = await axios.get(
        `${this.baseUrl}/actor-runs/${runId}`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
        }
      );

      const status = statusResponse.data?.data?.status;
      console.log(`[ApifyService] Run ${runId} status: ${status}`);

      if (status === "SUCCEEDED") {
        return;
      }

      if (
        status === "FAILED" ||
        status === "ABORTED" ||
        status === "TIMED-OUT"
      ) {
        throw new Error(`Apify run ${runId} ended with status: ${status}`);
      }

      // Still running or ready — wait and poll again
      await this.sleep(pollIntervalMs);
    }

    throw new Error(
      `Apify run ${runId} did not complete within ${maxWaitMs / 1000}s`
    );
  }

  private async fetchDatasetItems(runId: string): Promise<any[]> {
    // We need to fetch the dataset associated with the run, not the run itself.
    // The correct endpoint is /actor-runs/{runId}/dataset/items
    const response = await axios.get(
      `${this.baseUrl}/actor-runs/${runId}/dataset/items`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
        params: {
          clean: true,
          limit: 10000,
        },
      }
    );

    return response.data || [];
  }

  private extractImages(item: any): string[] {
    const images: string[] = [];

    if (item.images && Array.isArray(item.images)) {
      for (const img of item.images) {
        if (typeof img === "string") {
          images.push(img);
        } else if (img?.url) {
          images.push(img.url);
        } else if (img?.displayUrl) {
          images.push(img.displayUrl);
        }
      }
    }

    if (item.imageUrl && typeof item.imageUrl === "string") {
      images.push(item.imageUrl);
    }

    if (item.displayUrl && typeof item.displayUrl === "string") {
      images.push(item.displayUrl);
    }

    return images;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const apifyService = new ApifyService();
