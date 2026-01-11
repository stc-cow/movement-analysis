import { Handler } from "@netlify/functions";
import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import "dotenv/config";

// Import routes directly
import dataRoutes from "../../server/routes/data";
import { handleDemo } from "../../server/routes/demo";

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/api/ping", (_req, res) => {
  const ping = process.env.PING_MESSAGE ?? "pong";
  res.json({ message: ping });
});

app.get("/api/demo", handleDemo);

// Data routes
app.use("/api/data", dataRoutes);

// Error handling
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Express error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Export handler with proper typing
export const handler = serverless(app, {
  basePath: "/.netlify/functions/api",
}) as Handler;
