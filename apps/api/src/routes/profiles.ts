import { Router, Request, Response } from "express";
import {
  listProfilesWithSelfHeal,
  createProfile,
  getProfileById,
  getProfileByHandle,
  createScrapingJob,
  getDashboardStats,
  deleteProfile,
  updateProfileInfo,
} from "../services/supabase.service";
import { addScrapingJob } from "../queues/instagram-scraping";
import { apifyService } from "../services/apify.service";

const router: Router = Router();

// GET /profiles — listar todos los perfiles
router.get("/", async (_req: Request, res: Response) => {
  try {
    const profiles = await listProfilesWithSelfHeal();
    res.json(profiles);
  } catch (err: any) {
    console.error("Error listing profiles:", err);
    res.status(500).json({ error: err.message || "Failed to list profiles" });
  }
});

// POST /profiles — crear nuevo perfil
router.post("/", async (req: Request, res: Response) => {
  try {
    const { instagramHandle } = req.body;
    if (!instagramHandle || typeof instagramHandle !== "string") {
      res.status(400).json({ error: "instagramHandle is required" });
      return;
    }

    const existing = await getProfileByHandle(instagramHandle);
    if (existing) {
      res.status(409).json({ error: "Profile already exists" });
      return;
    }

    const profile = await createProfile({
      instagram_handle: instagramHandle,
      status: "pending",
    });

    res.status(201).json(profile);
  } catch (err: any) {
    console.error("Error creating profile:", err);
    res.status(500).json({ error: err.message || "Failed to create profile" });
  }
});

// GET /profiles/stats — obtener estadísticas del dashboard
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    console.error("Error getting dashboard stats:", err);
    res.status(500).json({ error: err.message || "Failed to get stats" });
  }
});

// GET /profiles/:id — obtener perfil con sus posts
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const profile = await getProfileById(req.params.id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(profile);
  } catch (err: any) {
    console.error("Error getting profile:", err);
    res.status(500).json({ error: err.message || "Failed to get profile" });
  }
});

// DELETE /profiles/:id — eliminar perfil + posts (cascade)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await getProfileById(id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    await deleteProfile(id);
    res.json({ ok: true, id });
  } catch (err: any) {
    console.error("Error deleting profile:", err);
    res.status(500).json({ error: err.message || "Failed to delete profile" });
  }
});

// POST /profiles/:id/scrape — disparar scraping manual
router.post("/:id/scrape", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { maxPosts = 50 } = req.body;

    const profile = await getProfileById(id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const scrapingJob = await createScrapingJob({
      profile_id: id,
      status: "queued",
      processed_posts: 0,
      total_posts: null,
      error_message: null,
    });

    const bullJob = await addScrapingJob(
      id,
      profile.instagram_handle,
      scrapingJob.id,
      maxPosts
    );

    res.json({
      jobId: scrapingJob.id,
      bullJobId: bullJob.id,
      status: "queued",
    });
  } catch (err: any) {
    console.error("Error triggering scrape:", err);
    res.status(500).json({ error: err.message || "Failed to trigger scrape" });
  }
});

// POST /profiles/:id/refresh-info — only refresh profile metadata (no scraping/analysis)
router.post("/:id/refresh-info", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await getProfileById(id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const info = await apifyService.fetchProfileDetails(profile.instagram_handle);
    if (!info) {
      res.status(502).json({ error: "Could not fetch profile details from Apify" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (info.fullName) updates.full_name = info.fullName;
    if (info.followersCount !== undefined && info.followersCount !== null)
      updates.followers_count = info.followersCount;
    if (info.followingCount !== undefined && info.followingCount !== null)
      updates.following_count = info.followingCount;
    if (info.biography) updates.bio = info.biography;
    if (info.profilePicUrl) updates.profile_pic_url = info.profilePicUrl;

    if (Object.keys(updates).length === 0) {
      res.json({ ok: true, updated: false, profile });
      return;
    }

    const updated = await updateProfileInfo(id, updates);
    res.json({ ok: true, updated: true, profile: updated });
  } catch (err: any) {
    console.error("Error refreshing profile info:", err);
    res.status(500).json({ error: err.message || "Failed to refresh profile info" });
  }
});

export default router;
