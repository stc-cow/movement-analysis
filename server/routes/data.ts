import { Router, Request, Response } from "express";
import { RequestHandler } from "express";
import { fetchFromSupabase, isSupabaseConfigured } from "../lib/supabase-client";

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
// Sheet ID: 1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM
// Two different sheets within the same file (different GIDs):
// - GID 1539310010: Movement-data (main dashboard data)
// - GID 1464106304: Dashboard (Never Moved COWs data)

const SHEET_ID = "1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM";
const MOVEMENT_DATA_GID = "1539310010"; // Movement-data sheet
const NEVER_MOVED_COW_GID = "1464106304"; // Never Moved COWs sheet

const MOVEMENT_DATA_CSV_URL =
  process.env.MOVEMENT_DATA_CSV_URL ||
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${MOVEMENT_DATA_GID}`;

const NEVER_MOVED_COW_CSV_URL =
  process.env.NEVER_MOVED_COW_CSV_URL ||
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${NEVER_MOVED_COW_GID}`;

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
  // Key insight: if headers don't match, use column positions A-U (0-20)
  const cowIdIdx = cowIdMatch?.index ?? 0; // Usually column A
  const fromLocationIdx = fromLocationMatch?.index ?? 16; // Usually column Q
  const toLocationIdx = toLocationMatch?.index ?? 20; // Usually column U

  console.log(
    `\n✅ Using indices: cow=${cowIdIdx}, from=${fromLocationIdx}, to=${toLocationIdx}`,
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
      movement_type: rows[0].movement_type,
      distance_km: rows[0].distance_km,
    });
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
 * Fetch and process data from Supabase (primary) or Google Sheets (fallback)
 */
const processedDataHandler: RequestHandler = async (req, res) => {
  try {
    // Check cache first - reduces load on APIs
    const cacheKey = "processed-data";
    const cachedData = getCached(cacheKey);
    if (cachedData && process.env.NODE_ENV !== "development") {
      console.log(`✓ Serving cached data for processed-data`);
      return res.json(cachedData);
    }

    // Try Supabase first if configured
    if (isSupabaseConfigured()) {
      try {
        console.log(`\n🚀 ATTEMPTING TO USE SUPABASE DATA`);
        const supabaseData = await fetchFromSupabase();

        // Cache the result
        setCached(cacheKey, supabaseData, CACHE_TTL);
        console.log(`✓ Successfully served data from Supabase`);
        return res.json(supabaseData);
      } catch (supabaseError) {
        console.warn(`⚠️  Supabase fetch failed, falling back to Google Sheets:`);
        console.warn(`   ${supabaseError instanceof Error ? supabaseError.message : String(supabaseError)}`);
        // Fall through to Google Sheets fetch below
      }
    } else {
      console.log(`ℹ️  Supabase not configured, using Google Sheets`);
    }

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
        "   4. If you see 'CSV_URLS is not defined', clear Netlify cache and redeploy",
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
    const totalDistance = processedData.movements.reduce((sum, mov) => sum + (mov.Distance_KM || 0), 0);

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

    // Try Supabase first if configured
    if (isSupabaseConfigured()) {
      try {
        console.log(`\n📥 Fetching Never Moved COWs from Supabase...`);
        const supabaseData = await fetchFromSupabase();
        const neverMovedData = {
          cows: supabaseData.neverMoved || [],
        };

        // Cache the result
        setCached(cacheKey, neverMovedData, CACHE_TTL);
        console.log(`✓ Successfully served never-moved cows from Supabase (${neverMovedData.cows.length} cows)`);
        return res.json(neverMovedData);
      } catch (supabaseError) {
        console.warn(`⚠️  Supabase fetch failed, falling back to Google Sheets:`);
        console.warn(`   ${supabaseError instanceof Error ? supabaseError.message : String(supabaseError)}`);
        // Fall through to Google Sheets fetch below
      }
    } else {
      console.log(`ℹ️  Supabase not configured, using Google Sheets`);
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

router.get("/processed-data", processedDataHandler);
router.get("/never-moved-cows", neverMovedCowHandler);
router.get("/diagnostic", diagnosticHandler);
router.get("/csv-viewer", csvViewerHandler);

export default router;
