/**
 * Direct Google Sheets CSV fetcher (client-side)
 * No backend required - works 100% on GitHub Pages
 */

// Google Sheets CSV URLs (Published to web)
const MOVEMENT_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1539310010&single=true&output=csv";

const NEVER_MOVED_COWS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1685376708&single=true&output=csv";

interface DashboardDataResponse {
  movements: any[];
  cows: any[];
  locations: any[];
  events: any[];
}

/**
 * Parses CSV line handling quoted values correctly
 */
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

/**
 * Canonical warehouse name mappings
 * Maps all variations to a single canonical name
 */
const WAREHOUSE_CANONICAL_MAP: Record<string, string> = {
  // Normalize by owner prefix + city + "WH" suffix
  // Canonical format: "{Owner} {City} WH"

  // STC Warehouses
  "stc jeddah wh": "stc Jeddah WH",
  "stc al ula wh": "stc Al Ula WH",
  "stc sharma wh": "stc Sharma WH",
  "stc madinah wh": "stc Madinah WH",
  "stc madina wh": "stc Madinah WH", // Spelling variant
  "stc abha wh": "stc Abha WH",
  "stc al kharaj wh": "stc Al Kharaj WH",
  "stc jizan wh": "stc Jizan WH",
  "stc arar wh": "stc Arar WH",
  "stc umluj wh": "stc Umluj WH",
  "stc sakaka wh": "stc Sakaka WH",
  "stc tabouk wh": "stc Tabouk WH",
  "stc taboulk wh": "stc Tabouk WH", // Spelling variant
  "stc buraidah wh": "stc Buraidah WH",
  "stc burida wh": "stc Buraidah WH", // Spelling variant
  "stc riyadh exit 18 wh": "stc Riyadh Exit 18 WH",

  // ACES Warehouses
  "aces makkah wh": "ACES Makkah WH",
  "aces muzahmiya wh": "ACES Muzahmiya WH",
  "aces dammam wh": "ACES Dammam WH",

  // Madaf Warehouses
  "madaf wh": "Madaf WH",
  "madaf huraymila wh": "Madaf WH",

  // HOI Warehouses
  "hoi al kharaj wh": "HOI Al Kharaj WH",

  // Alternate orderings (WH in front or middle)
  "stc wh jeddah": "stc Jeddah WH",
  "stc wh al ula": "stc Al Ula WH",
  "stc wh sharma": "stc Sharma WH",
  "stc wh madinah": "stc Madinah WH",
  "stc wh madina": "stc Madinah WH",
  "stc wh abha": "stc Abha WH",
  "stc wh al kharaj": "stc Al Kharaj WH",
  "stc wh jizan": "stc Jizan WH",
  "stc wh arar": "stc Arar WH",
  "stc wh umluj": "stc Umluj WH",
  "stc wh sakaka": "stc Sakaka WH",
  "stc wh tabouk": "stc Tabouk WH",
  "stc wh buraidah": "stc Buraidah WH",
  "stc wh exit 18 riyadh": "stc Riyadh Exit 18 WH",
  "stc wh exit 18 riyad": "stc Riyadh Exit 18 WH",
};

/**
 * Normalize warehouse names to unify duplicates
 * Handles spacing, casing, and common variations
 * Maps all variants to a single canonical name
 */
function normalizeWarehouseName(name: string): string {
  if (!name) return "";

  // Trim and collapse multiple spaces
  let normalized = name.trim().replace(/\s+/g, " ");

  // Look up in canonical map (case-insensitive)
  const key = normalized.toLowerCase();
  if (WAREHOUSE_CANONICAL_MAP[key]) {
    return WAREHOUSE_CANONICAL_MAP[key];
  }

  // If not in map, return the trimmed/normalized version
  // This preserves new warehouses while normalizing whitespace
  return normalized;
}

/**
 * Safely parse date strings to ISO format
 * Handles various date formats and invalid dates
 */
function parseDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") {
    return "1900-01-01T00:00:00Z";
  }

  try {
    const trimmed = dateStr.trim();

    // Try parsing as ISO first
    if (trimmed.includes("T")) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Try YYYY-MM-DD format
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(trimmed + "T00:00:00Z");
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Try DD MMM YYYY format (e.g., "15 Dec 2024")
    if (trimmed.match(/^\d{1,2}\s+\w+\s+\d{4}/)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Try M/D/YYYY format
    if (trimmed.includes("/")) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // Fallback
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // If all parsing fails, return safe fallback
    console.warn(`⚠️  Could not parse date: "${dateStr}"`);
    return "1900-01-01T00:00:00Z";
  } catch (e) {
    console.warn(`⚠️  Date parsing error for "${dateStr}":`, e);
    return "1900-01-01T00:00:00Z";
  }
}

/**
 * Parse movement data from Google Sheets CSV
 */
function parseMovementData(csvText: string): DashboardDataResponse {
  const lines = csvText.trim().split("\n");

  if (lines.length < 2) {
    console.warn("⚠️  CSV has fewer than 2 lines");
    return { movements: [], cows: [], locations: [], events: [] };
  }

  // Parse header
  const headerCells = parseCSVLine(lines[0]);
  console.log(`📋 Movement Data - Found ${headerCells.length} columns`);

  // Map column indices
  const COW_ID_IDX = 0;
  const FROM_LOCATION_IDX = 16;
  const TO_LOCATION_IDX = 20;
  const FROM_LAT_IDX = 18;
  const FROM_LNG_IDX = 19;
  const TO_LAT_IDX = 22;
  const TO_LNG_IDX = 23;
  const DISTANCE_IDX = 24;
  const MOVEMENT_TYPE_IDX = 25;
  const REGION_FROM_IDX = 26;
  const REGION_TO_IDX = 27;
  const VENDOR_IDX = 28;
  const GOVERNORATE_IDX = 29; // Column AD: Specific governorate name (Tabouk, Ha'il, Al Madinah, etc.)
  const EBU_ROYAL_IDX = 4;
  const MOVED_DATE_IDX = 12;
  const REACHED_DATE_IDX = 14;

  const movements: any[] = [];
  const cowMap = new Map();
  const locationMap = new Map();

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);

    const cowId = cells[COW_ID_IDX]?.trim();
    if (!cowId) continue;

    const fromLoc = normalizeWarehouseName(
      cells[FROM_LOCATION_IDX]?.trim() || "Unknown",
    );
    const toLoc = normalizeWarehouseName(
      cells[TO_LOCATION_IDX]?.trim() || "Unknown",
    );
    const ebuRoyalFlag = cells[EBU_ROYAL_IDX]?.trim() || "NON EBU";
    const distanceStr = cells[DISTANCE_IDX]?.trim() || "0";
    const movementType = cells[MOVEMENT_TYPE_IDX]?.trim() || "Zero";
    const movedDate = cells[MOVED_DATE_IDX]?.trim() || "";
    const reachedDate = cells[REACHED_DATE_IDX]?.trim() || "";
    const vendor = cells[VENDOR_IDX]?.trim() || "Unknown";
    const governorate = cells[GOVERNORATE_IDX]?.trim() || undefined; // Column AD: Specific governorate name

    // Classify EBU/Royal
    let category = "NON EBU";
    let isRoyal = false;
    let isEBU = false;

    if (ebuRoyalFlag.toLowerCase() === "royal") {
      category = "ROYAL";
      isRoyal = true;
    } else if (ebuRoyalFlag.toLowerCase() === "ebu") {
      category = "EBU";
      isEBU = true;
    }

    const movement = {
      SN: i,
      COW_ID: cowId,
      From_Location_ID: `LOC-${fromLoc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      From_Sub_Location: cells[17]?.trim() || undefined,
      To_Location_ID: `LOC-${toLoc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      To_Sub_Location: cells[21]?.trim() || undefined,
      Moved_DateTime: parseDate(movedDate),
      Reached_DateTime: parseDate(reachedDate),
      Movement_Type: movementType.includes("Full")
        ? "Full"
        : movementType.includes("Half")
          ? "Half"
          : "Zero",
      Top_Event: cells[11]?.trim() || undefined,
      Distance_KM: parseFloat(distanceStr) || 0,
      Is_Royal: isRoyal,
      Is_EBU: isEBU,
      EbuRoyalCategory: category,
      Vendor: vendor,
    };

    movements.push(movement);

    // Add COW
    if (!cowMap.has(cowId)) {
      cowMap.set(cowId, {
        COW_ID: cowId,
        Tower_Type: cells[6]?.includes("Small")
          ? "Small Cell"
          : cells[6]?.includes("Micro")
            ? "Micro Cell"
            : "Macro",
        Tower_Height: parseFloat(cells[8]?.trim() || "0") || 0,
        Network_2G: cells[9]?.includes("2G") || false,
        Network_4G:
          cells[9]?.includes("4G") || cells[9]?.includes("LTE") || false,
        Network_5G: cells[9]?.includes("5G") || false,
        Shelter_Type: cells[5]?.includes("Shelter") ? "Shelter" : "Outdoor",
        Vendor: vendor,
        Installation_Date: new Date().toISOString().split("T")[0],
      });
    }

    // Add locations with region mapping - NORMALIZE TO UPPERCASE
    const fromRegionRaw = cells[REGION_FROM_IDX]?.trim() || "CENTRAL";
    const toRegionRaw = cells[REGION_TO_IDX]?.trim() || "CENTRAL";

    // Normalize to uppercase for consistent filtering
    const fromRegion = fromRegionRaw.toUpperCase();
    const toRegion = toRegionRaw.toUpperCase();

    // Debug: Log first few region values
    if (i <= 3) {
      console.log(
        `Row ${i}: fromRegion="${fromRegion}", toRegion="${toRegion}"`,
      );
    }

    // Normalize warehouse names to unify duplicates
    const normalizedFromLoc = normalizeWarehouseName(fromLoc);
    const fromLocId = `LOC-${normalizedFromLoc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    if (!locationMap.has(fromLocId)) {
      const isWarehouse = normalizedFromLoc.toUpperCase().includes("WH");
      locationMap.set(fromLocId, {
        Location_ID: fromLocId,
        Location_Name: normalizedFromLoc,
        Sub_Location: cells[17]?.trim() || "",
        Latitude: parseFloat(cells[FROM_LAT_IDX]?.trim() || "0") || 0,
        Longitude: parseFloat(cells[FROM_LNG_IDX]?.trim() || "0") || 0,
        Region: fromRegion,
        Location_Type: isWarehouse ? "Warehouse" : "Site",
        Owner: vendor,
      });
    }

    // Normalize warehouse names to unify duplicates
    const normalizedToLoc = normalizeWarehouseName(toLoc);
    const toLocId = `LOC-${normalizedToLoc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    if (!locationMap.has(toLocId)) {
      const isWarehouse = normalizedToLoc.toUpperCase().includes("WH");
      locationMap.set(toLocId, {
        Location_ID: toLocId,
        Location_Name: normalizedToLoc,
        Sub_Location: cells[21]?.trim() || "",
        Latitude: parseFloat(cells[TO_LAT_IDX]?.trim() || "0") || 0,
        Longitude: parseFloat(cells[TO_LNG_IDX]?.trim() || "0") || 0,
        Region: toRegion,
        Location_Type: isWarehouse ? "Warehouse" : "Site",
        Owner: vendor,
      });
    }
  }

  console.log(`✓ Loaded ${movements.length} movements, ${cowMap.size} cows`);

  return {
    movements,
    cows: Array.from(cowMap.values()),
    locations: Array.from(locationMap.values()),
    events: [],
  };
}

/**
 * Parse never-moved cows data from Google Sheets
 */
function parseNeverMovedCows(csvText: string): any[] {
  const lines = csvText.trim().split("\n");

  if (lines.length < 2) {
    console.warn("⚠️  Never-Moved-COWs CSV has fewer than 2 lines");
    return [];
  }

  // Parse header
  const headerCells = parseCSVLine(lines[0]);
  console.log(`📋 Never-Moved-COWs - Found ${headerCells.length} columns`);

  // Auto-detect column indices
  const findIndex = (keywords: string[]): number => {
    const lower = headerCells.map((h) => h.toLowerCase());
    for (const keyword of keywords) {
      const idx = lower.findIndex((h) => h.includes(keyword));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const COW_ID_IDX = findIndex(["cow", "id"]) ?? 0;
  const REGION_IDX = findIndex(["region"]) ?? 3;
  const LOCATION_IDX = findIndex(["location"]) ?? 7;
  const LAT_IDX = findIndex(["latitude", "lat"]) ?? 8;
  const LNG_IDX = findIndex(["longitude", "lng"]) ?? 9;
  const STATUS_IDX = findIndex(["status", "onair"]) ?? 10;
  const FIRST_DEPLOY_IDX = findIndex(["first", "deploy"]) ?? 12;
  const VENDOR_IDX = findIndex(["vendor"]) ?? 13;

  const neverMovedCows: any[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);

    const cowId = cells[COW_ID_IDX]?.trim();
    if (!cowId) continue;

    const firstDeployDate = cells[FIRST_DEPLOY_IDX]?.trim() || "";

    // Calculate Days_On_Air
    let daysOnAir = 0;
    if (firstDeployDate) {
      try {
        const deployDate = new Date(firstDeployDate);
        const today = new Date();
        if (!isNaN(deployDate.getTime())) {
          daysOnAir = Math.floor(
            (today.getTime() - deployDate.getTime()) / (1000 * 60 * 60 * 24),
          );
        }
      } catch (e) {
        console.warn(`⚠️  Error calculating days for ${cowId}:`, e);
        daysOnAir = 0;
      }
    }

    const status = cells[STATUS_IDX]?.trim() || "OFF-AIR";
    const normalizedStatus =
      status.toUpperCase() === "ON-AIR" || status === "1"
        ? "ON-AIR"
        : "OFF-AIR";

    // Use parseDate helper for both fields
    const deployISO = parseDate(firstDeployDate);
    const datePart = deployISO.split("T")[0];

    neverMovedCows.push({
      COW_ID: cowId,
      Region: cells[REGION_IDX]?.trim() || "Unknown",
      District: cells[REGION_IDX]?.trim() || "Unknown",
      City: cells[REGION_IDX]?.trim() || "Unknown",
      Location: cells[LOCATION_IDX]?.trim() || "Unknown",
      Latitude: parseFloat(cells[LAT_IDX]?.trim() || "0") || 0,
      Longitude: parseFloat(cells[LNG_IDX]?.trim() || "0") || 0,
      Status: normalizedStatus,
      Last_Deploy_Date: datePart,
      First_Deploy_Date: datePart,
      Days_On_Air: daysOnAir,
      Vendor: cells[VENDOR_IDX]?.trim() || "Unknown",
    });
  }

  console.log(`✓ Loaded ${neverMovedCows.length} Never Moved COWs`);

  return neverMovedCows;
}

/**
 * Fetch movement data from Google Sheets
 */
export async function fetchMovementData(): Promise<DashboardDataResponse> {
  try {
    console.log("📥 Fetching Movement Data from Google Sheets...");

    const response = await fetch(MOVEMENT_DATA_CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const data = parseMovementData(csvText);

    return data;
  } catch (error) {
    console.error("❌ Failed to fetch movement data:", error);
    throw error;
  }
}

/**
 * Fetch never-moved cows data from Google Sheets
 */
export async function fetchNeverMovedCows(): Promise<any[]> {
  try {
    console.log("📥 Fetching Never Moved COWs from Google Sheets...");

    const response = await fetch(NEVER_MOVED_COWS_CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const data = parseNeverMovedCows(csvText);

    return data;
  } catch (error) {
    console.error("❌ Failed to fetch never moved cows:", error);
    throw error;
  }
}
