import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials for migration");
} else {
  console.log("✓ Supabase migration service initialized");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/migrate/import-google-sheets
 * Fetches data from Google Sheets and imports to Supabase
 * IMPORTANT: This is a one-time operation. Should be called via manual trigger only.
 */
router.post("/import-google-sheets", async (req: Request, res: Response) => {
  try {
    console.log("🔄 Starting Google Sheets to Supabase migration...");

    // Fetch movement data from Google Sheets
    const movementResponse = await fetch(
      process.env.MOVEMENT_DATA_CSV_URL ||
        "https://docs.google.com/spreadsheets/d/1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM/export?format=csv&gid=1539310010"
    );

    if (!movementResponse.ok) {
      throw new Error("Failed to fetch movement data from Google Sheets");
    }

    const csvText = await movementResponse.text();
    console.log(
      `✓ Fetched movement data: ${csvText.length} bytes, ${csvText.split("\n").length} rows`
    );

    // Parse CSV and prepare data
    const rows = parseCSV(csvText);
    console.log(`📊 Parsed ${rows.length} rows from Google Sheets`);

    // Process and import data
    const { movements, cows, locations } = processMovementData(rows);

    console.log(`
📥 Importing to Supabase:
   - ${movements.length} movements
   - ${cows.length} cows
   - ${locations.length} locations
    `);

    // Import cows
    if (cows.length > 0) {
      const { error: cowError } = await supabase
        .from("dim_cow")
        .upsert(cows, { onConflict: "cow_id" });

      if (cowError) {
        console.error("❌ Failed to import cows:", cowError);
        throw cowError;
      }
      console.log(`✓ Imported ${cows.length} cows`);
    }

    // Import locations
    if (locations.length > 0) {
      const { error: locError } = await supabase
        .from("dim_location")
        .upsert(locations, { onConflict: "location_id" });

      if (locError) {
        console.error("❌ Failed to import locations:", locError);
        throw locError;
      }
      console.log(`✓ Imported ${locations.length} locations`);
    }

    // Import movements in batches
    if (movements.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < movements.length; i += batchSize) {
        const batch = movements.slice(i, i + batchSize);
        const { error: movError } = await supabase
          .from("movement_data")
          .insert(batch);

        if (movError) {
          console.error(`❌ Failed to import batch ${i / batchSize + 1}:`, movError);
          throw movError;
        }
      }
      console.log(`✓ Imported ${movements.length} movements in ${Math.ceil(movements.length / batchSize)} batches`);
    }

    // Fetch and import never-moved cows
    const neverMovedResponse = await fetch(
      process.env.NEVER_MOVED_COW_CSV_URL ||
        "https://docs.google.com/spreadsheets/d/1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM/export?format=csv&gid=1464106304"
    );

    if (neverMovedResponse.ok) {
      const neverMovedCsv = await neverMovedResponse.text();
      const neverMovedRows = parseCSV(neverMovedCsv);

      if (neverMovedRows.length > 0) {
        const neverMovedData = neverMovedRows.map((row: any) => ({
          cow_id: row.cow_id || row[0],
          region: row.region || row[1] || "",
          remarks: row.remarks || row[2] || "",
        }));

        const { error: neverError } = await supabase
          .from("never_moved_cow")
          .insert(neverMovedData);

        if (neverError) {
          console.error("❌ Failed to import never-moved cows:", neverError);
          // Don't throw - this is secondary data
        } else {
          console.log(`✓ Imported ${neverMovedData.length} never-moved cows`);
        }
      }
    }

    res.json({
      success: true,
      message: "Data migration completed successfully",
      summary: {
        movements: movements.length,
        cows: cows.length,
        locations: locations.length,
      },
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function parseCSV(csv: string): any[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

function processMovementData(rows: any[]) {
  const movements = [];
  const cowMap = new Map();
  const locationMap = new Map();

  rows.forEach((row, idx) => {
    const cowId = row["COWs ID"] || row.cow_id || "";
    if (!cowId.trim()) return;

    const fromLoc = row["From Location"] || row.from_location || "Unknown";
    const toLoc = row["To Location"] || row.to_location || "Unknown";

    // Parse dates
    const parseDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    // Classify Royal/EBU
    const ebuFlag = row["EBU/Royal"] || row.ebu_royal_flag || "";
    let ebuRoyalCategory = "NON EBU";
    if (ebuFlag.toLowerCase() === "royal") ebuRoyalCategory = "ROYAL";
    else if (ebuFlag.toLowerCase() === "ebu") ebuRoyalCategory = "EBU";

    // Add movement
    movements.push({
      sn: idx + 1,
      cow_id: cowId,
      from_location_id: `LOC-${fromLoc.replace(/\s+/g, "-").substring(0, 20)}`,
      from_sub_location: row["From Sub Location"] || row.from_sub_location,
      to_location_id: `LOC-${toLoc.replace(/\s+/g, "-").substring(0, 20)}`,
      to_sub_location: row["TO Sub Location"] || row.to_sub_location,
      moved_datetime: parseDate(row["Moved Date/Time"] || row.moved_datetime || ""),
      reached_datetime: parseDate(row["Reached Date/Time"] || row.reached_datetime || ""),
      movement_type: (row["Movement type"] || row.movement_type || "Zero")
        .includes("Full")
        ? "Full"
        : (row["Movement type"] || row.movement_type || "Zero").includes("Half")
          ? "Half"
          : "Zero",
      distance_km: parseFloat(row.Distance || row.distance_km) || 0,
      is_royal: ebuRoyalCategory === "ROYAL",
      is_ebu: ebuRoyalCategory === "EBU",
      ebu_royal_category: ebuRoyalCategory,
      vendor: row.Vendor || row.vendor || "Unknown",
    });

    // Add cow
    if (!cowMap.has(cowId)) {
      cowMap.set(cowId, {
        cow_id: cowId,
        tower_type: row["Tower Type"] || row.tower_type || "Macro",
        tower_height: parseFloat(row["Tower Hieght"] || row.tower_height) || 0,
        network_2g: (row["2G/4G/LTE/5G"] || "").includes("2G"),
        network_4g:
          (row["2G/4G/LTE/5G"] || "").includes("4G") ||
          (row["2G/4G/LTE/5G"] || "").includes("LTE"),
        network_5g: (row["2G/4G/LTE/5G"] || "").includes("5G"),
        shelter_type: (row["Shelter/Outdoor"] || "").includes("Shelter")
          ? "Shelter"
          : "Outdoor",
        vendor: row.Vendor || row.vendor || "Unknown",
        installation_date: row["Moved Date/Time"]
          ? new Date(row["Moved Date/Time"]).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        remarks: row[" Remarks"] || row.remarks || "",
      });
    }

    // Add from location
    const fromId = `LOC-${fromLoc.replace(/\s+/g, "-").substring(0, 20)}`;
    if (!locationMap.has(fromId)) {
      locationMap.set(fromId, {
        location_id: fromId,
        location_name: fromLoc,
        sub_location: row["From Sub Location"] || "",
        latitude: parseFloat(row["From Latitude"] || "0") || 0,
        longitude: parseFloat(row["From Longitude"] || "0") || 0,
        region: normalizeRegion(row["Region from"] || row.region_from || "CENTRAL"),
        governorate: row["Goverment-"] || row.governorate || "",
        location_type: fromLoc.toUpperCase().includes("WH") ? "Warehouse" : "Site",
        owner: (row.Vendor || row.vendor || "STC").includes("ACES")
          ? "ACES"
          : "STC",
      });
    }

    // Add to location
    const toId = `LOC-${toLoc.replace(/\s+/g, "-").substring(0, 20)}`;
    if (!locationMap.has(toId)) {
      locationMap.set(toId, {
        location_id: toId,
        location_name: toLoc,
        sub_location: row["TO Sub Location"] || "",
        latitude: parseFloat(row["To Latitude"] || "0") || 0,
        longitude: parseFloat(row["To Longitude"] || "0") || 0,
        region: normalizeRegion(row["Region to"] || row.region_to || "CENTRAL"),
        governorate: row["Goverment-"] || row.governorate || "",
        location_type: toLoc.toUpperCase().includes("WH") ? "Warehouse" : "Site",
        owner: (row.Vendor || row.vendor || "STC").includes("ACES")
          ? "ACES"
          : "STC",
      });
    }
  });

  return {
    movements,
    cows: Array.from(cowMap.values()),
    locations: Array.from(locationMap.values()),
  };
}

function normalizeRegion(region: string): string {
  const upper = (region || "").toUpperCase();
  if (upper.includes("WEST") || upper.includes("MAKKAH") || upper.includes("MEDINA"))
    return "WEST";
  if (upper.includes("EAST") || upper.includes("DAMMAM")) return "EAST";
  if (upper.includes("CENTRAL") || upper.includes("RIYADH")) return "CENTRAL";
  if (upper.includes("SOUTH") || upper.includes("ASIR")) return "SOUTH";
  return "CENTRAL";
}

export default router;
