import { Handler } from "@netlify/functions";

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCached(key: string, data: any, ttlSeconds: number = 300): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds * 1000,
  });
}

const FETCH_TIMEOUT = 20000;
const CACHE_TTL = 300;

const MOVEMENT_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1539310010&single=true&output=csv";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

interface MovementData {
  COW_ID: string;
  From_Location_ID: string;
  To_Location_ID: string;
  Movement_Type?: string;
  Distance_KM?: number;
  Top_Event?: string;
  [key: string]: any;
}

function parseCSVData(csvText: string): MovementData[] {
  if (
    csvText.includes("<html") ||
    csvText.includes("<HTML") ||
    csvText.includes("<!DOCTYPE")
  ) {
    throw new Error(
      "Google Sheets returned HTML instead of CSV. Check if sheet is published."
    );
  }

  const lines = csvText.trim().split("\n");

  if (lines.length < 2) {
    return [];
  }

  const headerLine = lines[0];
  const headerCells = parseCSVLine(headerLine);

  const headerLower = headerCells.map((h, idx) => ({
    original: h,
    lower: h.toLowerCase().trim(),
    index: idx,
  }));

  const cowIdMatch = headerLower.find(
    (h) =>
      (h.lower.includes("cow") && h.lower.includes("id")) ||
      h.lower === "cow" ||
      h.lower === "cows id"
  );

  const fromLocationMatch = headerLower.find(
    (h) =>
      (h.lower.includes("from") && h.lower.includes("location")) ||
      h.lower === "origin" ||
      h.lower === "from"
  );

  const toLocationMatch = headerLower.find(
    (h) =>
      (h.lower.includes("to") && h.lower.includes("location")) ||
      h.lower === "destination" ||
      h.lower === "to"
  );

  const movementTypeMatch = headerLower.find(
    (h) =>
      (h.lower.includes("movement") && h.lower.includes("type")) ||
      h.lower === "type"
  );

  const distanceMatch = headerLower.find(
    (h) =>
      h.lower.includes("distance") ||
      h.lower === "km" ||
      h.lower === "distance (km)"
  );

  const topEventMatch = headerLower.find((h) => h.lower === "top events");

  const cowIdIdx = cowIdMatch?.index ?? 0;
  const fromLocationIdx = fromLocationMatch?.index ?? 14;
  const toLocationIdx = toLocationMatch?.index ?? 20;
  const movementTypeIdx = movementTypeMatch?.index;
  const distanceIdx = distanceMatch?.index;
  const topEventIdx = topEventMatch?.index;

  const movements: MovementData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = parseCSVLine(line);
    const cowId = cells[cowIdIdx]?.trim() || "";

    if (!cowId) continue;

    const movement: MovementData = {
      COW_ID: cowId,
      From_Location_ID: cells[fromLocationIdx]?.trim() || "",
      To_Location_ID: cells[toLocationIdx]?.trim() || "",
    };

    if (movementTypeIdx !== undefined) {
      movement.Movement_Type = cells[movementTypeIdx]?.trim();
    }

    if (distanceIdx !== undefined) {
      const distVal = parseFloat(cells[distanceIdx]?.trim() || "0");
      movement.Distance_KM = isNaN(distVal) ? 0 : distVal;
    }

    if (topEventIdx !== undefined) {
      movement.Top_Event = cells[topEventIdx]?.trim();
    }

    movements.push(movement);
  }

  return movements;
}

const handler: Handler = async (event, context) => {
  try {
    const cacheKey = "processed-data-v2";
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      return {
        statusCode: 200,
        body: JSON.stringify(cachedData),
      };
    }

    let csvData: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const response = await fetch(MOVEMENT_DATA_CSV_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        // @ts-ignore - AbortSignal might not be available in all Netlify environments
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        csvData = await response.text();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to fetch movement data",
          details: error,
        }),
      };
    }

    if (!csvData || csvData.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "No data received from Google Sheets",
        }),
      };
    }

    const rows = parseCSVData(csvData);

    if (rows.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "No valid data rows found in Google Sheet",
        }),
      };
    }

    // Extract unique dimensions
    const cowIds = new Set(rows.map((m) => m.COW_ID));
    const locationIds = new Set<string>();

    rows.forEach((m) => {
      if (m.From_Location_ID) locationIds.add(m.From_Location_ID);
      if (m.To_Location_ID) locationIds.add(m.To_Location_ID);
    });

    // Build dimension arrays
    const cows = Array.from(cowIds).map((cowId, idx) => ({
      COW_ID: cowId,
      index: idx,
    }));

    const locations = Array.from(locationIds).map((locId, idx) => ({
      Location_ID: locId,
      Location_Name: locId,
      index: idx,
    }));

    const events = Array.from(
      new Set(rows.map((m) => m.Top_Event).filter(Boolean))
    ).map((event, idx) => ({
      Event_ID: event,
      Event_Name: event,
      index: idx,
    }));

    const responseData = {
      movements: rows,
      cows,
      locations,
      events,
      totalDistanceKM: rows.reduce((sum, m) => sum + (m.Distance_KM || 0), 0),
      timestamp: new Date().toISOString(),
    };

    setCached(cacheKey, responseData, CACHE_TTL);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
