import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { serveStatic, setupVite } from "../server/_core/vite";

// Create Express app once
let app: express.Express;
let initialized = false;

async function initializeApp() {
  if (initialized) return app;

  app = express();

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Serve static files (built frontend)
  serveStatic(app);

  initialized = true;
  return app;
}

// Vercel serverless handler
export default async (req: VercelRequest, res: VercelResponse) => {
  const app = await initializeApp();
  return new Promise<void>((resolve) => {
    app(req, res as any);
    res.on("finish", () => resolve());
  });
};
