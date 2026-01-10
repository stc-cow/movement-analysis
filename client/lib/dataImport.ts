import { DimCow, DimLocation, CowMovementsFact } from "@shared/models";

// Map Google Sheet column indices to our data structures (A → AE)
// Standard column mapping as per Builder.io specification
interface GoogleSheetRow {
  cow_id: string; // A
  site_label: string; // B
  last_deploy_date: string; // C
  first_deploy_date: string; // D
  ebu_royal_flag: string; // E
  shelter_type: string; // F
  tower_type: string; // G
  tower_system: string; // H
  tower_height: string; // I
  network_technology: string; // J
  vehicle_make: string; // K
  vehicle_plate_number: string; // L
  moved_datetime: string; // M
  moved_month_year: string; // N
  reached_datetime: string; // O
  reached_month_year: string; // P
  from_location: string; // Q
  from_sub_location: string; // R
  from_latitude: string; // S
  from_longitude: string; // T
  to_location: string; // U
  to_sub_location: string; // V
  to_latitude: string; // W
  to_longitude: string; // X
  distance_km: string; // Y
  movement_type: string; // Z
  region_from: string; // AA
  region_to: string; // AB
  vendor: string; // AC
  installation_status: string; // AD
  remarks: string; // AE
}

/**
 * Parse CSV data from Google Sheets
 * Maps columns A-AE to standardized snake_case field names
 */
export function parseCSVData(csvText: string): GoogleSheetRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header row and parse data
  const rows: GoogleSheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    // Require at least 31 cells (A-AE columns)
    if (cells.length >= 31) {
      rows.push({
        cow_id: cells[0]?.trim() || "",
        site_label: cells[1]?.trim() || "",
        last_deploy_date: cells[2]?.trim() || "",
        first_deploy_date: cells[3]?.trim() || "",
        ebu_royal_flag: cells[4]?.trim() || "",
        shelter_type: cells[5]?.trim() || "",
        tower_type: cells[6]?.trim() || "",
        tower_system: cells[7]?.trim() || "",
        tower_height: cells[8]?.trim() || "",
        network_technology: cells[9]?.trim() || "",
        vehicle_make: cells[10]?.trim() || "",
        vehicle_plate_number: cells[11]?.trim() || "",
        moved_datetime: cells[12]?.trim() || "",
        moved_month_year: cells[13]?.trim() || "",
        reached_datetime: cells[14]?.trim() || "",
        reached_month_year: cells[15]?.trim() || "",
        from_location: cells[16]?.trim() || "",
        from_sub_location: cells[17]?.trim() || "",
        from_latitude: cells[18]?.trim() || "",
        from_longitude: cells[19]?.trim() || "",
        to_location: cells[20]?.trim() || "",
        to_sub_location: cells[21]?.trim() || "",
        to_latitude: cells[22]?.trim() || "",
        to_longitude: cells[23]?.trim() || "",
        distance_km: cells[24]?.trim() || "",
        movement_type: cells[25]?.trim() || "",
        region_from: cells[26]?.trim() || "",
        region_to: cells[27]?.trim() || "",
        vendor: cells[28]?.trim() || "",
        installation_status: cells[29]?.trim() || "",
        remarks: cells[30]?.trim() || "",
      });
    }
  }
  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
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
 * Convert Google Sheet rows to CowMovementsFact array
 */
export function convertToMovements(rows: GoogleSheetRow[]): CowMovementsFact[] {
  const movements: CowMovementsFact[] = [];

  rows.forEach((row, index) => {
    if (!row.cowsId || !row.fromLocation || !row.toLocation) {
      return; // Skip incomplete rows
    }

    const isRoyal = row.ebuRoyal?.toLowerCase().includes("royal") || false;
    const isEBU = row.ebuRoyal?.toLowerCase().includes("ebu") || false;

    const movement: CowMovementsFact = {
      SN: index + 1,
      COW_ID: row.cowsId,
      From_Location_ID: normalizeLocationId(row.fromLocation),
      To_Location_ID: normalizeLocationId(row.toLocation),
      Moved_DateTime: parseDateTime(row.movedDateTime),
      Reached_DateTime: parseDateTime(row.reachedDateTime),
      Movement_Type: normalizeMovementType(row.movementType),
      Distance_KM: parseFloat(row.distance) || 0,
      Is_Royal: isRoyal,
      Is_EBU: isEBU,
    };

    movements.push(movement);
  });

  return movements.sort(
    (a, b) =>
      new Date(a.Moved_DateTime).getTime() -
      new Date(b.Moved_DateTime).getTime(),
  );
}

/**
 * Convert Google Sheet rows to DimCow array
 */
export function convertToCows(rows: GoogleSheetRow[]): DimCow[] {
  const cowMap = new Map<string, DimCow>();

  rows.forEach((row) => {
    if (!row.cowsId || cowMap.has(row.cowsId)) {
      return;
    }

    const networkTypes = row.networkTypes?.toUpperCase() || "";
    const cow: DimCow = {
      COW_ID: row.cowsId,
      Tower_Type: normalizeTowerType(row.towerType),
      Tower_Height: parseFloat(row.towerHeight) || 0,
      Network_2G: networkTypes.includes("2G"),
      Network_4G: networkTypes.includes("4G") || networkTypes.includes("LTE"),
      Network_5G: networkTypes.includes("5G"),
      Shelter_Type: normalizeShelterType(row.shelterOutdoor),
      Vendor: row.vendor || "Unknown",
      Installation_Date:
        row.installationStatus || new Date().toISOString().split("T")[0],
    };

    cowMap.set(row.cowsId, cow);
  });

  return Array.from(cowMap.values());
}

/**
 * Convert Google Sheet rows to DimLocation array
 */
export function convertToLocations(rows: GoogleSheetRow[]): DimLocation[] {
  const locationMap = new Map<string, DimLocation>();

  rows.forEach((row) => {
    // Process "From" location
    if (row.fromLocation) {
      const fromId = normalizeLocationId(row.fromLocation);
      if (!locationMap.has(fromId)) {
        locationMap.set(fromId, {
          Location_ID: fromId,
          Location_Name: row.fromLocation,
          Sub_Location: row.fromSubLocation,
          Latitude: parseFloat(row.fromLatitude) || 0,
          Longitude: parseFloat(row.fromLongitude) || 0,
          Region: normalizeRegion(row.regionFrom),
          Location_Type: "Site",
          Owner: row.vendor?.includes("STC") ? "STC" : "ACES",
        });
      }
    }

    // Process "To" location
    if (row.toLocation) {
      const toId = normalizeLocationId(row.toLocation);
      if (!locationMap.has(toId)) {
        locationMap.set(toId, {
          Location_ID: toId,
          Location_Name: row.toLocation,
          Sub_Location: row.toSubLocation,
          Latitude: parseFloat(row.toLatitude) || 0,
          Longitude: parseFloat(row.toLongitude) || 0,
          Region: normalizeRegion(row.regionTo),
          Location_Type: "Site",
          Owner: row.vendor?.includes("STC") ? "STC" : "ACES",
        });
      }
    }
  });

  return Array.from(locationMap.values());
}

/**
 * Normalize location name to ID (e.g., "Riyadh Central" -> "LOC-RIYADH")
 */
function normalizeLocationId(name: string): string {
  return `LOC-${name.toUpperCase().replace(/\s+/g, "-").substring(0, 20)}`;
}

/**
 * Normalize region name to our enum values
 */
function normalizeRegion(
  region: string,
): "WEST" | "EAST" | "CENTRAL" | "SOUTH" {
  const normalized = region?.toUpperCase().trim() || "";

  if (
    normalized.includes("WEST") ||
    normalized.includes("MAKKAH") ||
    normalized.includes("MEDINA")
  ) {
    return "WEST";
  }
  if (
    normalized.includes("EAST") ||
    normalized.includes("EASTERN") ||
    normalized.includes("DAMMAM")
  ) {
    return "EAST";
  }
  if (normalized.includes("CENTRAL") || normalized.includes("RIYADH")) {
    return "CENTRAL";
  }
  if (normalized.includes("SOUTH") || normalized.includes("ASIR")) {
    return "SOUTH";
  }
  // Map NORTH/HAIL to WEST (Western region)
  if (normalized.includes("NORTH") || normalized.includes("HAIL")) {
    return "WEST";
  }

  return "CENTRAL"; // Default
}

/**
 * Normalize tower type
 */
function normalizeTowerType(
  type: string,
): "Macro" | "Small Cell" | "Micro Cell" {
  const normalized = type?.toUpperCase() || "";
  if (normalized.includes("SMALL")) return "Small Cell";
  if (normalized.includes("MICRO")) return "Micro Cell";
  return "Macro";
}

/**
 * Normalize shelter type
 */
function normalizeShelterType(type: string): "Shelter" | "Outdoor" {
  return type?.toUpperCase().includes("SHELTER") ? "Shelter" : "Outdoor";
}

/**
 * Normalize movement type
 */
function normalizeMovementType(type: string): "Full" | "Half" | "Zero" {
  const normalized = type?.toUpperCase() || "";
  if (normalized.includes("FULL")) return "Full";
  if (normalized.includes("HALF")) return "Half";
  return "Zero";
}

/**
 * Parse datetime string from various formats
 */
function parseDateTime(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  try {
    // Try parsing various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    // Fall through to default
  }

  return new Date().toISOString();
}

/**
 * Main function to convert Google Sheet CSV to database format
 */
export function importGoogleSheetData(csvText: string) {
  const rows = parseCSVData(csvText);
  const movements = convertToMovements(rows);
  const cows = convertToCows(rows);
  const locations = convertToLocations(rows);

  return {
    movements,
    cows,
    locations,
    events: [], // No events in the current sheet
  };
}
