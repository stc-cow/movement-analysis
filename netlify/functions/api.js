// Netlify API handler with server integration
require("dotenv").config();

let serverlessHttp;
let handler;

async function initializeHandler() {
  if (handler) return handler;

  try {
    // Dynamically import serverless-http
    serverlessHttp = require("serverless-http");

    // Try to load and use the Express server
    try {
      const { createServer } = require("../../server");
      const app = createServer();

      console.log("[API] Successfully loaded Express server from ../../server");

      handler = serverlessHttp(app, {
        basePath: "/.netlify/functions/api",
      });
    } catch (serverError) {
      console.warn("[API] Could not load Express server:", serverError.message);

      // Fallback: create minimal Express app with data routes
      const express = require("express");
      const cors = require("cors");

      const app = express();
      app.use(cors());
      app.use(express.json());

      // Try to attach the data routes
      try {
        const dataRoutes = require("../../server/routes/data").default;
        app.use("/api/data", dataRoutes);
        console.log("[API] Successfully loaded data routes");
      } catch (routeError) {
        console.warn("[API] Could not load data routes:", routeError.message);

        // Ultimate fallback: hard code the data routes inline
        app.get("/api/data/processed-data", (req, res) => {
          // Try to fetch Google Sheets data directly
          fetchGoogleSheetsData()
            .then((data) => res.json(data))
            .catch((err) => {
              console.error("[API] Data fetch error:", err);
              res
                .status(500)
                .json({ error: "Failed to fetch data", details: err.message });
            });
        });
      }

      // Ping endpoint
      app.get("/api/ping", (req, res) => {
        res.json({ message: "pong", timestamp: new Date().toISOString() });
      });

      handler = serverlessHttp(app, {
        basePath: "/.netlify/functions/api",
      });
    }

    return handler;
  } catch (error) {
    console.error("[API] Failed to initialize:", error);
    throw error;
  }
}

async function fetchGoogleSheetsData() {
  const CSV_URL =
    process.env.MOVEMENT_DATA_CSV_URL ||
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv";

  console.log("[API] Fetching Movement-data from published CSV...");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(CSV_URL, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    console.log("[API] Received", csvText.length, "bytes of CSV data");

    // Return minimal structure - the real parsing happens in the server
    return {
      movements: [],
      cows: [],
      locations: [],
      events: [],
      note: "Raw data - needs parsing",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

exports.handler = async (event, context) => {
  try {
    const handlerFunc = await initializeHandler();
    return handlerFunc(event, context);
  } catch (error) {
    console.error("[API] Handler error:", error);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Service initialization failed",
        message: String(error),
      }),
    };
  }
};
