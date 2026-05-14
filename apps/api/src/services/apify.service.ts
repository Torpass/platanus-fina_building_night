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

  /**
   * Fetch ONLY Instagram profile metadata (no posts) via Apify's
   * `resultsType: "details"` mode. Safe to call standalone — returns null on
   * any error (logs a warning) instead of throwing, so callers can decide
   * whether to fall back or surface a 502.
   */
  async fetchProfileDetails(
    instagramHandle: string
  ): Promise<ApifyProfileInfo | null> {
    const cleanHandle = instagramHandle.replace(/^@/, "").trim();
    try {
      const detailsResp = await axios.post(
        `${this.baseUrl}/acts/apify~instagram-scraper/run-sync-get-dataset-items`,
        {
          directUrls: [`https://www.instagram.com/${cleanHandle}/`],
          resultsType: "details",
          resultsLimit: 1,
          proxyConfiguration: { useApifyProxy: true },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          timeout: 120000,
          params: { clean: true, limit: 10 },
        }
      );
      const profileItem = detailsResp.data?.[0];
      if (!profileItem || profileItem.error) {
        return null;
      }
      const profileInfo: ApifyProfileInfo = {
        username: profileItem.username,
        fullName: profileItem.fullName,
        followersCount:
          typeof profileItem.followersCount === "number"
            ? profileItem.followersCount
            : undefined,
        followingCount:
          typeof profileItem.followsCount === "number"
            ? profileItem.followsCount
            : typeof profileItem.followingCount === "number"
              ? profileItem.followingCount
              : undefined,
        biography: profileItem.biography,
        profilePicUrl:
          profileItem.profilePicUrlHD || profileItem.profilePicUrl,
      };
      console.log(
        `[ApifyService] Profile details fetched for @${cleanHandle}:`,
        profileInfo
      );
      return profileInfo;
    } catch (err: any) {
      console.warn(
        `[ApifyService] Failed to fetch profile details for @${cleanHandle}:`,
        err?.message || err
      );
      return null;
    }
  }

  async scrapeProfile(
    instagramHandle: string,
    maxPosts = 50
  ): Promise<ScrapedResult> {
    const cleanHandle = instagramHandle.replace(/^@/, "").trim();

    console.log(`[ApifyService] Starting scrape for @${cleanHandle}`);

    // 1. Best-effort: fetch profile metadata (full_name, followers, bio, pic HD).
    //    The standard actor under resultsType:"posts" does NOT return a
    //    profile-info item, so this dedicated details call is the most
    //    reliable source for follower count + HD profile picture.
    const detailsResult = await this.fetchProfileDetails(cleanHandle);
    let profileInfo: ApifyProfileInfo | undefined =
      detailsResult ?? undefined;

    // 2. Build Apify input for posts. addParentData enriches each post item
    //    with owner.* fields so we have a fallback for profileInfo.
    const apifyInput = {
      directUrls: [`https://www.instagram.com/${cleanHandle}/`],
      resultsType: "posts",
      resultsLimit: maxPosts,
      includeReplies: false,
      addParentData: true,
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

    for (const item of items) {
      // Some versions of the actor include profile info as a separate item.
      // If we don't already have profileInfo from the details call, use it.
      if (item.username && !item.url) {
        if (!profileInfo) {
          profileInfo = {
            username: item.username,
            followersCount: item.followersCount,
            followingCount: item.followingCount,
            fullName: item.fullName,
            biography: item.biography,
            profilePicUrl: item.profilePicUrlHD || item.profilePicUrl,
          };
        }
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

    // 3. Final fallback: if profileInfo is still missing, derive it from the
    //    first post's owner-* fields (populated by addParentData:true).
    if (!profileInfo && items.length > 0) {
      const firstItem = items[0];
      const fallback: ApifyProfileInfo = {
        username: firstItem.ownerUsername || firstItem.owner?.username,
        fullName: firstItem.ownerFullName || firstItem.owner?.fullName,
        followersCount:
          typeof firstItem.ownerFollowersCount === "number"
            ? firstItem.ownerFollowersCount
            : typeof firstItem.owner?.followersCount === "number"
              ? firstItem.owner.followersCount
              : undefined,
        followingCount:
          typeof firstItem.ownerFollowingCount === "number"
            ? firstItem.ownerFollowingCount
            : typeof firstItem.owner?.followingCount === "number"
              ? firstItem.owner.followingCount
              : undefined,
        profilePicUrl:
          firstItem.ownerProfilePicUrl ||
          firstItem.owner?.profilePicUrl ||
          firstItem.owner?.profilePicUrlHD,
      };
      // Only assign if we got at least one meaningful field
      if (
        fallback.username ||
        fallback.fullName ||
        fallback.profilePicUrl ||
        fallback.followersCount !== undefined
      ) {
        profileInfo = fallback;
        console.log(
          `[ApifyService] profileInfo derived from first post owner fields for @${cleanHandle}:`,
          profileInfo
        );
      }
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
