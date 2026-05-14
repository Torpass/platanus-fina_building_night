import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

if (typeof global !== 'undefined' && !global.WebSocket) {
  (global as any).WebSocket = WebSocket;
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — missing token" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: "Unauthorized — invalid token" });
      return;
    }

    req.user = data.user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
}
