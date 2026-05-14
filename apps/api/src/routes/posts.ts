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

// GET /posts/trending — top por engagement_score (default 50, group-friendly)
router.get("/trending", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10) || 50, 200);
    const posts = await getTrendingPosts(limit);
    res.json(posts);
  } catch (err: any) {
    console.error("Error getting trending posts:", err);
    res.status(500).json({ error: err.message || "Failed to get trending posts" });
  }
});

// GET /posts/urgent — posts próximos a expirar (no incluye expirados por defecto)
//   ?windowDays=14         ventana hacia adelante en días
//   ?includeExpired=true   incluir los ya vencidos (debug)
router.get("/urgent", async (req: Request, res: Response) => {
  try {
    const windowDays = Math.min(
      parseInt((req.query.windowDays as string) || "14", 10) || 14,
      90
    );
    const includeExpired = req.query.includeExpired === "true";
    const posts = await getUrgentPosts({ windowDays, includeExpired });
    res.json(posts);
  } catch (err: any) {
    console.error("Error getting urgent posts:", err);
    res.status(500).json({ error: err.message || "Failed to get urgent posts" });
  }
});

export default router;
