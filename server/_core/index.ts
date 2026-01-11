import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

console.log("[Server] Starting initialization...");

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  console.log("[Server] Creating Express app...");
  const app = express();
  const server = createServer(app);
  
  // Configure body parser with larger size limit for file uploads
  console.log("[Server] Setting up middleware...");
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // OAuth callback under /api/oauth/callback
  console.log("[Server] Registering OAuth routes...");
  registerOAuthRoutes(app);
  
  // tRPC API
  console.log("[Server] Setting up tRPC middleware...");
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // In development mode with npm run dev, Vite runs separately on port 5173
  // So we only set up Vite middleware if NODE_ENV=development AND we're not running via npm run dev
  // We detect this by checking if VITE_DEV_SERVER_ALREADY_RUNNING is set or if we should skip Vite setup
  if (process.env.NODE_ENV === "development" && process.env.SKIP_VITE_SETUP !== "true") {
    console.log("[Server] Setting up Vite...");
    try {
      await setupVite(app, server);
    } catch (error) {
      console.warn("[Server] Vite setup failed, falling back to static files:", error);
      serveStatic(app);
    }
  } else {
    console.log("[Server] Skipping Vite setup, using static files...");
    serveStatic(app);
  }

  console.log("[Server] Finding available port...");
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  console.log("[Server] Starting HTTP server...");
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

console.log("[Server] Calling startServer()...");
startServer().catch(error => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
