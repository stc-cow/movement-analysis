import "dotenv/config";
import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import { Router } from "express";

// Import routes - inline to avoid bundling issues
import dataRoutes from "../../server/routes/data";
import { handleDemo } from "../../server/routes/demo";

// Create app directly
function createExpressApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "pong";
    res.json({ message: ping, time: new Date().toISOString() });
  });

  // Demo route
  app.get("/api/demo", handleDemo);

  // Data routes
  app.use("/api/data", dataRoutes);

  // Error handling
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[Express] Error:", err?.message || err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err?.message || "Unknown error",
    });
  });

  return app;
}

const app = createExpressApp();

// Use serverless-http to convert Express app to Netlify Function
export const handler = serverless(app, {
  basePath: "/.netlify/functions/api",
});
