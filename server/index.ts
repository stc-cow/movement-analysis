import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from /public folder
  // This allows /movement-data.json and /never-moved-cows.json to be served
  app.use(express.static(path.join(__dirname, "../public")));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      message: "API is running",
      deploymentMode: "Static with Local JSON Files",
      note: "All data is served from local JSON files - no external API calls",
    });
  });

  // Note: Data is served from static JSON files in /public
  // No API routes needed for dashboard data
  // - Movement data: /movement-data.json
  // - Never-moved cows: /never-moved-cows.json

  return app;
}
