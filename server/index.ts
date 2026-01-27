import "dotenv/config";
import express from "express";
import cors from "cors";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
