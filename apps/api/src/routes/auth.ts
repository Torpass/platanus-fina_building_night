import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const router: Router = Router();

// POST /auth/register — crear usuario (solo setup inicial)
router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ user: data.user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /auth/login — devuelve JWT
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    res.json({
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: data.user,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /auth/me — datos del usuario autenticado
router.get("/me", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
