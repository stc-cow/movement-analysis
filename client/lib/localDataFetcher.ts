/**
 * Local JSON Data Fetcher
 * Loads movement and never-moved cow data from public JSON files
 * No API calls - all data served locally
 */

import { getRegionFromCoordinates } from "./coordinateRegionMapper";

interface DashboardDataResponse {
  movements: any[];
  cows: any[];
  locations: any[];
  events: any[];
}

/**
 * Canonical warehouse name mappings
 * Maps all variations to a single canonical name
 */
const WAREHOUSE_CANONICAL_MAP: Record<string, string> = {
  // STC Warehouses
  "stc jeddah wh": "stc Jeddah WH",
  "stc al ula wh": "stc Al Ula WH",
  "stc sharma wh": "stc Sharma WH",
  "stc madinah wh": "stc Madinah WH",
  "stc madina wh": "stc Madinah WH",
  "stc abha wh": "stc Abha WH",
  "stc al kharaj wh": "stc Al Kharaj WH",
  "stc jizan wh": "stc Jizan WH",
  "stc arar wh": "stc Arar WH",
  "stc umluj wh": "stc Umluj WH",
  "stc sakaka wh": "stc Sakaka WH",
  "stc tabouk wh": "stc Tabouk WH",
  "stc taboulk wh": "stc Tabouk WH",
  "stc buraidah wh": "stc Buraidah WH",
  "stc burida wh": "stc Buraidah WH",
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
};

/**
 * Normalize warehouse names to unify duplicates
 */
function normalizeWarehouseName(name: string): string {
  if (!name) return "";

  let normalized = name.trim().replace(/\s+/g, " ");
  const key = normalized.toLowerCase();

  if (WAREHOUSE_CANONICAL_MAP[key]) {
    return WAREHOUSE_CANONICAL_MAP[key];
  }

  return normalized;
}

/**
 * Safely parse date strings to ISO format
 */
function parseDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") {
    return "1900-01-01T00:00:00Z";
  }

  try {
    const trimmed = dateStr.trim();

    if (trimmed.includes("T")) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(trimmed + "T00:00:00Z");
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    if (trimmed.match(/^\d{1,2}\s+\w+\s+\d{4}/)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    if (trimmed.includes("/")) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    console.warn(`⚠️  Could not parse date: "${dateStr}"`);
    return "1900-01-01T00:00:00Z";
  } catch (e) {
    console.warn(`⚠️  Date parsing error for "${dateStr}":`, e);
    return "1900-01-01T00:00:00Z";
  }
}

/**
 * Transform raw movement data from CSV to structured format
 */
function transformMovementData(rawData: any[]): DashboardDataResponse {
  const movements: any[] = [];
  const cowMap = new Map();
  const locationMap = new Map();

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];

    const cowId = row.cows_id?.trim();
    if (!cowId) continue;

    const fromLoc = normalizeWarehouseName(
      row.from_location?.trim() || "Unknown",
    );
    const toLoc = normalizeWarehouseName(row.to_location?.trim() || "Unknown");

    // Parse region and governorate
    // If region_from/region_to not in CSV, determine from coordinates
    let regionFrom = row.region_from?.trim()?.toUpperCase();
    let regionTo = row.region_to?.trim()?.toUpperCase();

    const fromLat = parseFloat(row.from_latitude || "0");
    const fromLon = parseFloat(row.from_longitude || "0");
    const toLat = parseFloat(row.to_latitude || "0");
    const toLon = parseFloat(row.to_longitude || "0");

    // If region not in CSV, determine from coordinates
    if (!regionFrom || regionFrom.trim() === "") {
      regionFrom = getRegionFromCoordinates(fromLat, fromLon);
    }
    if (!regionTo || regionTo.trim() === "") {
      regionTo = getRegionFromCoordinates(toLat, toLon);
    }

    const governorate = row.goverment?.trim() || undefined;

    // Determine EBU/Royal classification
    let category = "NON EBU";
    let isRoyal = false;
    let isEBU = false;

    const ebuFlag = row.ebu_royal?.trim()?.toUpperCase() || "NON EBU";
    if (ebuFlag === "ROYAL") {
      category = "ROYAL";
      isRoyal = true;
    } else if (ebuFlag === "EBU") {
      category = "EBU";
      isEBU = true;
    }

    // Parse Movement_Type from CSV, or leave undefined for enrichMovements to calculate
    let movementType: "Full" | "Half" | "Zero" | undefined = undefined;
    const rawMovementType = row.movement_type?.trim()?.toUpperCase() || "";

    if (rawMovementType.includes("FULL")) {
      movementType = "Full";
    } else if (rawMovementType.includes("HALF")) {
      movementType = "Half";
    } else if (rawMovementType.includes("ZERO") || rawMovementType === "0") {
      movementType = "Zero";
    }
    // If movement_type is not recognized, leave undefined and let enrichMovements calculate it

    const movement = {
      SN: i + 1,
      COW_ID: cowId,
      From_Location_ID: `LOC-${fromLoc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      From_Sub_Location: row.from_sub_location?.trim() || undefined,
      To_Location_ID: `LOC-${toLoc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      To_Sub_Location: row.to_sub_location?.trim() || undefined,
      Moved_DateTime: parseDate(row.moved_date_time),
      Reached_DateTime: parseDate(row.reached_date_time),
      Movement_Type: movementType,
      Top_Event: row.top_events?.trim() || undefined,
      Distance_KM: parseFloat(row.distance || "0") || 0,
      Is_Royal: isRoyal,
      Is_EBU: isEBU,
      EbuRoyalCategory: category,
      Vendor: row.vendor?.trim() || "Unknown",
      Governorate: row.goverment?.trim() || undefined,
    };

    movements.push(movement);

    // Add COW record
    if (!cowMap.has(cowId)) {
      cowMap.set(cowId, {
        COW_ID: cowId,
        Tower_Type: row.tower_type?.includes("Small")
          ? "Small Cell"
          : row.tower_type?.includes("Micro")
            ? "Micro Cell"
            : "Macro",
        Tower_Height: parseFloat(row.tower_hieght || "0") || 0,
        Network_2G: row["2g_4g_lte_5g"]?.includes("2G") || false,
        Network_4G:
          row["2g_4g_lte_5g"]?.includes("4G") ||
          row["2g_4g_lte_5g"]?.includes("LTE") ||
          false,
        Network_5G: row["2g_4g_lte_5g"]?.includes("5G") || false,
        Shelter_Type: row.shelter_outdoor?.includes("Shelter")
          ? "Shelter"
          : "Outdoor",
        Vendor: row.vehicle_make?.trim() || "Unknown",
        Installation_Date: new Date().toISOString().split("T")[0],
      });
    }

    // Add location records - handle from_location
    const normalizedFromLoc = normalizeWarehouseName(fromLoc);
    const fromLocId = `LOC-${normalizedFromLoc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    if (!locationMap.has(fromLocId)) {
      const isWarehouse = normalizedFromLoc.toUpperCase().includes("WH");
      // Determine region: use explicit region or infer from coordinates
      let finalRegionFrom = regionFrom;
      if (!finalRegionFrom || finalRegionFrom === "CENTRAL") {
        finalRegionFrom = getRegionFromCoordinates(fromLat, fromLon);
      }
      locationMap.set(fromLocId, {
        Location_ID: fromLocId,
        Location_Name: normalizedFromLoc,
        Sub_Location: row.from_sub_location?.trim() || "",
        Latitude: fromLat || 0,
        Longitude: fromLon || 0,
        Region: finalRegionFrom,
        Governorate: governorate,
        Location_Type: isWarehouse ? "Warehouse" : "Site",
        Owner: row.vehicle_make?.trim() || "Unknown",
      });
    } else {
      // Update region if we have better data from regionFrom
      const existing = locationMap.get(fromLocId);
      if (existing && regionFrom && regionFrom !== "CENTRAL") {
        existing.Region = regionFrom;
      }
    }

    // Add location records - handle to_location
    const normalizedToLoc = normalizeWarehouseName(toLoc);
    const toLocId = `LOC-${normalizedToLoc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    if (!locationMap.has(toLocId)) {
      const isWarehouse = normalizedToLoc.toUpperCase().includes("WH");
      // Determine region: use explicit region or infer from coordinates
      let finalRegionTo = regionTo;
      if (!finalRegionTo || finalRegionTo === "CENTRAL") {
        finalRegionTo = getRegionFromCoordinates(toLat, toLon);
      }
      locationMap.set(toLocId, {
        Location_ID: toLocId,
        Location_Name: normalizedToLoc,
        Sub_Location: row.to_sub_location?.trim() || "",
        Latitude: toLat || 0,
        Longitude: toLon || 0,
        Region: finalRegionTo,
        Governorate: governorate,
        Location_Type: isWarehouse ? "Warehouse" : "Site",
        Owner: row.vehicle_make?.trim() || "Unknown",
      });
    } else {
      // Update region if we have better data from regionTo
      const existing = locationMap.get(toLocId);
      if (existing && regionTo && regionTo !== "CENTRAL") {
        existing.Region = regionTo;
      }
    }
  }

  console.log(
    `✓ Transformed ${movements.length} movements, ${cowMap.size} cows, ${locationMap.size} locations`,
  );

  return {
    movements,
    cows: Array.from(cowMap.values()),
    locations: Array.from(locationMap.values()),
    events: [],
  };
}

/**
 * Transform never-moved cow data
 */
function transformNeverMovedCows(rawData: any[]): any[] {
  const neverMovedCows: any[] = [];

  for (const row of rawData) {
    const cowId = row.cow_id?.trim();
    if (!cowId) continue;

    const firstDeployDate = row["1st_deploying_date"]?.trim() || "";

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
      }
    }

    const status = row.site_status?.trim() || "OFF-AIR";
    const normalizedStatus =
      status.toUpperCase() === "ON-AIR" || status === "1"
        ? "ON-AIR"
        : "OFF-AIR";

    const deployISO = parseDate(firstDeployDate);
    const datePart = deployISO.split("T")[0];

    neverMovedCows.push({
      COW_ID: cowId,
      Region: row.region?.trim() || "Unknown",
      District: row.district?.trim() || "Unknown",
      City: row.city?.trim() || "Unknown",
      Location: row.location?.trim() || "Unknown",
      Latitude: parseFloat(row.latitude || "0") || 0,
      Longitude: parseFloat(row.longitude || "0") || 0,
      Status: normalizedStatus,
      Last_Deploy_Date: datePart,
      First_Deploy_Date: datePart,
      Days_On_Air: daysOnAir,
      Vendor: row.vendor?.trim() || "Unknown",
    });
  }

  console.log(`✓ Transformed ${neverMovedCows.length} never-moved cows`);

  return neverMovedCows;
}

/**
 * Load movement data from local JSON file
 * Uses BASE_URL to support subpath deployments (GitHub Pages, Builder export)
 */
export async function loadMovementData(): Promise<DashboardDataResponse> {
  try {
    console.log("📥 Loading Movement Data from local JSON...");

    // Use BASE_URL for dynamic path resolution based on deployment
    // In dev: BASE_URL is '/' (root)
    // On GitHub Pages: BASE_URL is '/repo-name/'
    // On Builder: BASE_URL is configured by the platform
    const base = import.meta.env.BASE_URL || "./";
    const url = `${base}movement-data.json`;

    console.log(`📍 Fetching from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: Failed to load movement data from ${url}`,
      );
    }

    const rawData = await response.json();
    const data = transformMovementData(rawData);

    console.log(`✅ Loaded ${data.movements.length} movements from local JSON`);
    return data;
  } catch (error) {
    console.error("❌ Failed to load movement data:", error);
    throw error;
  }
}

/**
 * Load never-moved cows data from local JSON file
 * Uses BASE_URL to support subpath deployments (GitHub Pages, Builder export)
 */
export async function loadNeverMovedCows(): Promise<any[]> {
  try {
    console.log("📥 Loading Never Moved COWs from local JSON...");

    // Use BASE_URL for dynamic path resolution based on deployment
    // In dev: BASE_URL is '/' (root)
    // On GitHub Pages: BASE_URL is '/repo-name/'
    // On Builder: BASE_URL is configured by the platform
    const base = import.meta.env.BASE_URL || "./";
    const url = `${base}never-moved-cows.json`;

    console.log(`📍 Fetching from: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: Failed to load never-moved cows from ${url}`,
      );
    }

    const rawData = await response.json();
    const data = transformNeverMovedCows(rawData);

    console.log(`✅ Loaded ${data.length} never-moved cows from local JSON`);
    return data;
  } catch (error) {
    console.error("❌ Failed to load never-moved cows:", error);
    throw error;
  }
}
