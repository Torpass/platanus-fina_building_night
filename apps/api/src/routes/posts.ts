import { Router, Request, Response } from "express";
import { listPosts, getTrendingPosts, getUrgentPosts } from "../services/supabase.service";

const router: Router = Router();

// GET /posts — listar posts con filtros
router.get("/", async (req: Request, res: Response) => {
  try {
    const filters = {
      profile_id: req.query.profile_id as string | undefined,
      destination: req.query.destination as string | undefined,
      experience_type: req.query.experience_type as string | undefined,
      urgency_level: req.query.urgency_level as string | undefined,
      trending: req.query.trending === "true",
    };

    const posts = await listPosts(filters);
    res.json(posts);
  } catch (err: any) {
    console.error("Error listing posts:", err);
    res.status(500).json({ error: err.message || "Failed to list posts" });
  }
});

// GET /posts/trending — top 20 por engagement_score
router.get("/trending", async (_req: Request, res: Response) => {
  try {
    const posts = await getTrendingPosts(20);
    res.json(posts);
  } catch (err: any) {
    console.error("Error getting trending posts:", err);
    res.status(500).json({ error: err.message || "Failed to get trending posts" });
  }
});

// GET /posts/urgent — urgent posts
router.get("/urgent", async (_req: Request, res: Response) => {
  try {
    const posts = await getUrgentPosts();
    res.json(posts);
  } catch (err: any) {
    console.error("Error getting urgent posts:", err);
    res.status(500).json({ error: err.message || "Failed to get urgent posts" });
  }
});

export default router;
