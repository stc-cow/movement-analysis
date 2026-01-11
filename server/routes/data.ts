import { Router, Request, Response } from "express";
import { RequestHandler } from "express";

const router = Router();

// Google Sheet Configuration
// IMPORTANT: Use the actual Sheet ID from the URL bar when editing the sheet
// The Sheet ID is the long alphanumeric string after /spreadsheets/d/
// Example: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
//
// If you only have the published link (pubhtml URL), you need to:
// 1. Open the sheet in edit mode
// 2. Copy the Sheet ID from the URL bar
// 3. Paste it here below

// Google Sheet ID from: https://docs.google.com/spreadsheets/d/1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM/edit
const ACTUAL_SHEET_ID =
  process.env.GOOGLE_SHEET_ID || "1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM";
const GID = process.env.GOOGLE_SHEET_GID || "1539310010";

const CSV_URLS = [
  // Standard Google Sheet export format
  `https://docs.google.com/spreadsheets/d/${ACTUAL_SHEET_ID}/export?format=csv&gid=${GID}`,
  // Alternative format that sometimes works
  `https://docs.google.com/spreadsheets/d/${ACTUAL_SHEET_ID}/export?format=csv`,
  // Format for shared/published links (may not work)
  `https://docs.google.com/spreadsheets/d/e/${ACTUAL_SHEET_ID}/export?format=csv&gid=${GID}`,
];

/**
 * Helper function to parse CSV from Google Sheets
 */
function parseCSVData(csvText: string) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse first data row to detect column structure
  const headerLine = lines[0];
  const firstDataLine = lines[1];

  const headerCells = parseCSVLine(headerLine);
  const firstDataCells = parseCSVLine(firstDataLine);

  // Try to detect if this is the old or new column structure
  // Old structure has "From Location" or similar at column O (14)
  // New structure has more columns before from_location
  const isNewStructure = firstDataCells.length >= 31;

  console.log(
    `Detected ${isNewStructure ? "NEW" : "OLD"} column structure (${firstDataCells.length} columns)`,
  );

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);

    // Skip if not enough cells for at least basic data
    if (cells.length < 20 || !cells[0]?.trim()) continue;

    let row: any = {};

    if (isNewStructure) {
      // New structure (A-AE with 31 columns)
      // Column E (index 4) contains Royal/EBU classification
      row = {
        cow_id: cells[0]?.trim() || "",
        site_label: cells[1]?.trim() || "",
        last_deploy_date: cells[2]?.trim() || "",
        first_deploy_date: cells[3]?.trim() || "",
        ebu_royal_flag: cells[4]?.trim() || "",
        shelter_type: cells[5]?.trim() || "",
        tower_type: cells[6]?.trim() || "Macro",
        tower_system: cells[7]?.trim() || "",
        tower_height: cells[8]?.trim() || "0",
        network_technology: cells[9]?.trim() || "",
        vehicle_make: cells[10]?.trim() || "",
        vehicle_plate_number: cells[11]?.trim() || "",
        moved_datetime: cells[12]?.trim() || "",
        moved_month_year: cells[13]?.trim() || "",
        reached_datetime: cells[14]?.trim() || "",
        reached_month_year: cells[15]?.trim() || "",
        from_location: cells[16]?.trim() || "",
        from_sub_location: cells[17]?.trim() || "",
        from_latitude: cells[18]?.trim() || "0",
        from_longitude: cells[19]?.trim() || "0",
        to_location: cells[20]?.trim() || "",
        to_sub_location: cells[21]?.trim() || "",
        to_latitude: cells[22]?.trim() || "0",
        to_longitude: cells[23]?.trim() || "0",
        distance_km: cells[24]?.trim() || "0",
        movement_type: cells[25]?.trim() || "Zero",
        region_from: cells[26]?.trim() || "CENTRAL",
        region_to: cells[27]?.trim() || "CENTRAL",
        vendor: cells[28]?.trim() || "Unknown",
        installation_status: cells[29]?.trim() || "",
        remarks: cells[30]?.trim() || "",
      };
    } else {
      // Old structure - legacy column mapping for backwards compatibility
      // A=cow, B=site, C=ebu_royal, D=shelter, E=tower_type, F=tower_system, G=tower_height, H=network
      // I=vehicle_make, J=plate, K=moved_datetime, L=moved_month_year, M=reached_datetime, N=reached_month_year
      // O=from_location, P=from_sub, Q=from_lat, R=from_lon, S=to_location, T=to_sub, U=to_lat, V=to_lon
      // W=distance, X=movement_type, Y=region_from, Z=region_to, AA=vendor, AB=installation, AC=remarks
      row = {
        cow_id: cells[0]?.trim() || "",
        site_label: cells[1]?.trim() || "",
        ebu_royal_flag: cells[2]?.trim() || "",
        shelter_type: cells[3]?.trim() || "",
        tower_type: cells[4]?.trim() || "Macro",
        tower_system: cells[5]?.trim() || "",
        tower_height: cells[6]?.trim() || "0",
        network_technology: cells[7]?.trim() || "",
        vehicle_make: cells[8]?.trim() || "",
        vehicle_plate_number: cells[9]?.trim() || "",
        moved_datetime: cells[10]?.trim() || "",
        moved_month_year: cells[11]?.trim() || "",
        reached_datetime: cells[12]?.trim() || "",
        reached_month_year: cells[13]?.trim() || "",
        from_location: cells[14]?.trim() || "",
        from_sub_location: cells[15]?.trim() || "",
        from_latitude: cells[16]?.trim() || "0",
        from_longitude: cells[17]?.trim() || "0",
        to_location: cells[18]?.trim() || "",
        to_sub_location: cells[19]?.trim() || "",
        to_latitude: cells[20]?.trim() || "0",
        to_longitude: cells[21]?.trim() || "0",
        distance_km: cells[22]?.trim() || "0",
        movement_type: cells[23]?.trim() || "Zero",
        region_from: cells[24]?.trim() || "CENTRAL",
        region_to: cells[25]?.trim() || "CENTRAL",
        vendor: cells[26]?.trim() || "Unknown",
        installation_status: cells[27]?.trim() || "",
        remarks: cells[28]?.trim() || "",
      };
    }

    rows.push(row);
  }
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

  rows.forEach((row, idx) => {
    // Skip invalid rows
    if (!row.cow_id || !row.from_location || !row.to_location) return;

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
    let csvData: string | null = null;
    let lastError: Error | null = null;

    // Try each URL format
    for (const url of CSV_URLS) {
      try {
        console.log(`Attempting to fetch from: ${url}`);
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        });

        if (response.ok) {
          csvData = await response.text();
          console.log(
            `✓ Successfully fetched CSV data (${csvData.length} bytes)`,
          );
          break;
        } else {
          lastError = new Error(`HTTP ${response.status}`);
          console.warn(`✗ URL failed with ${response.status}`);
        }
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(`✗ URL fetch failed:`, lastError.message);
      }
    }

    if (!csvData) {
      const errorMsg = `Failed to fetch from all URLs. Last error: ${lastError?.message || "Unknown"}`;
      console.error("\n❌ GOOGLE SHEETS CONNECTION ERROR:");
      console.error(`   Sheet ID: ${ACTUAL_SHEET_ID}`);
      console.error(`   GID: ${GID}`);
      console.error(`   Error: ${lastError?.message}`);
      console.error("\n📋 TO FIX THIS:");
      console.error("   1. Open your Google Sheet");
      console.error("   2. Look at the URL in the address bar");
      console.error("   3. Copy the ID after /spreadsheets/d/");
      console.error(
        "   4. Set it as an environment variable: GOOGLE_SHEET_ID=YOUR_ID",
      );
      console.error(
        "   5. Or update the ACTUAL_SHEET_ID in server/routes/data.ts",
      );
      console.error("");
      throw new Error(errorMsg);
    }

    const rows = parseCSVData(csvData);

    if (rows.length === 0) {
      throw new Error("No data rows found in Google Sheet");
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
 * Handler to fetch "Never Moved COW" data from Google Apps Script
 * The script endpoint serves data with columns:
 * A: COW_ID, D: Region, E: District, F: City, H: Location
 * I: Latitude, J: Longitude, K: Status, L: Last_Deploy_Date, M: First_Deploy_Date
 */
const neverMovedCowHandler: RequestHandler = async (req, res) => {
  try {
    // Google Apps Script endpoint for Never Moved COWs
    // Deployment ID: AKfycbyP4BAqz11yoZpz2NA1OUCfYlw5mPcyk8rROrPoaBkWiv3M1dWN-6icFlp32bOu6apf
    const SCRIPT_URL = process.env.NEVER_MOVED_COW_SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbyP4BAqz11yoZpz2NA1OUCfYlw5mPcyk8rROrPoaBkWiv3M1dWN-6icFlp32bOu6apf/exec";

    console.log(`📡 Fetching Never Moved COWs from Google Apps Script...`);
    console.log(`   URL: ${SCRIPT_URL}`);

    const response = await fetch(SCRIPT_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: Failed to fetch from Google Apps Script`,
      );
    }

    const contentType = response.headers.get("content-type");
    const text = await response.text();

    // Check if response is HTML (error page) instead of JSON
    if (text.startsWith("<")) {
      console.error("\n❌ GOOGLE APPS SCRIPT ERROR:");
      console.error("   The endpoint returned HTML instead of JSON.");
      console.error("   This usually means:");
      console.error("   1. The script is not properly deployed");
      console.error("   2. Access permissions are not set to 'Anyone'");
      console.error("   3. The script needs to be redeployed");
      console.error("\n📋 TO FIX:");
      console.error("   1. Open the Google Apps Script project");
      console.error("   2. Click 'Deploy' > 'New Deployment'");
      console.error("   3. Select 'Web app' type");
      console.error("   4. Set 'Execute as' to your account");
      console.error("   5. Set 'Who has access' to 'Anyone'");
      console.error("   6. Deploy and copy the new endpoint URL");
      throw new Error(
        "Google Apps Script returned HTML. Script may not be deployed or access is restricted.",
      );
    }

    let jsonData;
    try {
      jsonData = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse response as JSON:", text.substring(0, 200));
      throw new Error("Response is not valid JSON");
    }

    // The script should return data in one of these formats:
    // 1. { data: [...] } - array of cow objects
    // 2. { cows: [...] } - array of cow objects
    // 3. Direct array of cow objects

    let neverMovedCows = [];

    if (Array.isArray(jsonData)) {
      neverMovedCows = jsonData;
    } else if (Array.isArray(jsonData.data)) {
      neverMovedCows = jsonData.data;
    } else if (Array.isArray(jsonData.cows)) {
      neverMovedCows = jsonData.cows;
    } else {
      throw new Error("Unexpected response format from Google Apps Script");
    }

    // Transform and normalize the data if needed
    const normalizedCows = neverMovedCows.map((cow: any) => {
      // Calculate days on air if not provided
      let daysOnAir = cow.Days_On_Air || 0;
      if (!daysOnAir && cow.First_Deploy_Date) {
        const deployDate = new Date(cow.First_Deploy_Date);
        const today = new Date();
        daysOnAir = Math.floor(
          (today.getTime() - deployDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      return {
        COW_ID: cow.COW_ID || cow.cow_id || "",
        Region: cow.Region || cow.region || "",
        District: cow.District || cow.district || "",
        City: cow.City || cow.city || "",
        Location: cow.Location || cow.location || "",
        Latitude: parseFloat(cow.Latitude || cow.latitude || "0"),
        Longitude: parseFloat(cow.Longitude || cow.longitude || "0"),
        Status: (cow.Status || cow.status || "OFF-AIR").toUpperCase() === "ON-AIR" ? "ON-AIR" : "OFF-AIR",
        First_Deploy_Date: cow.First_Deploy_Date || cow.first_deploy_date || "",
        Last_Deploy_Date: cow.Last_Deploy_Date || cow.last_deploy_date || "",
        Days_On_Air: daysOnAir,
      };
    });

    console.log(
      `✓ Fetched ${normalizedCows.length} Never Moved COWs from Google Apps Script`,
    );

    const stats = {
      total: normalizedCows.length,
      onAir: normalizedCows.filter((c) => c.Status === "ON-AIR").length,
      offAir: normalizedCows.filter((c) => c.Status === "OFF-AIR").length,
    };

    console.log(
      `  ├─ ON-AIR: ${stats.onAir}, OFF-AIR: ${stats.offAir}`,
    );

    res.json({
      cows: normalizedCows,
      stats,
      source: "Google Apps Script",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching Never Moved COW data:", errorMsg);

    res.status(500).json({
      error: "Failed to fetch Never Moved COW data",
      details: errorMsg,
      hint: "Ensure the Google Apps Script is deployed with 'Who has access: Anyone' and check that it returns valid JSON",
      scriptUrl: process.env.NEVER_MOVED_COW_SCRIPT_URL ||
        "https://script.google.com/macros/s/AKfycbyP4BAqz11yoZpz2NA1OUCfYlw5mPcyk8rROrPoaBkWiv3M1dWN-6icFlp32bOu6apf/exec",
    });
  }
};

/**
 * Diagnostic endpoint to test Google Sheet connectivity
 */
const diagnosticHandler: RequestHandler = async (req, res) => {
  const diagnostics = {
    currentSheetId: ACTUAL_SHEET_ID,
    currentGid: GID,
    urlsAttempted: [] as {
      url: string;
      status: number | string;
      success: boolean;
    }[],
    recommendations: [] as string[],
  };

  for (const url of CSV_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      diagnostics.urlsAttempted.push({
        url,
        status: response.status,
        success: response.ok,
      });

      if (response.ok) {
        diagnostics.recommendations.push(
          "✓ Found working URL! Sheet is accessible.",
        );
        break;
      }
    } catch (error) {
      diagnostics.urlsAttempted.push({
        url,
        status: error instanceof Error ? error.message : "Network error",
        success: false,
      });
    }
  }

  if (diagnostics.urlsAttempted.every((u) => !u.success)) {
    diagnostics.recommendations.push(
      "✗ No accessible URLs found. Please check:",
    );
    diagnostics.recommendations.push(
      "1. Is this the actual Sheet ID (from /spreadsheets/d/...) or a published link ID?",
    );
    diagnostics.recommendations.push(
      "2. Has the sheet been published to the web? (File → Share → Publish to web)",
    );
    diagnostics.recommendations.push(
      "3. Can you access the sheet in a browser with this URL:",
    );
    diagnostics.recommendations.push(
      `   https://docs.google.com/spreadsheets/d/${ACTUAL_SHEET_ID}/edit`,
    );
  }

  res.json(diagnostics);
};

router.get("/processed-data", processedDataHandler);
router.get("/never-moved-cows", neverMovedCowHandler);
router.get("/diagnostic", diagnosticHandler);

export default router;
