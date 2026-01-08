import {
  DimCow,
  DimLocation,
  CowMovementsFact,
} from "@shared/models";

// Map Google Sheet column indices to our data structures
interface GoogleSheetRow {
  cowsId: string; // A
  siteLabel: string; // B
  ebuRoyal: string; // C
  shelterOutdoor: string; // D
  towerType: string; // E
  towerSystem: string; // F
  towerHeight: string; // G
  networkTypes: string; // H
  vehicleMake: string; // I
  plateNumber: string; // J
  movedDateTime: string; // K
  movedMonthYear: string; // L
  reachedDateTime: string; // M
  reachedMonthYear: string; // N
  fromLocation: string; // O
  fromSubLocation: string; // P
  fromLatitude: string; // Q
  fromLongitude: string; // R
  toLocation: string; // S
  toSubLocation: string; // T
  toLatitude: string; // U
  toLongitude: string; // V
  distance: string; // W
  movementType: string; // X
  regionFrom: string; // Y
  regionTo: string; // Z
  vendor: string; // AA
  installationStatus: string; // AB
  remarks: string; // AC
}

/**
 * Parse CSV data from Google Sheets
 */
export function parseCSVData(csvText: string): GoogleSheetRow[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header row and parse data
  const rows: GoogleSheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    if (cells.length >= 29) {
      rows.push({
        cowsId: cells[0]?.trim() || "",
        siteLabel: cells[1]?.trim() || "",
        ebuRoyal: cells[2]?.trim() || "",
        shelterOutdoor: cells[3]?.trim() || "",
        towerType: cells[4]?.trim() || "",
        towerSystem: cells[5]?.trim() || "",
        towerHeight: cells[6]?.trim() || "",
        networkTypes: cells[7]?.trim() || "",
        vehicleMake: cells[8]?.trim() || "",
        plateNumber: cells[9]?.trim() || "",
        movedDateTime: cells[10]?.trim() || "",
        movedMonthYear: cells[11]?.trim() || "",
        reachedDateTime: cells[12]?.trim() || "",
        reachedMonthYear: cells[13]?.trim() || "",
        fromLocation: cells[14]?.trim() || "",
        fromSubLocation: cells[15]?.trim() || "",
        fromLatitude: cells[16]?.trim() || "",
        fromLongitude: cells[17]?.trim() || "",
        toLocation: cells[18]?.trim() || "",
        toSubLocation: cells[19]?.trim() || "",
        toLatitude: cells[20]?.trim() || "",
        toLongitude: cells[21]?.trim() || "",
        distance: cells[22]?.trim() || "",
        movementType: cells[23]?.trim() || "",
        regionFrom: cells[24]?.trim() || "",
        regionTo: cells[25]?.trim() || "",
        vendor: cells[26]?.trim() || "",
        installationStatus: cells[27]?.trim() || "",
        remarks: cells[28]?.trim() || "",
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
export function convertToMovements(
  rows: GoogleSheetRow[]
): CowMovementsFact[] {
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
      new Date(b.Moved_DateTime).getTime()
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
      Installation_Date: row.installationStatus || new Date().toISOString().split("T")[0],
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
  return `LOC-${name
    .toUpperCase()
    .replace(/\s+/g, "-")
    .substring(0, 20)}`;
}

/**
 * Normalize region name to our enum values
 */
function normalizeRegion(
  region: string
): "WEST" | "EAST" | "CENTRAL" | "SOUTH" | "NORTH" {
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
  if (normalized.includes("NORTH") || normalized.includes("HAIL")) {
    return "NORTH";
  }

  return "CENTRAL"; // Default
}

/**
 * Normalize tower type
 */
function normalizeTowerType(
  type: string
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
