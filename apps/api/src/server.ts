import express, { Express, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import profilesRoutes from "./routes/profiles";
import postsRoutes from "./routes/posts";
import jobsRoutes from "./routes/jobs";

export function createServer(): Express {
  const app = express();

  // CORS
  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        /\.vercel\.app$/,
      ],
      credentials: true,
    })
  );

  // Body parser
  app.use(express.json());

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Routes
  app.use("/auth", authRoutes);
  app.use("/profiles", profilesRoutes);
  app.use("/posts", postsRoutes);
  app.use("/jobs", jobsRoutes);

  // 404 fallback
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: any) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  });

  return app;
}
