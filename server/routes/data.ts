import { Router, Request, Response } from "express";
import { RequestHandler } from "express";

const router = Router();

/**
 * Simple in-memory cache with TTL to prevent repeated Google Sheets fetches
 * This reduces API calls and improves response times
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
const FETCH_TIMEOUT = 20000; // 20 seconds - safe timeout for API requests
const CACHE_TTL = 300; // 5 minutes cache for data endpoints

// Google Sheet Configuration - Published CSV URL (Single Sheet)
const MOVEMENT_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1539310010&single=true&output=csv";

/**
 * ENHANCED CSV PARSER WITH DETAILED DEBUGGING
 * Shows exactly what columns are found and why rows are rejected
 */
function parseCSVData(csvText: string) {
  // Check for HTML error page
  if (
    csvText.includes("<html") ||
    csvText.includes("<HTML") ||
    csvText.includes("<!DOCTYPE")
  ) {
    console.error("❌ RECEIVED HTML INSTEAD OF CSV!");
    console.error("First 500 chars:", csvText.substring(0, 500));
    throw new Error(
      "Google Sheets returned HTML instead of CSV. Check if sheet is published.",
    );
  }

  const lines = csvText.trim().split("\n");

  console.log(`\n════════════════════════════════════════`);
  console.log(`📊 CSV PARSING STARTED`);
  console.log(`════════════════════════════════════════`);
  console.log(`Total lines: ${lines.length}`);
  console.log(`CSV size: ${csvText.length} bytes`);

  if (lines.length < 2) {
    console.warn("⚠️  CSV has fewer than 2 lines (header + data)");
    return [];
  }

  // Parse header
  const headerLine = lines[0];
  const headerCells = parseCSVLine(headerLine);
  console.log(`\n📋 HEADER ROW (${headerCells.length} columns):`);
  headerCells.forEach((col, idx) => {
    console.log(`   [${idx}] = "${col}"`);
  });

  // Show first 3 data rows in detail
  console.log(`\n📍 FIRST 3 DATA ROWS (ALL cells):`);
  for (let i = 1; i < Math.min(4, lines.length); i++) {
    const cells = parseCSVLine(lines[i]);
    console.log(`   Row ${i}: ${cells.length} cells`);
    cells.forEach((cell, idx) => {
      console.log(`      [${idx}] = "${cell}"`);
    });
  }

  // Map column headers to lowercase for matching
  const headerLower = headerCells.map((h, idx) => ({
    original: h,
    lower: h.toLowerCase().trim(),
    index: idx,
  }));

  // Column detection - try multiple variations
  console.log(`\n🔍 COLUMN DETECTION:`);

  // Find COW_ID column (might be labeled as "Cows ID", "Cow ID", "COW", etc.)
  const cowIdMatch = headerLower.find(
    (h) =>
      (h.lower.includes("cow") && h.lower.includes("id")) ||
      h.lower === "cow" ||
      h.lower === "cows id",
  );

  // Find From Location (might be "from_location", "From Location", "Origin", etc.)
  const fromLocationMatch = headerLower.find(
    (h) =>
      (h.lower.includes("from") && h.lower.includes("location")) ||
      h.lower === "origin" ||
      h.lower === "from",
  );

  // Find To Location
  const toLocationMatch = headerLower.find(
    (h) =>
      (h.lower.includes("to") && h.lower.includes("location")) ||
      h.lower === "destination" ||
      h.lower === "to",
  );

  // Log detection results
  console.log(
    `   COW ID: ${cowIdMatch ? `✓ [${cowIdMatch.index}] "${cowIdMatch.original}"` : `✗ NOT FOUND`}`,
  );
  console.log(
    `   FROM LOCATION: ${fromLocationMatch ? `✓ [${fromLocationMatch.index}] "${fromLocationMatch.original}"` : `✗ NOT FOUND`}`,
  );
  console.log(
    `   TO LOCATION: ${toLocationMatch ? `✓ [${toLocationMatch.index}] "${toLocationMatch.original}"` : `✗ NOT FOUND`}`,
  );

  // Use detected or fallback to positional indices
  // WAREHOUSE ANALYSIS MAPPING (Correct columns):
  // Column O (14): From Location (dispatch warehouse)
  // Column U (20): To Location (receiving location)
  // Column AA (26): Region From (dispatch region)
  // Column AB (27): Region To (receiving region)
  const cowIdIdx = cowIdMatch?.index ?? 0; // Usually column A
  const fromLocationIdx = fromLocationMatch?.index ?? 14; // Column O: From Location
  const toLocationIdx = toLocationMatch?.index ?? 20; // Column U: To Location

  console.log(
    `\n✅ Using indices: cow=${cowIdIdx}, from=${fromLocationIdx} (Column O), to=${toLocationIdx} (Column U)`,
  );

  // Parse rows
  const rows: any[] = [];
  let skippedCount = 0;
  let successCount = 0;
  const skipReasons = new Map<string, number>();

  console.log(`\n🔄 PARSING DATA ROWS:`);

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);

    // Skip completely empty rows
    if (cells.length === 0) {
      skippedCount++;
      continue;
    }

    // Skip if first column (COW ID) is empty
    if (!cells[0]?.trim()) {
      const reason = "empty_first_column";
      skipReasons.set(reason, (skipReasons.get(reason) ?? 0) + 1);
      skippedCount++;
      continue;
    }

    // Extract critical fields using detected or standard indices
    const cow_id = cells[cowIdIdx]?.trim() || "";
    const from_location = cells[fromLocationIdx]?.trim() || "";
    const to_location = cells[toLocationIdx]?.trim() || "";

    // Log first 5 rows for debugging
    if (i <= 5) {
      console.log(`   Row ${i}:`);
      console.log(`      cells[${cowIdIdx}] (cow) = "${cow_id}"`);
      console.log(
        `      cells[${fromLocationIdx}] (from) = "${from_location}"`,
      );
      console.log(`      cells[${toLocationIdx}] (to) = "${to_location}"`);
    }

    // Be lenient: only require cow_id, accept empty locations as they might be warehouses
    // The key is we have a COW ID to work with
    if (!cow_id) {
      const reason = "no_cow_id";
      skipReasons.set(reason, (skipReasons.get(reason) ?? 0) + 1);
      if (i <= 5) console.log(`      SKIPPED: no cow_id`);
      skippedCount++;
      continue;
    }

    // If we have at least cow_id, try to use it even if from/to are empty
    // They might be filled in later or the data structure is different
    successCount++;

    successCount++;

    // Map all columns - use all available cells, cycling through for fallbacks
    const row: any = {
      cow_id: cow_id || cells[0]?.trim() || "",
      from_location:
        from_location || cells[1]?.trim() || cells[14]?.trim() || "",
      to_location: to_location || cells[2]?.trim() || cells[18]?.trim() || "",
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
      top_event: cells[11]?.trim() || "", // Column L: Top Event (Riyadh Season, Hajj, etc.)
      vehicle_plate_number: cells[11]?.trim() || cells[9]?.trim() || "",
      moved_datetime: cells[12]?.trim() || cells[10]?.trim() || "",
      moved_month_year: cells[13]?.trim() || cells[11]?.trim() || "",
      reached_datetime: cells[14]?.trim() || cells[12]?.trim() || "",
      reached_month_year: cells[15]?.trim() || cells[13]?.trim() || "",
      from_sub_location: cells[17]?.trim() || "", // Column R: From Sub Location (Event Type)
      from_latitude: cells[18]?.trim() || cells[16]?.trim() || "0",
      from_longitude: cells[19]?.trim() || cells[17]?.trim() || "0",
      to_sub_location: cells[21]?.trim() || "", // Column V: To Sub Location (Event Type)
      to_latitude: cells[22]?.trim() || cells[20]?.trim() || "0",
      to_longitude: cells[23]?.trim() || cells[21]?.trim() || "0",
      distance_km: cells[24]?.trim() || cells[22]?.trim() || "0",
      movement_type: cells[25]?.trim() || cells[23]?.trim() || "Zero",
      region_from: cells[26]?.trim() || cells[24]?.trim() || "CENTRAL",
      region_to: cells[27]?.trim() || cells[25]?.trim() || "CENTRAL",
      vendor: cells[28]?.trim() || cells[26]?.trim() || "Unknown",
      governorate: cells[29]?.trim() || cells[27]?.trim() || "", // Column AD: Official governorate administrative region
      remarks: cells[30]?.trim() || cells[28]?.trim() || "",
    };

    rows.push(row);
  }

  // Summary
  console.log(`\n📊 PARSING SUMMARY:`);
  console.log(`   ✓ Valid rows: ${successCount}`);
  console.log(`   ✗ Skipped: ${skippedCount}`);
  if (skipReasons.size > 0) {
    console.log(`   Skip breakdown:`);
    skipReasons.forEach((count, reason) => {
      console.log(`      ${reason}: ${count}`);
    });
  }

  if (rows.length === 0) {
    console.error(`\n❌ NO VALID ROWS FOUND!`);
    if (successCount === 0 && skippedCount > 0) {
      console.error(`   Problem: All ${skippedCount} data rows were rejected.`);
      console.error(`   Checklist:`);
      console.error(
        `     1. Are column indices correct? (cow=${cowIdIdx}, from=${fromLocationIdx}, to=${toLocationIdx})`,
      );
      console.error(`     2. Do those columns contain data or are they empty?`);
      console.error(`     3. Is the CSV format correct?`);
      console.error(`     4. Are you using the correct GID/sheet?`);
    }
  }

  console.log(`════════════════════════════════════════\n`);

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
      from_sub_location: rows[0].from_sub_location,
      to_sub_location: rows[0].to_sub_location,
      movement_type: rows[0].movement_type,
      distance_km: rows[0].distance_km,
    });

    // Check event type distribution
    const eventTypes: Record<string, number> = {};
    rows.slice(0, 100).forEach((row) => {
      const type =
        row.from_sub_location?.trim() || row.to_sub_location?.trim() || "EMPTY";
      eventTypes[type] = (eventTypes[type] || 0) + 1;
    });
    console.log(`📊 Event Type sample (first 100 rows):`, eventTypes);
  }

  rows.forEach((row, idx) => {
    // Skip only if we have no cow_id - that's the absolute minimum
    const hasCowId = row.cow_id && row.cow_id.toString().trim().length > 0;
    const hasFromLocation =
      row.from_location && row.from_location.toString().trim().length > 0;
    const hasToLocation =
      row.to_location && row.to_location.toString().trim().length > 0;

    // Require cow_id but be lenient about locations
    if (!hasCowId) {
      if (idx < 5) {
        console.warn(`⚠️  Row ${idx} skipped: no cow_id`);
      }
      skippedCount++;
      return;
    }

    // Use defaults for empty locations
    const from_loc = hasFromLocation ? row.from_location.trim() : "Unknown";
    const to_loc = hasToLocation ? row.to_location.trim() : "Unknown";

    // Safely parse dates
    const parseDate = (dateStr: string): string => {
      if (!dateStr || dateStr.trim() === "") {
        return new Date().toISOString();
      }
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return new Date().toISOString();
        }
        return date.toISOString();
      } catch (e) {
        return new Date().toISOString();
      }
    };

    // Parse Royal/EBU classification
    const { isRoyal, isEBU, category } = classifyEbuRoyal(row.ebu_royal_flag);

    // Add movement with standard field names
    const distanceValue = parseFloat(row.distance_km) || 0;
    movements.push({
      SN: idx + 1,
      COW_ID: row.cow_id,
      From_Location_ID: `LOC-${from_loc.replace(/\s+/g, "-").substring(0, 20)}`,
      From_Sub_Location: row.from_sub_location || undefined,
      To_Location_ID: `LOC-${to_loc.replace(/\s+/g, "-").substring(0, 20)}`,
      To_Sub_Location: row.to_sub_location || undefined,
      Moved_DateTime: parseDate(row.moved_datetime),
      Reached_DateTime: parseDate(row.reached_datetime),
      Movement_Type: row.movement_type?.includes("Full")
        ? "Full"
        : row.movement_type?.includes("Half")
          ? "Half"
          : "Zero",
      Top_Event: row.top_event?.trim() || undefined, // Column L: Top Event
      Distance_KM: distanceValue, // Read from Column Y (cells[24])
      Is_Royal: isRoyal,
      Is_EBU: isEBU,
      EbuRoyalCategory: category,
      Vendor: row.vendor || "Unknown",
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
    const fromId = `LOC-${from_loc.replace(/\s+/g, "-").substring(0, 20)}`;
    if (!locationMap.has(fromId)) {
      // Detect warehouse based on "WH" in location name
      const isFromWarehouse = from_loc.toUpperCase().includes("WH");
      locationMap.set(fromId, {
        Location_ID: fromId,
        Location_Name: from_loc,
        Sub_Location: row.from_sub_location || "",
        Latitude: parseFloat(row.from_latitude) || 0,
        Longitude: parseFloat(row.from_longitude) || 0,
        Region: normalizeRegion(row.region_from),
        Governorate: row.governorate || "", // Column AD: Official governorate
        Location_Type: isFromWarehouse ? "Warehouse" : "Site",
        Owner: row.vendor || "STC",
      });
    }

    // Add to location
    const toId = `LOC-${to_loc.replace(/\s+/g, "-").substring(0, 20)}`;
    if (!locationMap.has(toId)) {
      // Detect warehouse based on "WH" in location name
      const isToWarehouse = to_loc.toUpperCase().includes("WH");
      locationMap.set(toId, {
        Location_ID: toId,
        Location_Name: to_loc,
        Sub_Location: row.to_sub_location || "",
        Latitude: parseFloat(row.to_latitude) || 0,
        Longitude: parseFloat(row.to_longitude) || 0,
        Region: normalizeRegion(row.region_to),
        Governorate: row.governorate || "", // Column AD: Official governorate
        Location_Type: isToWarehouse ? "Warehouse" : "Site",
        Owner: row.vendor || "STC",
      });
    }
  });

  // Count warehouses (locations with "WH" in name)
  const locations = Array.from(locationMap.values());
  const warehouses = locations.filter(
    (l) =>
      l.Location_Type === "Warehouse" ||
      l.Location_Name.toUpperCase().includes("WH"),
  );

  console.log(`📊 Processing complete:`);
  console.log(`   Total input rows: ${rows.length}`);
  console.log(`   Valid movements: ${movements.length}`);
  console.log(`   Skipped (invalid): ${skippedCount}`);
  console.log(`   Unique COWs: ${cowMap.size}`);
  console.log(`   Unique locations: ${locationMap.size}`);
  console.log(`   🏢 Active Warehouses: ${warehouses.length}`);
  if (warehouses.length > 0) {
    console.log(`   Warehouse details:`);
    warehouses.forEach((wh) => {
      console.log(`      ✓ ${wh.Location_Name} [${wh.Location_Type}]`);
    });
  }

  return {
    movements: movements.sort(
      (a: any, b: any) =>
        new Date(a.Moved_DateTime).getTime() -
        new Date(b.Moved_DateTime).getTime(),
    ),
    cows: Array.from(cowMap.values()),
    locations: locations,
    events: [],
  };
}

/**
 * Fetch and process data from Google Sheets (single source of truth)
 */
const processedDataHandler: RequestHandler = async (req, res) => {
  try {
    // Check cache first - reduces load on APIs (skip in dev to ensure fresh data)
    // Add version to cache key to bust old cached values
    const cacheKey = "processed-data-v2";
    const shouldUseCache = process.env.NODE_ENV === "production";
    const cachedData = shouldUseCache ? getCached(cacheKey) : null;
    if (cachedData) {
      console.log(`✓ Serving cached data for processed-data`);
      return res.json(cachedData);
    }

    console.log(`ℹ️  Using Google Sheets as data source`);

    let csvData: string | null = null;
    let fetchError: Error | null = null;

    try {
      console.log(`\n🚀 PROCESSING MOVEMENT DATA`);
      console.log(`📥 CSV URL being used:`);
      console.log(`   ${MOVEMENT_DATA_CSV_URL}`);

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
        fetchError = new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
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
      console.error(
        "   3. Ensure the sheet contains data in the expected columns",
      );
      console.error(
        "   4. Restart the server if there are environment variable issues",
      );
      console.error("");
      throw new Error(errorMsg);
    }

    // Validate CSV data
    if (csvData.length === 0) {
      throw new Error("CSV data is empty");
    }

    if (csvData.length < 10) {
      console.warn(
        `⚠️  CSV data is very small (${csvData.length} bytes) - may be incomplete`,
      );
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
      throw new Error(
        "No data rows found in Google Sheet - CSV may be empty or incorrectly formatted",
      );
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

    // Calculate total distance from Column Y
    const totalDistance = processedData.movements.reduce(
      (sum, mov) => sum + (mov.Distance_KM || 0),
      0,
    );

    console.log(
      `✓ Processed ${processedData.movements.length} movements, ${processedData.cows.length} cows, ${processedData.locations.length} locations`,
    );
    console.log(
      `  ├─ Total Distance (Column Y): ${totalDistance.toLocaleString("en-US", { maximumFractionDigits: 2 })} KM`,
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

    // Add totalDistanceKM to the response
    const responseData = {
      ...processedData,
      totalDistanceKM: totalDistance,
    };

    // Log the exact value being returned with detailed breakdown
    console.log(`\n🎯 FINAL RESPONSE DATA:`);
    console.log(`   ✓ totalDistanceKM: ${totalDistance}`);
    console.log(`   ✓ movements.length: ${processedData.movements.length}`);
    console.log(
      `   ✓ Average distance per movement: ${(totalDistance / processedData.movements.length).toFixed(2)} KM`,
    );
    console.log(`   ✓ Cache key: ${cacheKey}`);

    // Sample check - show first 5 movements
    console.log(`\n📍 First 5 movements distance values:`);
    for (let i = 0; i < Math.min(5, processedData.movements.length); i++) {
      console.log(
        `      Movement ${i + 1}: ${processedData.movements[i].Distance_KM} KM`,
      );
    }

    // Cache the result to reduce API calls to Google Sheets
    setCached(cacheKey, responseData, CACHE_TTL);

    res.json(responseData);
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
 * Handler to fetch "Never Moved COW" data from the same Google Sheet
 * Column mapping for Never Moved COWs:
 * AF (Index 31): COW ID
 * AP (Index 41): Onair status
 * AN (Index 39): Latitude
 * AO (Index 40): Longitude
 * AQ (Index 42): Last Deploying Date
 * AR (Index 43): 1st Deploying Date
 * AS (Index 44): Vendor
 *
 * Filter rule: Skip rows where column AF (index 31) is blank
 */
const neverMovedCowHandler: RequestHandler = async (req, res) => {
  try {
    // Check cache first
    // Add version to cache key to bust old cached values
    const cacheKey = "never-moved-cows-v2";
    const cachedData = getCached(cacheKey);
    if (cachedData) {
      console.log(`✓ Serving cached data for never-moved-cows`);
      return res.json(cachedData);
    }

    console.log(`\n🚀 PROCESSING NEVER MOVED COWS DATA`);
    console.log(`📥 CSV URL: ${MOVEMENT_DATA_CSV_URL}`);

    // Fetch CSV data
    let csvData: string | null = null;
    let fetchError: Error | null = null;

    try {
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
        fetchError = new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
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
      throw new Error(
        `Failed to fetch CSV: ${fetchError?.message || "Unknown error"}`,
      );
    }

    // Parse CSV
    const lines = csvData.trim().split("\n");

    if (lines.length < 2) {
      throw new Error("CSV has no data rows");
    }

    // Parse header to understand structure
    const headerLine = lines[0];
    const headerCells = parseCSVLine(headerLine);

    console.log(`\n📋 CSV Structure:`);
    console.log(`   Total columns: ${headerCells.length}`);
    console.log(`   Sample columns for Never Moved COWs:`);
    console.log(`      [31] AF = "${headerCells[31] || "MISSING"}" (COW ID)`);
    console.log(`      [34] AI = "${headerCells[34] || "MISSING"}" (Region)`);
    console.log(`      [35] AJ = "${headerCells[35] || "MISSING"}" (District)`);
    console.log(`      [36] AK = "${headerCells[36] || "MISSING"}" (City)`);
    console.log(`      [38] AM = "${headerCells[38] || "MISSING"}" (Location)`);
    console.log(`      [39] AN = "${headerCells[39] || "MISSING"}" (Latitude)`);
    console.log(
      `      [40] AO = "${headerCells[40] || "MISSING"}" (Longitude)`,
    );
    console.log(
      `      [41] AP = "${headerCells[41] || "MISSING"}" (Onair status)`,
    );
    console.log(
      `      [42] AQ = "${headerCells[42] || "MISSING"}" (Last Deploying Date)`,
    );
    console.log(
      `      [43] AR = "${headerCells[43] || "MISSING"}" (1st Deploying Date)`,
    );
    console.log(`      [44] AS = "${headerCells[44] || "MISSING"}" (Vendor)`);

    // Column indices for Never Moved COWs
    const COW_ID_IDX = 31; // AF
    const REGION_IDX = 34; // AI
    const DISTRICT_IDX = 35; // AJ
    const CITY_IDX = 36; // AK
    const LOCATION_IDX = 38; // AM
    const LATITUDE_IDX = 39; // AN
    const LONGITUDE_IDX = 40; // AO
    const ONAIR_STATUS_IDX = 41; // AP
    const LAST_DEPLOY_IDX = 42; // AQ
    const FIRST_DEPLOY_IDX = 43; // AR
    const VENDOR_IDX = 44; // AS

    // Parse Never Moved COWs data
    const neverMovedCows: any[] = [];
    let skippedCount = 0;

    console.log(`\n🔄 Parsing Never Moved COWs data:`);

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);

      // Skip rows where COW ID (column AF / index 31) is blank
      const cowId = cells[COW_ID_IDX]?.trim();

      if (!cowId) {
        skippedCount++;
        continue;
      }

      // Extract Never Moved COW data
      const onairStatus = cells[ONAIR_STATUS_IDX]?.trim() || "OFF-AIR";
      const lastDeployDate = cells[LAST_DEPLOY_IDX]?.trim() || "";
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
          daysOnAir = 0;
        }
      }

      // Normalize status
      const status =
        onairStatus.toUpperCase() === "ON-AIR" || onairStatus === "1"
          ? "ON-AIR"
          : "OFF-AIR";

      const neverMovedCow: any = {
        COW_ID: cowId,
        Region: cells[REGION_IDX]?.trim() || "Unknown",
        District: cells[DISTRICT_IDX]?.trim() || "Unknown",
        City: cells[CITY_IDX]?.trim() || "Unknown",
        Location: cells[LOCATION_IDX]?.trim() || "Unknown",
        Latitude: parseFloat(cells[LATITUDE_IDX]?.trim() || "0") || 0,
        Longitude: parseFloat(cells[LONGITUDE_IDX]?.trim() || "0") || 0,
        Status: status,
        Last_Deploy_Date:
          lastDeployDate || new Date().toISOString().split("T")[0],
        First_Deploy_Date:
          firstDeployDate || new Date().toISOString().split("T")[0],
        Days_On_Air: daysOnAir,
        Vendor: cells[VENDOR_IDX]?.trim() || "Unknown",
      };

      neverMovedCows.push(neverMovedCow);

      // Log first 3 rows for debugging
      if (neverMovedCows.length <= 3) {
        console.log(`   Row ${i}: ${cowId}`);
        console.log(`      Status: ${neverMovedCow.Status}`);
        console.log(
          `      Lat/Lng: ${neverMovedCow.Latitude}, ${neverMovedCow.Longitude}`,
        );
        console.log(`      Days On Air: ${daysOnAir}`);
      }
    }

    console.log(`\n📊 Parsing Summary:`);
    console.log(`   ✓ Valid Never Moved COWs: ${neverMovedCows.length}`);
    console.log(`   ✗ Skipped (blank COW ID): ${skippedCount}`);

    // Calculate statistics
    const onAirCount = neverMovedCows.filter(
      (cow) =>
        cow.onair_status?.toUpperCase() === "ON-AIR" ||
        cow.onair_status === "1",
    ).length;
    const offAirCount = neverMovedCows.length - onAirCount;
    const onAirPercentage =
      neverMovedCows.length > 0
        ? ((onAirCount / neverMovedCows.length) * 100).toFixed(2)
        : 0;

    const responseData = {
      cows: neverMovedCows,
      stats: {
        total: neverMovedCows.length,
        onAir: onAirCount,
        offAir: offAirCount,
        onAirPercentage: parseFloat(onAirPercentage as string),
      },
      source: "Single Sheet Mode - Never Moved COWs",
    };

    console.log(`   ON-AIR: ${onAirCount} (${onAirPercentage}%)`);
    console.log(`   OFF-AIR: ${offAirCount}`);

    // Cache the result
    setCached(cacheKey, responseData, CACHE_TTL);

    res.json(responseData);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in never-moved handler:", errorMsg);

    // Return empty data to prevent app crash
    const responseData = {
      cows: [],
      stats: { total: 0, onAir: 0, offAir: 0, onAirPercentage: 0 },
      source: "Error - returning empty data",
      error: errorMsg,
    };

    res.json(responseData);
  }
};

/**
 * Diagnostic endpoint to test Google Sheets CSV connectivity
 * Single source of truth: One Google Sheet URL for all data
 */
const diagnosticHandler: RequestHandler = async (req, res) => {
  const diagnostics = {
    sourceOfTruth: {
      name: "Single Google Sheet",
      url: MOVEMENT_DATA_CSV_URL,
      description: "All dashboard data comes from this single CSV source",
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
      endpoint: "all_data (movements + never_moved_cows)",
      url: MOVEMENT_DATA_CSV_URL,
      status: response.status,
      success: response.ok,
    });

    if (response.ok) {
      diagnostics.recommendations.push(
        "✓ Google Sheet CSV is accessible and working.",
      );
      diagnostics.recommendations.push(
        "✓ Both movement data and never-moved COWs data are being fetched from this single source.",
      );
    } else {
      diagnostics.recommendations.push(
        `✗ Google Sheet CSV returned HTTP ${response.status}. Check if the sheet is published.`,
      );
    }
  } catch (error) {
    diagnostics.urlsAttempted.push({
      endpoint: "all_data (movements + never_moved_cows)",
      url: MOVEMENT_DATA_CSV_URL,
      status: error instanceof Error ? error.message : "Network error",
      success: false,
    });
    diagnostics.recommendations.push(
      `✗ Failed to fetch Google Sheet CSV: ${error instanceof Error ? error.message : "Network error"}`,
    );
  }

  if (diagnostics.urlsAttempted.every((u) => !u.success)) {
    diagnostics.recommendations.push("");
    diagnostics.recommendations.push("TROUBLESHOOTING:");
    diagnostics.recommendations.push(
      "1. Ensure the Google Sheet is published to the web (File → Share → Publish to web)",
    );
    diagnostics.recommendations.push(
      "2. Verify the CSV URL is correct and accessible:",
    );
    diagnostics.recommendations.push(`   ${MOVEMENT_DATA_CSV_URL}`);
    diagnostics.recommendations.push(
      "3. Check that the sheet has data in the expected columns",
    );
  }

  res.json(diagnostics);
};

/**
 * Raw CSV Viewer - For debugging what the Google Sheet actually returns
 */
const csvViewerHandler: RequestHandler = async (req, res) => {
  try {
    console.log(`\n🔍 RAW CSV VIEWER ENDPOINT`);
    console.log(`   MOVEMENT_DATA_CSV_URL: ${MOVEMENT_DATA_CSV_URL}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(MOVEMENT_DATA_CSV_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const csvText = await response.text();

    // Check response status
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      return res.status(response.status).json({
        error: `Failed to fetch CSV`,
        httpStatus: response.status,
        statusText: response.statusText,
      });
    }

    console.log(`✓ CSV fetched successfully (${csvText.length} bytes)`);

    // Analyze the CSV
    const lines = csvText.split("\n");
    const isHTML = csvText.includes("<html") || csvText.includes("<!DOCTYPE");
    const isEmpty = csvText.trim().length === 0;

    const analysis = {
      httpStatus: response.status,
      csvSize: csvText.length,
      byteCount: Buffer.byteLength(csvText),
      lineCount: lines.length,
      isEmpty,
      isHTML,
      firstLine: lines[0] || "",
      secondLine: lines[1] || "",
      thirdLine: lines[2] || "",
      first200Chars: csvText.substring(0, 200),
      last200Chars: csvText.substring(Math.max(0, csvText.length - 200)),
    };

    if (isHTML) {
      analysis.warning = "⚠️  Response contains HTML, not CSV!";
      console.error("   ❌ Response is HTML, not CSV!");
    }

    if (isEmpty) {
      analysis.error = "❌ CSV is completely empty";
      console.error("   ❌ CSV is empty!");
    }

    if (lines.length < 2) {
      analysis.warning = "⚠️  CSV has fewer than 2 lines (header + data)";
      console.warn(`   ⚠️  Only ${lines.length} line(s)`);
    }

    if (lines.length >= 2) {
      analysis.headerCount = lines[0].split(",").length;
      analysis.firstDataRowCellCount = lines[1].split(",").length;
      console.log(`   Header: ${analysis.headerCount} cells`);
      console.log(`   Row 1: ${analysis.firstDataRowCellCount} cells`);
    }

    console.log(`\n📊 CSV Analysis Summary:`);
    console.log(`   Size: ${csvText.length} bytes`);
    console.log(`   Lines: ${lines.length}`);
    console.log(`   Is HTML: ${isHTML}`);
    console.log(`   Is Empty: ${isEmpty}`);

    res.json(analysis);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Error: ${errorMsg}`);

    res.status(500).json({
      error: "Failed to fetch and analyze CSV",
      details: errorMsg,
      csvUrl: MOVEMENT_DATA_CSV_URL,
    });
  }
};

/**
 * Verification endpoint to check raw distance data
 */
const verifyDistanceHandler: RequestHandler = async (req, res) => {
  try {
    console.log(`\n🔍 VERIFY DISTANCE ENDPOINT`);

    const response = await fetch(MOVEMENT_DATA_CSV_URL);
    const csvText = await response.text();
    const lines = csvText.trim().split("\n");

    console.log(`📊 CSV Lines: ${lines.length}`);

    // Parse header
    const headerCells = parseCSVLine(lines[0]);
    const DISTANCE_INDEX = 24; // Column Y

    console.log(`🎯 Distance column index: ${DISTANCE_INDEX}`);
    console.log(`   Column name: "${headerCells[DISTANCE_INDEX]}"`);

    // Sum all distances
    let totalDistance = 0;
    let rowCount = 0;

    for (let i = 1; i < Math.min(lines.length, 100); i++) {
      const cells = parseCSVLine(lines[i]);
      const distance = parseFloat(cells[DISTANCE_INDEX] || "0") || 0;
      totalDistance += distance;
      rowCount++;

      if (i <= 3) {
        console.log(`   Row ${i}: distance = ${distance}`);
      }
    }

    // Calculate average to estimate total
    const avgDistance = totalDistance / rowCount;
    const estimatedTotal = avgDistance * (lines.length - 1);

    res.json({
      csvLines: lines.length,
      dataRows: lines.length - 1,
      sampleRows: rowCount,
      sampleTotal: totalDistance,
      avgDistance: avgDistance.toFixed(2),
      estimatedTotal: estimatedTotal.toFixed(2),
      distanceColumnIndex: DISTANCE_INDEX,
      distanceColumnName: headerCells[DISTANCE_INDEX],
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

router.get("/processed-data", processedDataHandler);
router.get("/never-moved-cows", neverMovedCowHandler);
router.get("/diagnostic", diagnosticHandler);
router.get("/csv-viewer", csvViewerHandler);
router.get("/verify-distance", verifyDistanceHandler);

export default router;
