#!/usr/bin/env node

/**
 * Start RAG Swing-Trading Pipeline
 * 
 * This script starts the development server for the RAG Swing-Trading Pipeline.
 * Usage: node start-app.js or npm run start:dev
 */

import { spawnSync, spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isWindows = platform() === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

console.log("\n");
console.log("========================================");
console.log("RAG Swing-Trading Pipeline");
console.log("========================================");
console.log("");

// Check if node_modules exists
const nodeModulesPath = resolve(__dirname, "node_modules");
if (!existsSync(nodeModulesPath)) {
  console.log("Installing dependencies...\n");
  const install = spawnSync(npmCmd, ["install", "--legacy-peer-deps", "--no-fund"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: false,
  });

  if (install.error || install.status !== 0) {
    console.error("Failed to install dependencies");
    process.exit(1);
  }
  console.log("Dependencies installed.\n");
}

console.log("Starting development server...");
console.log("Opening browser to http://localhost:5173\n");

// Open browser
if (isWindows) {
  spawn("cmd", ["/c", "start", "http://localhost:5173"], { detached: true });
} else if (platform() === "darwin") {
  spawn("open", ["http://localhost:5173"], { detached: true });
} else {
  spawn("xdg-open", ["http://localhost:5173"], { detached: true });
}

// Wait a moment for server to start
setTimeout(() => {
  const server = spawnSync(npmCmd, ["run", "dev"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: false,
  });
  process.exit(server.status || 0);
}, 1000);
