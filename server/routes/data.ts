import { Router, Request, Response } from "express";
import { RequestHandler } from "express";

const router = Router();

/**
 * Simple in-memory cache with TTL to prevent repeated Google Sheets fetches
 * This reduces load on Netlify serverless functions and improves response times
 */
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // TTL in milliseconds
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

// Fetch timeout configuration (in milliseconds)
const FETCH_TIMEOUT = 20000; // 20 seconds - safe for Netlify 30s limit
const CACHE_TTL = 300; // 5 minutes cache for data endpoints

// Google Sheet Configuration
// Using a single published CSV URL for simplified integration
// This URL contains the "Movement-data" sheet (GID 1464106304)

const MOVEMENT_DATA_CSV_URL =
  process.env.MOVEMENT_DATA_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv";

// Alternative published CSV URL for "dashboard" sheet (Never Moved COWs)
// If the above URL doesn't contain dashboard data, use this for never-moved-cows endpoint
const NEVER_MOVED_COW_CSV_URL =
  process.env.NEVER_MOVED_COW_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv";

/**
 * Helper function to parse CSV from Google Sheets
 */
function parseCSVData(csvText: string) {
  const lines = csvText.trim().split("\n");

  console.log(`📊 CSV has ${lines.length} total lines`);

  if (lines.length < 2) {
    console.warn("⚠️  CSV has fewer than 2 lines (header + data)");
    return [];
  }

  // Parse header row
  const headerLine = lines[0];
  const headerCells = parseCSVLine(headerLine);
  console.log(`📋 Header row has ${headerCells.length} columns:`, headerCells.slice(0, 10).join(" | "));

  // Detect column structure based on header names and first data row
  const firstDataLine = lines[1];
  const firstDataCells = parseCSVLine(firstDataLine);

  console.log(`📊 First data row has ${firstDataCells.length} cells (sample: "${firstDataCells[0]}", "${firstDataCells[1] || ''}", "${firstDataCells[2] || ''}")`);

  // Try to detect column positions by looking for key column names
  const headerLower = headerCells.map(h => h.toLowerCase());
  let fromLocationIdx = headerLower.findIndex(h => h.includes("from") && h.includes("location"));
  let toLocationIdx = headerLower.findIndex(h => h.includes("to") && h.includes("location"));
  let cowIdIdx = headerLower.findIndex(h => h.includes("cow") || h.includes("id"));

  // Fallback to standard positions if not found in headers
  if (fromLocationIdx < 0) fromLocationIdx = 16; // Standard: Q
  if (toLocationIdx < 0) toLocationIdx = 20;    // Standard: U
  if (cowIdIdx < 0) cowIdIdx = 0;               // Standard: A

  const hasHeaderRow = headerCells.some(h => h.toLowerCase().includes("location"));

  console.log(`🔍 Column detection:`, {
    hasHeaderRow,
    fromLocationIdx,
    toLocationIdx,
    cowIdIdx,
    headerSample: headerCells.slice(0, 5),
  });

  const rows = [];
  let skippedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);

    // Skip completely empty rows
    if (cells.length === 0 || !cells[0]?.trim()) {
      skippedCount++;
      continue;
    }

    // Skip rows that are clearly headers or metadata (less strict than before)
    if (cells.length < 5) {
      console.warn(`⚠️  Skipping row ${i}: too few columns (${cells.length})`);
      skippedCount++;
      continue;
    }

    // Map columns by position using detected indices
    let row: any = {};

    // Always use the detected/fallback positions
    if (i === 1) {
      console.log(`📍 Row 1 sample (using indices: cow=${cowIdIdx}, from=${fromLocationIdx}, to=${toLocationIdx}):`, {
        cow_id: cells[cowIdIdx]?.trim(),
        from_location: cells[fromLocationIdx]?.trim(),
        to_location: cells[toLocationIdx]?.trim(),
      });
    }

    // Standard mapping for all rows
    if (true) {
      row = {
        cow_id: cells[cowIdIdx]?.trim() || "",
        from_location: cells[fromLocationIdx]?.trim() || "",
        to_location: cells[toLocationIdx]?.trim() || "",
        // Other fields
        site_label: cells[1]?.trim() || "",
        last_deploy_date: cells[2]?.trim() || cells[11]?.trim() || "",
        first_deploy_date: cells[3]?.trim() || cells[10]?.trim() || "",
        ebu_royal_flag: cells[4]?.trim() || cells[2]?.trim() || "",
        shelter_type: cells[5]?.trim() || cells[3]?.trim() || "",
        tower_type: cells[6]?.trim() || cells[4]?.trim() || "Macro",
        tower_system: cells[7]?.trim() || cells[5]?.trim() || "",
        tower_height: cells[8]?.trim() || cells[6]?.trim() || "0",
        network_technology: cells[9]?.trim() || cells[7]?.trim() || "",
        vehicle_make: cells[10]?.trim() || cells[8]?.trim() || "",
        vehicle_plate_number: cells[11]?.trim() || cells[9]?.trim() || "",
        moved_datetime: cells[12]?.trim() || cells[10]?.trim() || "",
        moved_month_year: cells[13]?.trim() || cells[11]?.trim() || "",
        reached_datetime: cells[14]?.trim() || cells[12]?.trim() || "",
        reached_month_year: cells[15]?.trim() || cells[13]?.trim() || "",
        from_sub_location: cells[17]?.trim() || cells[15]?.trim() || "",
        from_latitude: cells[18]?.trim() || cells[16]?.trim() || "0",
        from_longitude: cells[19]?.trim() || cells[17]?.trim() || "0",
        to_sub_location: cells[21]?.trim() || cells[19]?.trim() || "",
        to_latitude: cells[22]?.trim() || cells[20]?.trim() || "0",
        to_longitude: cells[23]?.trim() || cells[21]?.trim() || "0",
        distance_km: cells[24]?.trim() || cells[22]?.trim() || "0",
        movement_type: cells[25]?.trim() || cells[23]?.trim() || "Zero",
        region_from: cells[26]?.trim() || cells[24]?.trim() || "CENTRAL",
        region_to: cells[27]?.trim() || cells[25]?.trim() || "CENTRAL",
        vendor: cells[28]?.trim() || cells[26]?.trim() || "Unknown",
        installation_status: cells[29]?.trim() || cells[27]?.trim() || "",
        remarks: cells[30]?.trim() || cells[28]?.trim() || "",
      };
    }

    rows.push(row);
  }

  if (rows.length === 0 && skippedCount > 0) {
    console.warn(`⚠️  All ${skippedCount} data rows were skipped. Check column mapping.`);
  }

  console.log(`✓ Parsed ${rows.length} valid rows (${skippedCount} rows skipped)`);
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result = [];
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
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Helper function to normalize region
 */
function normalizeRegion(
  region: string,
): "WEST" | "EAST" | "CENTRAL" | "SOUTH" {
  const normalized = region?.toUpperCase().trim() || "";
  if (
    normalized.includes("WEST") ||
    normalized.includes("MAKKAH") ||
    normalized.includes("MEDINA")
  )
    return "WEST";
  if (
    normalized.includes("EAST") ||
    normalized.includes("EASTERN") ||
    normalized.includes("DAMMAM")
  )
    return "EAST";
  if (normalized.includes("CENTRAL") || normalized.includes("RIYADH"))
    return "CENTRAL";
  if (normalized.includes("SOUTH") || normalized.includes("ASIR"))
    return "SOUTH";
  // Map NORTH/HAIL to WEST (Western region)
  if (normalized.includes("NORTH") || normalized.includes("HAIL"))
    return "WEST";
  return "CENTRAL";
}

/**
 * Classify Royal/EBU/NON EBU from column E
 * Three mutually exclusive categories:
 * - "ROYAL": exact match "Royal"
 * - "EBU": exact match "EBU"
 * - "NON EBU": exact match "NON EBU" or empty
 */
function classifyEbuRoyal(flag: string | undefined): {
  isRoyal: boolean;
  isEBU: boolean;
  category: "ROYAL" | "EBU" | "NON EBU";
} {
  if (!flag || flag.trim() === "") {
    return { isRoyal: false, isEBU: false, category: "NON EBU" };
  }

  const normalized = flag.trim();

  // Check for exact matches (case-insensitive)
  if (normalized.toLowerCase() === "royal") {
    return { isRoyal: true, isEBU: false, category: "ROYAL" };
  } else if (normalized.toLowerCase() === "ebu") {
    return { isRoyal: false, isEBU: true, category: "EBU" };
  } else if (
    normalized.toLowerCase() === "non ebu" ||
    normalized.toLowerCase() === "non-ebu"
  ) {
    return { isRoyal: false, isEBU: false, category: "NON EBU" };
  } else {
    // Anything else defaults to NON EBU
    return { isRoyal: false, isEBU: false, category: "NON EBU" };
  }
}

/**
 * Process CSV data into structured format
 * Uses the standardized column mapping: A-AE with snake_case field names
 */
function processData(rows: any[]) {
  const movements = [];
  const cowMap = new Map();
  const locationMap = new Map();
  let skippedCount = 0;

  console.log(`\n🔄 Processing ${rows.length} parsed rows...`);
  if (rows.length > 0) {
    console.log(`📍 First row sample:`, {
      cow_id: rows[0].cow_id,
      from_location: rows[0].from_location,
      to_location: rows[0].to_location,
      movement_type: rows[0].movement_type,
      distance_km: rows[0].distance_km,
    });
  }

  rows.forEach((row, idx) => {
    // Skip invalid rows - but log why
    const hasCowId = row.cow_id && row.cow_id.toString().trim().length > 0;
    const hasFromLocation = row.from_location && row.from_location.toString().trim().length > 0;
    const hasToLocation = row.to_location && row.to_location.toString().trim().length > 0;

    if (!hasCowId || !hasFromLocation || !hasToLocation) {
      if (idx < 3) {
        // Log first 3 skipped rows for debugging
        console.warn(`⚠️  Skipping row ${idx}:`, {
          has_cow_id: hasCowId,
          has_from_location: hasFromLocation,
          has_to_location: hasToLocation,
          values: {
            cow_id: rows[idx].cow_id,
            from_location: rows[idx].from_location,
            to_location: rows[idx].to_location,
          },
        });
      }
      skippedCount++;
      return;
    }

    // Safely parse dates - use current date if invalid
    const parseDate = (dateStr: string): string => {
      if (!dateStr || dateStr.trim() === "") {
        return new Date().toISOString();
      }
      try {
        const date = new Date(dateStr);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return new Date().toISOString();
        }
        return date.toISOString();
      } catch (e) {
        return new Date().toISOString();
      }
    };

    // Parse Royal/EBU classification from column E (ebu_royal_flag)
    const { isRoyal, isEBU, category } = classifyEbuRoyal(row.ebu_royal_flag);

    // Add movement with standard field names
    movements.push({
      SN: idx + 1,
      COW_ID: row.cow_id,
      From_Location_ID: `LOC-${row.from_location.replace(/\s+/g, "-").substring(0, 20)}`,
      From_Sub_Location: row.from_sub_location || undefined,
      To_Location_ID: `LOC-${row.to_location.replace(/\s+/g, "-").substring(0, 20)}`,
      To_Sub_Location: row.to_sub_location || undefined,
      Moved_DateTime: parseDate(row.moved_datetime),
      Reached_DateTime: parseDate(row.reached_datetime),
      Movement_Type: row.movement_type?.includes("Full")
        ? "Full"
        : row.movement_type?.includes("Half")
          ? "Half"
          : "Zero",
      Distance_KM: parseFloat(row.distance_km) || 0,
      Is_Royal: isRoyal,
      Is_EBU: isEBU,
      EbuRoyalCategory: category,
    });

    // Add cow with asset information
    if (!cowMap.has(row.cow_id)) {
      cowMap.set(row.cow_id, {
        COW_ID: row.cow_id,
        Tower_Type: row.tower_type?.includes("Small")
          ? "Small Cell"
          : row.tower_type?.includes("Micro")
            ? "Micro Cell"
            : "Macro",
        Tower_Height: parseFloat(row.tower_height) || 0,
        Network_2G: row.network_technology?.includes("2G") || false,
        Network_4G:
          row.network_technology?.includes("4G") ||
          row.network_technology?.includes("LTE") ||
          false,
        Network_5G: row.network_technology?.includes("5G") || false,
        Shelter_Type: row.shelter_type?.includes("Shelter")
          ? "Shelter"
          : "Outdoor",
        Vendor: row.vendor || "Unknown",
        Installation_Date:
          row.first_deploy_date || new Date().toISOString().split("T")[0],
        Last_Deploy_Date:
          row.last_deploy_date || new Date().toISOString().split("T")[0],
        First_Deploy_Date:
          row.first_deploy_date || new Date().toISOString().split("T")[0],
        Remarks: row.remarks || "",
      });
    }

    // Add from location
    const fromId = `LOC-${row.from_location.replace(/\s+/g, "-").substring(0, 20)}`;
    if (!locationMap.has(fromId)) {
      locationMap.set(fromId, {
        Location_ID: fromId,
        Location_Name: row.from_location,
        Sub_Location: row.from_sub_location || "",
        Latitude: parseFloat(row.from_latitude) || 0,
        Longitude: parseFloat(row.from_longitude) || 0,
        Region: normalizeRegion(row.region_from),
        Location_Type: "Site",
        Owner: row.vendor || "STC",
      });
    }

    // Add to location
    const toId = `LOC-${row.to_location.replace(/\s+/g, "-").substring(0, 20)}`;
    if (!locationMap.has(toId)) {
      locationMap.set(toId, {
        Location_ID: toId,
        Location_Name: row.to_location,
        Sub_Location: row.to_sub_location || "",
        Latitude: parseFloat(row.to_latitude) || 0,
        Longitude: parseFloat(row.to_longitude) || 0,
        Region: normalizeRegion(row.region_to),
        Location_Type: "Site",
        Owner: row.vendor || "STC",
      });
    }
  });

  console.log(`📊 Processing complete:`);
  console.log(`   Total input rows: ${rows.length}`);
  console.log(`   Valid movements: ${movements.length}`);
  console.log(`   Skipped (invalid): ${skippedCount}`);
  console.log(`   Unique COWs: ${cowMap.size}`);
  console.log(`   Unique locations: ${locationMap.size}`);

  return {
    movements: movements.sort(
      (a: any, b: any) =>
        new Date(a.Moved_DateTime).getTime() -
        new Date(b.Moved_DateTime).getTime(),
    ),
    cows: Array.from(cowMap.values()),
    locations: Array.from(locationMap.values()),
    events: [],
  };
}

/**
 * Fetch and process data from Google Sheets
 */
const processedDataHandler: RequestHandler = async (req, res) => {
  try {
    // Check cache first - reduces load on Google Sheets API
    const cacheKey = "processed-data";
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      console.log(`✓ Serving cached data for processed-data`);
      return res.json(cachedData);
    }

    let csvData: string | null = null;
    let fetchError: Error | null = null;

    try {
      console.log(`📥 Fetching Movement-data from published CSV...`);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const response = await fetch(MOVEMENT_DATA_CSV_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        csvData = await response.text();
        console.log(
          `✓ Successfully fetched CSV data (${csvData.length} bytes)`,
        );
      } else {
        fetchError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        console.error(`✗ Failed to fetch CSV: ${response.status}`);
      }
    } catch (e) {
      fetchError = e instanceof Error ? e : new Error(String(e));
      if (fetchError.message.includes("abort")) {
        console.warn(`⏱️  CSV fetch timed out (${FETCH_TIMEOUT}ms)`);
      } else {
        console.warn(`✗ CSV fetch failed: ${fetchError.message}`);
      }
    }

    if (!csvData) {
      const errorMsg = `Failed to fetch Movement-data CSV: ${fetchError?.message || "Unknown error"}`;
      console.error("\n❌ MOVEMENT DATA FETCH ERROR:");
      console.error(`   CSV URL: ${MOVEMENT_DATA_CSV_URL}`);
      console.error(`   Error: ${fetchError?.message}`);
      console.error("\n📋 TROUBLESHOOTING:");
      console.error("   1. Verify the Google Sheet is published to the web");
      console.error("   2. Check that the CSV URL is accessible in a browser");
      console.error("   3. Ensure the sheet contains data in the expected columns");
      console.error("   4. If you see 'CSV_URLS is not defined', clear Netlify cache and redeploy");
      console.error("");
      throw new Error(errorMsg);
    }

    // Validate CSV data
    if (csvData.length === 0) {
      throw new Error("CSV data is empty");
    }

    if (csvData.length < 10) {
      console.warn(`⚠️  CSV data is very small (${csvData.length} bytes) - may be incomplete`);
    }

    const rows = parseCSVData(csvData);

    if (rows.length === 0) {
      console.error("\n❌ NO DATA ROWS FOUND:");
      console.error(`   CSV received: ${csvData.length} bytes`);
      console.error(`   CSV line count: ${csvData.split("\n").length}`);
      console.error(`   First 200 chars: ${csvData.substring(0, 200)}`);
      console.error("");
      console.error("📋 POSSIBLE CAUSES:");
      console.error("   1. CSV is empty or contains only headers");
      console.error("   2. Column structure doesn't match expected format");
      console.error("   3. All rows were filtered out as invalid");
      console.error("");
      throw new Error("No data rows found in Google Sheet - CSV may be empty or incorrectly formatted");
    }

    console.log(`✓ Parsed ${rows.length} data rows from CSV`);

    const processedData = processData(rows);

    // Detailed diagnostic logging
    if (processedData.movements.length === 0) {
      console.warn("\n⚠️  WARNING: No movements extracted from rows!");
      console.warn(`   Total rows parsed: ${rows.length}`);
      console.warn(
        `   First row keys: ${rows.length > 0 ? Object.keys(rows[0]).join(", ") : "N/A"}`,
      );
      console.warn(
        `   First row values: ${rows.length > 0 ? JSON.stringify(rows[0]) : "N/A"}`,
      );

      // Check for data in specific fields
      const hasCowIds = rows.some((r: any) => r.cow_id?.trim());
      const hasFromLocations = rows.some((r: any) => r.from_location?.trim());
      const hasToLocations = rows.some((r: any) => r.to_location?.trim());

      console.warn(`   Has cow_id: ${hasCowIds}`);
      console.warn(`   Has from_location: ${hasFromLocations}`);
      console.warn(`   Has to_location: ${hasToLocations}`);
      console.warn(
        `\n   This usually means the column mapping doesn't match the Google Sheet structure.`,
      );
      console.warn(
        `   Check that the sheet has data in columns Q (from_location), U (to_location), etc.`,
      );
    }

    // Calculate EBU/Royal/NON EBU statistics (three mutually exclusive categories)
    const royalCount = processedData.movements.filter(
      (m) => m.EbuRoyalCategory === "ROYAL",
    ).length;
    const ebuCount = processedData.movements.filter(
      (m) => m.EbuRoyalCategory === "EBU",
    ).length;
    const nonEbuCount = processedData.movements.filter(
      (m) => m.EbuRoyalCategory === "NON EBU",
    ).length;

    console.log(
      `✓ Processed ${processedData.movements.length} movements, ${processedData.cows.length} cows, ${processedData.locations.length} locations`,
    );
    console.log(
      `  ├─ ROYAL movements: ${royalCount} (${((royalCount / processedData.movements.length) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  ├─ EBU movements: ${ebuCount} (${((ebuCount / processedData.movements.length) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  └─ NON EBU movements: ${nonEbuCount} (${((nonEbuCount / processedData.movements.length) * 100).toFixed(1)}%)`,
    );

    if (processedData.movements.length === 0) {
      throw new Error(
        "No movement data found in Google Sheet - column mapping may be incorrect",
      );
    }

    // Cache the result to reduce API calls on Netlify
    setCached(cacheKey, processedData, CACHE_TTL);

    res.json(processedData);
  } catch (error) {
    console.error("Error processing Google Sheet data:", error);
    res.status(500).json({
      error: "Failed to fetch data from Google Sheets",
      details: error instanceof Error ? error.message : "Unknown error",
      hint: "Please ensure the Google Sheet is published to the web and the URL is correct.",
    });
  }
};

/**
 * Handler to fetch "Never Moved COW" data from published Dashboard sheet CSV
 * Data source: Google Sheet "Dashboard" sheet (published to web as CSV)
 * Dashboard GID: 1464106304
 * Column mapping (from screenshot):
 * A: COW ID
 * B: Region
 * C: District
 * D: City
 * E: Location
 * F: Latitude
 * G: Longitude
 * H: Status
 * I: Last Deploying Date
 * J: First Deploying Date
 */
const neverMovedCowHandler: RequestHandler = async (req, res) => {
  try {
    // Check cache first
    const cacheKey = "never-moved-cows";
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      console.log(`✓ Serving cached data for never-moved-cows`);
      return res.json(cachedData);
    }

    console.log(`📡 Fetching Never Moved COWs from Dashboard sheet CSV...`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(NEVER_MOVED_COW_CSV_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch Dashboard CSV`);
    }

    const csvText = await response.text();
    const lines = csvText.trim().split("\n");

    if (lines.length < 2) {
      throw new Error("No data found in Dashboard CSV");
    }

    const neverMovedCows: any[] = [];

    // Parse CSV (skip header row)
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);

      // Skip empty rows
      if (!cells[0]?.trim()) continue;

      // Column mapping from Dashboard sheet:
      const cowId = cells[0]?.trim() || ""; // A: COW ID
      const region = cells[1]?.trim() || ""; // B: Region
      const district = cells[2]?.trim() || ""; // C: District
      const city = cells[3]?.trim() || ""; // D: City
      const location = cells[4]?.trim() || ""; // E: Location
      const latitude = parseFloat(cells[5]?.trim() || "0"); // F: Latitude
      const longitude = parseFloat(cells[6]?.trim() || "0"); // G: Longitude
      const status = (cells[7]?.trim() || "OFF-AIR").toUpperCase(); // H: Status
      const lastDeployDate = cells[8]?.trim() || ""; // I: Last Deploying Date
      const firstDeployDate = cells[9]?.trim() || ""; // J: First Deploying Date

      // Skip rows with missing critical fields
      if (!cowId || latitude === 0 || longitude === 0) continue;

      // Calculate days on air (from initial deployment date)
      let daysOnAir = 0;
      if (firstDeployDate) {
        try {
          const deployDate = new Date(firstDeployDate);
          const today = new Date();
          daysOnAir = Math.floor(
            (today.getTime() - deployDate.getTime()) / (1000 * 60 * 60 * 24),
          );
        } catch (e) {
          daysOnAir = 0;
        }
      }

      neverMovedCows.push({
        COW_ID: cowId,
        Region: region,
        District: district,
        City: city,
        Location: location,
        Latitude: latitude,
        Longitude: longitude,
        Status: status === "ON-AIR" ? "ON-AIR" : "OFF-AIR",
        Last_Deploy_Date: lastDeployDate,
        First_Deploy_Date: firstDeployDate,
        Days_On_Air: daysOnAir,
      });
    }

    console.log(
      `✓ Fetched ${neverMovedCows.length} Never Moved COWs from Dashboard sheet`,
    );

    const stats = {
      total: neverMovedCows.length,
      onAir: neverMovedCows.filter((c) => c.Status === "ON-AIR").length,
      offAir: neverMovedCows.filter((c) => c.Status === "OFF-AIR").length,
    };

    console.log(`  ├─ ON-AIR: ${stats.onAir}, OFF-AIR: ${stats.offAir}`);

    const responseData = {
      cows: neverMovedCows,
      stats,
      source: "Dashboard Sheet (CSV)",
    };

    // Cache the result
    setCached(cacheKey, responseData, CACHE_TTL);

    res.json(responseData);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Check if it's a timeout error
    const isTimeout =
      errorMsg.includes("abort") ||
      errorMsg.includes("timeout") ||
      errorMsg.includes("timed out");

    if (isTimeout) {
      console.warn(
        `⏱️  Timeout fetching Never Moved COW data (${FETCH_TIMEOUT}ms)`,
      );
    } else {
      console.error("Error fetching Never Moved COW data:", errorMsg);
    }

    res.status(502).json({
      error: "Failed to fetch Never Moved COW data",
      details: errorMsg,
      hint: "The data service is temporarily unavailable. Try again in a moment.",
      csvUrl:
        process.env.NEVER_MOVED_COW_CSV_URL ||
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv",
    });
  }
};

/**
 * Diagnostic endpoint to test Google Sheets CSV connectivity
 */
const diagnosticHandler: RequestHandler = async (req, res) => {
  const diagnostics = {
    urls: {
      movement_data: MOVEMENT_DATA_CSV_URL,
      never_moved_cows: NEVER_MOVED_COW_CSV_URL,
    },
    urlsAttempted: [] as {
      endpoint: string;
      url: string;
      status: number | string;
      success: boolean;
    }[],
    recommendations: [] as string[],
  };

  // Test Movement Data CSV
  try {
    const response = await fetch(MOVEMENT_DATA_CSV_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    diagnostics.urlsAttempted.push({
      endpoint: "movement_data",
      url: MOVEMENT_DATA_CSV_URL,
      status: response.status,
      success: response.ok,
    });

    if (response.ok) {
      diagnostics.recommendations.push(
        "✓ Movement-data CSV is accessible and working.",
      );
    } else {
      diagnostics.recommendations.push(
        `✗ Movement-data CSV returned HTTP ${response.status}. Check if the sheet is published.`,
      );
    }
  } catch (error) {
    diagnostics.urlsAttempted.push({
      endpoint: "movement_data",
      url: MOVEMENT_DATA_CSV_URL,
      status: error instanceof Error ? error.message : "Network error",
      success: false,
    });
    diagnostics.recommendations.push(
      `✗ Failed to fetch movement-data CSV: ${error instanceof Error ? error.message : "Network error"}`,
    );
  }

  // Test Never Moved COWs CSV
  try {
    const response = await fetch(NEVER_MOVED_COW_CSV_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    diagnostics.urlsAttempted.push({
      endpoint: "never_moved_cows",
      url: NEVER_MOVED_COW_CSV_URL,
      status: response.status,
      success: response.ok,
    });

    if (response.ok) {
      diagnostics.recommendations.push(
        "✓ Never-moved-cows CSV is accessible and working.",
      );
    } else {
      diagnostics.recommendations.push(
        `✗ Never-moved-cows CSV returned HTTP ${response.status}. Check if the sheet is published.`,
      );
    }
  } catch (error) {
    diagnostics.urlsAttempted.push({
      endpoint: "never_moved_cows",
      url: NEVER_MOVED_COW_CSV_URL,
      status: error instanceof Error ? error.message : "Network error",
      success: false,
    });
    diagnostics.recommendations.push(
      `✗ Failed to fetch never-moved-cows CSV: ${error instanceof Error ? error.message : "Network error"}`,
    );
  }

  if (diagnostics.urlsAttempted.every((u) => !u.success)) {
    diagnostics.recommendations.push("");
    diagnostics.recommendations.push("TROUBLESHOOTING:");
    diagnostics.recommendations.push(
      "1. Ensure the Google Sheet is published to the web (File → Share → Publish to web)",
    );
    diagnostics.recommendations.push(
      "2. Set the correct CSV URL in environment variables:",
    );
    diagnostics.recommendations.push(
      "   - MOVEMENT_DATA_CSV_URL for main dashboard data",
    );
    diagnostics.recommendations.push(
      "   - NEVER_MOVED_COW_CSV_URL for never-moved-cows data",
    );
  }

  res.json(diagnostics);
};

router.get("/processed-data", processedDataHandler);
router.get("/never-moved-cows", neverMovedCowHandler);
router.get("/diagnostic", diagnosticHandler);

export default router;
