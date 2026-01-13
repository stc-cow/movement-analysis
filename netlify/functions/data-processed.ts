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
        i++;
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
  From_Latitude?: number;
  From_Longitude?: number;
  To_Latitude?: number;
  To_Longitude?: number;
  Region_From?: string;
  Region_To?: string;
  Vendor?: string;
  Governorate?: string;
  Is_Royal?: boolean;
  Is_EBU?: boolean;
  EbuRoyalCategory?: "ROYAL" | "EBU" | "NON EBU";
  [key: string]: unknown;
}

function classifyEbuRoyal(flag: string | undefined): {
  isRoyal: boolean;
  isEBU: boolean;
  category: "ROYAL" | "EBU" | "NON EBU";
} {
  if (!flag || flag.trim() === "") {
    return { isRoyal: false, isEBU: false, category: "NON EBU" };
  }

  const normalized = flag.trim().toLowerCase();

  if (normalized === "royal") {
    return { isRoyal: true, isEBU: false, category: "ROYAL" };
  } else if (normalized === "ebu") {
    return { isRoyal: false, isEBU: true, category: "EBU" };
  } else if (normalized === "non ebu" || normalized === "non-ebu") {
    return { isRoyal: false, isEBU: false, category: "NON EBU" };
  } else {
    return { isRoyal: false, isEBU: false, category: "NON EBU" };
  }
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

    // Use hardcoded indices based on actual Google Sheet structure
    // Column A (0): COW ID
    // Column E (4): EBU/Royal
    // Column L (11): Top Event
    // Column M (12): Moved DateTime
    // Column O (14): Reached DateTime
    // Column Q (16): From Location
    // Column R (17): From Sub Location
    // Column S (18): From Latitude
    // Column T (19): From Longitude
    // Column U (20): To Location
    // Column V (21): To Sub Location
    // Column W (22): To Latitude
    // Column X (23): To Longitude
    // Column Y (24): Distance
    // Column Z (25): Movement Type
    // Column AA (26): Region From
    // Column AB (27): Region To
    // Column AC (28): Vendor
    // Column AD (29): Governorate

    const movements: Movement[] = [];
    let serialNumber = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const cells = parseCSVLine(line);
      const cowId = cells[0]?.trim();

      if (!cowId) continue;

      // Extract required datetime fields with fallbacks
      const movedDt =
        cells[12]?.trim() || cells[10]?.trim() || new Date().toISOString();
      const reachedDt =
        cells[14]?.trim() || cells[12]?.trim() || new Date().toISOString();

      // Classify Royal/EBU status
      const ebuRoyalFlag = cells[4]?.trim();
      const { isRoyal, isEBU, category } = classifyEbuRoyal(ebuRoyalFlag);

      const movement: Movement = {
        SN: serialNumber++,
        COW_ID: cowId,
        From_Location_ID: cells[16]?.trim() || cells[14]?.trim() || "",
        To_Location_ID: cells[20]?.trim() || cells[18]?.trim() || "",
        Moved_DateTime: movedDt,
        Reached_DateTime: reachedDt,
        Is_Royal: isRoyal,
        Is_EBU: isEBU,
        EbuRoyalCategory: category,
      };

      // Add optional fields
      if (cells[17]) movement.From_Sub_Location = cells[17].trim();
      if (cells[21]) movement.To_Sub_Location = cells[21].trim();

      // Add latitude/longitude
      if (cells[18]) {
        const lat = parseFloat(cells[18].trim());
        if (!isNaN(lat)) movement.From_Latitude = lat;
      }

      if (cells[19]) {
        const lon = parseFloat(cells[19].trim());
        if (!isNaN(lon)) movement.From_Longitude = lon;
      }

      if (cells[22]) {
        const lat = parseFloat(cells[22].trim());
        if (!isNaN(lat)) movement.To_Latitude = lat;
      }

      if (cells[23]) {
        const lon = parseFloat(cells[23].trim());
        if (!isNaN(lon)) movement.To_Longitude = lon;
      }

      // Movement type
      if (cells[25]) {
        const movType = cells[25].trim();
        if (movType.includes("Full")) {
          movement.Movement_Type = "Full";
        } else if (movType.includes("Half")) {
          movement.Movement_Type = "Half";
        } else {
          movement.Movement_Type = "Zero";
        }
      }

      // Distance
      if (cells[24]) {
        const distVal = parseFloat(cells[24].trim());
        movement.Distance_KM = isNaN(distVal) ? 0 : distVal;
      }

      // Top Event
      if (cells[11]) {
        movement.Top_Event = cells[11].trim();
      }

      // Regions
      if (cells[26]) movement.Region_From = cells[26].trim();
      if (cells[27]) movement.Region_To = cells[27].trim();

      // Vendor
      if (cells[28]) {
        movement.Vendor = cells[28].trim() || "Unknown";
      } else {
        movement.Vendor = "Unknown";
      }

      // Governorate
      if (cells[29]) movement.Governorate = cells[29].trim();

      movements.push(movement);
    }

    console.log(`Parsed ${movements.length} movements from CSV`);
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
      console.log("Returning cached data");
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

    console.log(`Successfully parsed ${movements.length} movements`);

    // Build dimension arrays
    const cowSet = new Set<string>();
    const cowMovementCount = new Map<string, number>();
    const locationSet = new Set<string>();
    const eventSet = new Set<string>();
    const vendorSet = new Set<string>();

    movements.forEach((m) => {
      cowSet.add(m.COW_ID);
      cowMovementCount.set(
        m.COW_ID,
        (cowMovementCount.get(m.COW_ID) || 0) + 1,
      );
      if (m.From_Location_ID) locationSet.add(m.From_Location_ID);
      if (m.To_Location_ID) locationSet.add(m.To_Location_ID);
      if (m.Top_Event) eventSet.add(m.Top_Event);
      if (m.Vendor) vendorSet.add(m.Vendor);
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
      vendors: Array.from(vendorSet).map((id) => ({
        Vendor: id,
      })),
      cowMovementCounts: Array.from(cowMovementCount.entries()).map(
        ([cowId, count]) => ({
          COW_ID: cowId,
          movementCount: count,
        }),
      ),
      totalDistanceKM: movements.reduce(
        (sum, m) => sum + (m.Distance_KM || 0),
        0,
      ),
      timestamp: new Date().toISOString(),
    };

    // Cache the response
    setCache("processed-data-v2", responseData);
    console.log("Data cached successfully");

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
