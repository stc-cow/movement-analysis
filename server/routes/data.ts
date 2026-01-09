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

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length >= 29 && cells[0]?.trim()) {
      rows.push({
        cowsId: cells[0]?.trim() || "",
        fromLocation: cells[14]?.trim() || "",
        toLocation: cells[18]?.trim() || "",
        fromLatitude: cells[16]?.trim() || "0",
        fromLongitude: cells[17]?.trim() || "0",
        toLatitude: cells[20]?.trim() || "0",
        toLongitude: cells[21]?.trim() || "0",
        movedDateTime: cells[10]?.trim() || "",
        reachedDateTime: cells[12]?.trim() || "",
        distance: cells[22]?.trim() || "0",
        movementType: cells[23]?.trim() || "Zero",
        regionFrom: cells[24]?.trim() || "CENTRAL",
        regionTo: cells[25]?.trim() || "CENTRAL",
        vendor: cells[26]?.trim() || "Unknown",
        ebuRoyal: cells[2]?.trim() || "",
        towerType: cells[4]?.trim() || "Macro",
        towerHeight: cells[6]?.trim() || "0",
      });
    }
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
 * Process CSV data into structured format
 */
function processData(rows: any[]) {
  const movements = [];
  const cowMap = new Map();
  const locationMap = new Map();

  rows.forEach((row, idx) => {
    if (!row.cowsId || !row.fromLocation || !row.toLocation) return;

    // Add movement
    movements.push({
      SN: idx + 1,
      COW_ID: row.cowsId,
      From_Location_ID: `LOC-${row.fromLocation.replace(/\s+/g, "-").substring(0, 20)}`,
      To_Location_ID: `LOC-${row.toLocation.replace(/\s+/g, "-").substring(0, 20)}`,
      Moved_DateTime:
        new Date(row.movedDateTime).toISOString() || new Date().toISOString(),
      Reached_DateTime:
        new Date(row.reachedDateTime).toISOString() || new Date().toISOString(),
      Movement_Type: row.movementType?.includes("Full")
        ? "Full"
        : row.movementType?.includes("Half")
          ? "Half"
          : "Zero",
      Distance_KM: parseFloat(row.distance) || 0,
      Is_Royal: row.ebuRoyal?.toLowerCase().includes("royal") || false,
      Is_EBU: row.ebuRoyal?.toLowerCase().includes("ebu") || false,
    });

    // Add cow
    if (!cowMap.has(row.cowsId)) {
      cowMap.set(row.cowsId, {
        COW_ID: row.cowsId,
        Tower_Type: row.towerType?.includes("Small")
          ? "Small Cell"
          : row.towerType?.includes("Micro")
            ? "Micro Cell"
            : "Macro",
        Tower_Height: parseFloat(row.towerHeight) || 0,
        Network_2G: false,
        Network_4G: true,
        Network_5G: false,
        Shelter_Type: "Outdoor",
        Vendor: row.vendor,
        Installation_Date: new Date().toISOString().split("T")[0],
      });
    }

    // Add from location
    const fromId = `LOC-${row.fromLocation.replace(/\s+/g, "-").substring(0, 20)}`;
    if (!locationMap.has(fromId)) {
      locationMap.set(fromId, {
        Location_ID: fromId,
        Location_Name: row.fromLocation,
        Latitude: parseFloat(row.fromLatitude) || 0,
        Longitude: parseFloat(row.fromLongitude) || 0,
        Region: normalizeRegion(row.regionFrom),
        Location_Type: "Site",
        Owner: "STC",
      });
    }

    // Add to location
    const toId = `LOC-${row.toLocation.replace(/\s+/g, "-").substring(0, 20)}`;
    if (!locationMap.has(toId)) {
      locationMap.set(toId, {
        Location_ID: toId,
        Location_Name: row.toLocation,
        Latitude: parseFloat(row.toLatitude) || 0,
        Longitude: parseFloat(row.toLongitude) || 0,
        Region: normalizeRegion(row.regionTo),
        Location_Type: "Site",
        Owner: "STC",
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

    const processedData = processData(rows);

    console.log(
      `✓ Processed ${processedData.movements.length} movements, ${processedData.cows.length} cows, ${processedData.locations.length} locations`,
    );
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
router.get("/diagnostic", diagnosticHandler);

export default router;
