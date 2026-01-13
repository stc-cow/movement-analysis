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

    const headerLine = lines[0];
    const headerCells = parseCSVLine(headerLine);

    const headerLower = headerCells.map((h, idx) => ({
      original: h,
      lower: h.toLowerCase().trim(),
      index: idx,
    }));

    // Find column indices - use fallback indices based on Google Sheets structure
    const cowIdIdx =
      headerLower.find(
        (h) =>
          (h.lower.includes("cow") && h.lower.includes("id")) ||
          h.lower === "cow" ||
          h.lower === "cows id",
      )?.index ?? 0; // Column A

    const fromLocationIdx =
      headerLower.find(
        (h) =>
          (h.lower.includes("from") && h.lower.includes("location")) ||
          h.lower === "origin" ||
          h.lower === "from",
      )?.index ?? 16; // Column Q

    const toLocationIdx =
      headerLower.find(
        (h) =>
          (h.lower.includes("to") && h.lower.includes("location")) ||
          h.lower === "destination" ||
          h.lower === "to",
      )?.index ?? 20; // Column U

    // DateTime columns
    const movedDateTimeMatch = headerLower.find(
      (h) =>
        h.lower.includes("moved") &&
        h.lower.includes("date") &&
        h.lower.includes("time"),
    );
    const movedDateTimeIdx = movedDateTimeMatch?.index ?? 12; // Column M

    const reachedDateTimeMatch = headerLower.find(
      (h) =>
        h.lower.includes("reached") &&
        h.lower.includes("date") &&
        h.lower.includes("time"),
    );
    const reachedDateTimeIdx = reachedDateTimeMatch?.index ?? 14; // Column O

    // Sub-location columns
    const fromSubLocIdx =
      headerLower.find(
        (h) =>
          h.lower.includes("from") &&
          h.lower.includes("sub") &&
          h.lower.includes("location"),
      )?.index ?? 17; // Column R

    const toSubLocIdx =
      headerLower.find(
        (h) =>
          h.lower.includes("to") &&
          h.lower.includes("sub") &&
          h.lower.includes("location"),
      )?.index ?? 21; // Column V

    const movementTypeIdx =
      headerLower.find(
        (h) =>
          (h.lower.includes("movement") && h.lower.includes("type")) ||
          h.lower === "type",
      )?.index ?? 25; // Column Z

    const distanceIdx =
      headerLower.find(
        (h) =>
          h.lower.includes("distance") ||
          h.lower === "km" ||
          h.lower === "distance (km)",
      )?.index ?? 24; // Column Y

    const topEventIdx =
      headerLower.find((h) => h.lower === "top events")?.index ?? 11; // Column L

    const regionFromIdx =
      headerLower.find(
        (h) => h.lower.includes("region") && h.lower.includes("from"),
      )?.index ?? 26; // Column AA

    const regionToIdx =
      headerLower.find(
        (h) => h.lower.includes("region") && h.lower.includes("to"),
      )?.index ?? 27; // Column AB

    const vendorIdx =
      headerLower.find((h) => h.lower === "vendor")?.index ?? 28; // Column AC

    const governorateIdx =
      headerLower.find((h) => h.lower === "governorate")?.index ?? 29; // Column AD

    // Find EBU/Royal flag column
    const ebuRoyalIdx =
      headerLower.find(
        (h) =>
          (h.lower.includes("ebu") && h.lower.includes("royal")) ||
          h.lower === "ebu/royal",
      )?.index ?? 4; // Column E

    // Find latitude/longitude columns
    const fromLatIdx =
      headerLower.find(
        (h) => h.lower.includes("from") && h.lower.includes("latitude"),
      )?.index ?? 18; // Column S
    const fromLonIdx =
      headerLower.find(
        (h) => h.lower.includes("from") && h.lower.includes("longitude"),
      )?.index ?? 19; // Column T
    const toLatIdx =
      headerLower.find(
        (h) => h.lower.includes("to") && h.lower.includes("latitude"),
      )?.index ?? 22; // Column W
    const toLonIdx =
      headerLower.find(
        (h) => h.lower.includes("to") && h.lower.includes("longitude"),
      )?.index ?? 23; // Column X

    const movements: Movement[] = [];
    let serialNumber = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const cells = parseCSVLine(line);
      const cowId = cells[cowIdIdx]?.trim();

      if (!cowId) continue;

      // Ensure required datetime fields exist
      const movedDt =
        cells[movedDateTimeIdx]?.trim() || new Date().toISOString();
      const reachedDt =
        cells[reachedDateTimeIdx]?.trim() || new Date().toISOString();

      // Classify Royal/EBU status
      const ebuRoyalFlag = cells[ebuRoyalIdx]?.trim();
      const { isRoyal, isEBU, category } = classifyEbuRoyal(ebuRoyalFlag);

      const movement: Movement = {
        SN: serialNumber++,
        COW_ID: cowId,
        From_Location_ID: cells[fromLocationIdx]?.trim() || "",
        To_Location_ID: cells[toLocationIdx]?.trim() || "",
        Moved_DateTime: movedDt,
        Reached_DateTime: reachedDt,
        Is_Royal: isRoyal,
        Is_EBU: isEBU,
        EbuRoyalCategory: category,
      };

      // Add optional fields
      if (fromSubLocIdx !== undefined) {
        movement.From_Sub_Location = cells[fromSubLocIdx]?.trim();
      }

      if (toSubLocIdx !== undefined) {
        movement.To_Sub_Location = cells[toSubLocIdx]?.trim();
      }

      // Add latitude/longitude
      if (fromLatIdx !== undefined && cells[fromLatIdx]) {
        const lat = parseFloat(cells[fromLatIdx].trim());
        if (!isNaN(lat)) movement.From_Latitude = lat;
      }

      if (fromLonIdx !== undefined && cells[fromLonIdx]) {
        const lon = parseFloat(cells[fromLonIdx].trim());
        if (!isNaN(lon)) movement.From_Longitude = lon;
      }

      if (toLatIdx !== undefined && cells[toLatIdx]) {
        const lat = parseFloat(cells[toLatIdx].trim());
        if (!isNaN(lat)) movement.To_Latitude = lat;
      }

      if (toLonIdx !== undefined && cells[toLonIdx]) {
        const lon = parseFloat(cells[toLonIdx].trim());
        if (!isNaN(lon)) movement.To_Longitude = lon;
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

      if (regionFromIdx !== undefined && cells[regionFromIdx]) {
        movement.Region_From = cells[regionFromIdx].trim();
      }

      if (regionToIdx !== undefined && cells[regionToIdx]) {
        movement.Region_To = cells[regionToIdx].trim();
      }

      if (vendorIdx !== undefined && cells[vendorIdx]) {
        movement.Vendor = cells[vendorIdx].trim();
      }

      if (governorateIdx !== undefined && cells[governorateIdx]) {
        movement.Governorate = cells[governorateIdx].trim();
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
    const cowMovementCount = new Map<string, number>();
    const locationSet = new Set<string>();
    const eventSet = new Set<string>();
    const vendorSet = new Set<string>();

    movements.forEach((m) => {
      cowSet.add(m.COW_ID);
      cowMovementCount.set(m.COW_ID, (cowMovementCount.get(m.COW_ID) || 0) + 1);
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
