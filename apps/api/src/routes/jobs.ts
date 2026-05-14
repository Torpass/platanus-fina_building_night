import { Router, Request, Response } from "express";
import { supabase } from "@repo/database";

const router: Router = Router();

// GET /jobs/:id — obtener estado de un scraping job
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("scraping_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.json(data);
  } catch (err: any) {
    console.error("Error getting job:", err);
    res.status(500).json({ error: err.message || "Failed to get job" });
  }
});

// GET /jobs/profile/:profileId — listar jobs de un perfil
router.get("/profile/:profileId", async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { data, error } = await supabase
      .from("scraping_jobs")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error("Error listing jobs:", err);
    res.status(500).json({ error: err.message || "Failed to list jobs" });
  }
});

export default router;
