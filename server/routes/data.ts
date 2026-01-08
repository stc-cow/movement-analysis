import { Router, Request, Response } from "express";
import { RequestHandler } from "express";

const router = Router();

// Google Sheet Configuration
// Note: The PACX format is a shared link ID, not a standard sheet ID
// For proper CSV export, the sheet should be published to the web
const SHEET_LINK_ID = "2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz";
const GID = "1539310010";
const CSV_URLS = [
  // Try different URL formats
  `https://docs.google.com/spreadsheets/d/${SHEET_LINK_ID}/export?format=csv&gid=${GID}`,
  // Alternative format for shared links
  `https://docs.google.com/spreadsheets/d/e/${SHEET_LINK_ID}/export?format=csv&gid=${GID}`,
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
function normalizeRegion(region: string): "WEST" | "EAST" | "CENTRAL" | "SOUTH" | "NORTH" {
  const normalized = region?.toUpperCase().trim() || "";
  if (normalized.includes("WEST") || normalized.includes("MAKKAH") || normalized.includes("MEDINA")) return "WEST";
  if (normalized.includes("EAST") || normalized.includes("EASTERN") || normalized.includes("DAMMAM")) return "EAST";
  if (normalized.includes("CENTRAL") || normalized.includes("RIYADH")) return "CENTRAL";
  if (normalized.includes("SOUTH") || normalized.includes("ASIR")) return "SOUTH";
  if (normalized.includes("NORTH") || normalized.includes("HAIL")) return "NORTH";
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
      Moved_DateTime: new Date(row.movedDateTime).toISOString() || new Date().toISOString(),
      Reached_DateTime: new Date(row.reachedDateTime).toISOString() || new Date().toISOString(),
      Movement_Type: row.movementType?.includes("Full") ? "Full" : row.movementType?.includes("Half") ? "Half" : "Zero",
      Distance_KM: parseFloat(row.distance) || 0,
      Is_Royal: row.ebuRoyal?.toLowerCase().includes("royal") || false,
      Is_EBU: row.ebuRoyal?.toLowerCase().includes("ebu") || false,
    });

    // Add cow
    if (!cowMap.has(row.cowsId)) {
      cowMap.set(row.cowsId, {
        COW_ID: row.cowsId,
        Tower_Type: row.towerType?.includes("Small") ? "Small Cell" : row.towerType?.includes("Micro") ? "Micro Cell" : "Macro",
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
    movements: movements.sort((a: any, b: any) => new Date(a.Moved_DateTime).getTime() - new Date(b.Moved_DateTime).getTime()),
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
    console.log("Fetching data from Google Sheets...");
    const response = await fetch(CSV_URL);

    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}`);
    }

    const csvData = await response.text();
    const rows = parseCSVData(csvData);
    const processedData = processData(rows);

    console.log(`✓ Processed ${processedData.movements.length} movements, ${processedData.cows.length} cows, ${processedData.locations.length} locations`);
    res.json(processedData);
  } catch (error) {
    console.error("Error processing Google Sheet data:", error);
    res.status(500).json({
      error: "Failed to process data from Google Sheets",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

router.get("/processed-data", processedDataHandler);

export default router;
