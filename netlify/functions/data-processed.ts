import { Handler } from "@netlify/functions";

const FETCH_TIMEOUT = 20000;
const CACHE_TTL = 300;

const MOVEMENT_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1539310010&single=true&output=csv";

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expires: number }>();

function getCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL * 1000,
  });
}

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

interface Movement {
  SN: number;
  COW_ID: string;
  From_Location_ID: string;
  To_Location_ID: string;
  Moved_DateTime: string;
  Reached_DateTime: string;
  Movement_Type?: string;
  Distance_KM?: number;
  Top_Event?: string;
  From_Sub_Location?: string;
  To_Sub_Location?: string;
  [key: string]: unknown;
}

function parseCSVData(csvText: unknown): Movement[] {
  // Validate input
  if (typeof csvText !== "string" || !csvText) {
    console.error("Invalid CSV data type:", typeof csvText);
    return [];
  }

  // Check for HTML error responses
  if (
    csvText.includes("<html") ||
    csvText.includes("<HTML") ||
    csvText.includes("<!DOCTYPE")
  ) {
    console.error("Received HTML instead of CSV");
    return [];
  }

  try {
    const lines = csvText.trim().split("\n");

    if (lines.length < 2) {
      console.warn("CSV has fewer than 2 lines");
      return [];
    }

    const headerLine = lines[0];
    const headerCells = parseCSVLine(headerLine);

    const headerLower = headerCells.map((h, idx) => ({
      original: h,
      lower: h.toLowerCase().trim(),
      index: idx,
    }));

    // Find column indices
    const cowIdIdx =
      headerLower.find(
        (h) =>
          (h.lower.includes("cow") && h.lower.includes("id")) ||
          h.lower === "cow" ||
          h.lower === "cows id",
      )?.index ?? 0;

    const fromLocationIdx =
      headerLower.find(
        (h) =>
          (h.lower.includes("from") && h.lower.includes("location")) ||
          h.lower === "origin" ||
          h.lower === "from",
      )?.index ?? 14;

    const toLocationIdx =
      headerLower.find(
        (h) =>
          (h.lower.includes("to") && h.lower.includes("location")) ||
          h.lower === "destination" ||
          h.lower === "to",
      )?.index ?? 20;

    const movementTypeIdx = headerLower.find(
      (h) =>
        (h.lower.includes("movement") && h.lower.includes("type")) ||
        h.lower === "type",
    )?.index;

    const distanceIdx = headerLower.find(
      (h) =>
        h.lower.includes("distance") ||
        h.lower === "km" ||
        h.lower === "distance (km)",
    )?.index;

    const topEventIdx = headerLower.find(
      (h) => h.lower === "top events",
    )?.index;

    // Find datetime columns (typically columns L[12] and N[14]: "Moved Date/Time" and "Reached Date/Time")
    const movedDateTimeMatch = headerLower.find(
      (h) =>
        h.lower.includes("moved") && h.lower.includes("date") &&
        h.lower.includes("time"),
    );
    const movedDateTimeIdx = movedDateTimeMatch?.index ?? 12;

    const reachedDateTimeMatch = headerLower.find(
      (h) =>
        h.lower.includes("reached") && h.lower.includes("date") &&
        h.lower.includes("time"),
    );
    const reachedDateTimeIdx = reachedDateTimeMatch?.index ?? 14;

    // Find sub-location columns
    const fromSubLocIdx = headerLower.find(
      (h) =>
        h.lower.includes("from") &&
        h.lower.includes("sub") &&
        h.lower.includes("location"),
    )?.index;

    const toSubLocIdx = headerLower.find(
      (h) =>
        h.lower.includes("to") &&
        h.lower.includes("sub") &&
        h.lower.includes("location"),
    )?.index;

    const movements: Movement[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const cells = parseCSVLine(line);
      const cowId = cells[cowIdIdx]?.trim();

      if (!cowId) continue;

      const movement: Movement = {
        COW_ID: cowId,
        From_Location_ID: cells[fromLocationIdx]?.trim() || "",
        To_Location_ID: cells[toLocationIdx]?.trim() || "",
      };

      // Add datetime fields
      const movedDt = cells[movedDateTimeIdx]?.trim();
      if (movedDt) {
        movement.Moved_DateTime = movedDt;
      }

      const reachedDt = cells[reachedDateTimeIdx]?.trim();
      if (reachedDt) {
        movement.Reached_DateTime = reachedDt;
      }

      // Add sub-location fields
      if (fromSubLocIdx !== undefined) {
        movement.From_Sub_Location = cells[fromSubLocIdx]?.trim();
      }

      if (toSubLocIdx !== undefined) {
        movement.To_Sub_Location = cells[toSubLocIdx]?.trim();
      }

      if (movementTypeIdx !== undefined && cells[movementTypeIdx]) {
        movement.Movement_Type = cells[movementTypeIdx].trim();
      }

      if (distanceIdx !== undefined && cells[distanceIdx]) {
        const distVal = parseFloat(cells[distanceIdx].trim());
        movement.Distance_KM = isNaN(distVal) ? 0 : distVal;
      }

      if (topEventIdx !== undefined && cells[topEventIdx]) {
        movement.Top_Event = cells[topEventIdx].trim();
      }

      movements.push(movement);
    }

    return movements;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return [];
  }
}

const handler: Handler = async () => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
  };

  try {
    // Check cache first
    const cached = getCache("processed-data-v2");
    if (cached) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cached),
      };
    }

    console.log("Fetching data from Google Sheets...");

    // Fetch CSV from Google Sheets
    const response = await fetch(MOVEMENT_DATA_CSV_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`HTTP error: ${response.status}`);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: `Failed to fetch data: HTTP ${response.status}`,
        }),
      };
    }

    const csvText = await response.text();
    console.log(`Received ${csvText.length} bytes from Google Sheets`);

    // Parse CSV
    const movements = parseCSVData(csvText);

    if (!movements || movements.length === 0) {
      console.error("No movements parsed from CSV");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "No valid movement data found in Google Sheet",
        }),
      };
    }

    console.log(`Parsed ${movements.length} movements`);

    // Build dimension arrays
    const cowSet = new Set<string>();
    const locationSet = new Set<string>();
    const eventSet = new Set<string>();

    movements.forEach((m) => {
      cowSet.add(m.COW_ID);
      if (m.From_Location_ID) locationSet.add(m.From_Location_ID);
      if (m.To_Location_ID) locationSet.add(m.To_Location_ID);
      if (m.Top_Event) eventSet.add(m.Top_Event);
    });

    const responseData = {
      movements,
      cows: Array.from(cowSet).map((id) => ({
        COW_ID: id,
      })),
      locations: Array.from(locationSet).map((id) => ({
        Location_ID: id,
        Location_Name: id,
      })),
      events: Array.from(eventSet).map((id) => ({
        Event_ID: id,
        Event_Name: id,
      })),
      totalDistanceKM: movements.reduce(
        (sum, m) => sum + (m.Distance_KM || 0),
        0,
      ),
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    setCache("processed-data-v2", responseData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in data-processed function:", errorMessage);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: errorMessage,
      }),
    };
  }
};

export { handler };
