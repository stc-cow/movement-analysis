import "dotenv/config";
import express from "express";
import cors from "cors";
import dataRoutes from "./routes/data";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "API is running" });
  });

  // Data routes - Single source of truth: Google Sheets
  app.use("/api/data", dataRoutes);

  return app;
}
