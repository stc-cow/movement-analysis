import { Handler } from "@netlify/functions";

const MOVEMENT_DATA_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1539310010&single=true&output=csv";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

const handler: Handler = async () => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
  };

  try {
    // Fetch CSV from Google Sheets
    const response = await fetch(MOVEMENT_DATA_CSV_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to fetch data",
          cows: [],
          totalCount: 0,
        }),
      };
    }

    const csvText = await response.text();

    if (
      typeof csvText !== "string" ||
      csvText.includes("<html") ||
      csvText.includes("<!DOCTYPE")
    ) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          cows: [],
          totalCount: 0,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          cows: [],
          totalCount: 0,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Track COWs with movements (from movement section - column 0)
    const cowsWithMovements = new Set<string>();
    
    // Extract static COW data (from static section - columns 31+)
    const staticCowData = new Map<string, Record<string, unknown>>();

    console.log("Processing CSV for never-moved COWs...");

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const cells = parseCSVLine(line);
      
      // Column 0: Movement COW ID - track all COWs that have movement records
      const movementCowId = cells[0]?.trim();
      if (movementCowId) {
        cowsWithMovements.add(movementCowId);
      }

      // Columns 31-46: Static COW data (embedded in same row as movement data)
      // Column 31: COW_ID (static)
      // Column 34: Region (AI)
      // Column 35: District (AJ)
      // Column 36: City (AK)
      // Column 38: Location (AM)
      // Column 39: Latitude (AN)
      // Column 40: Longitude (AO)
      // Column 41: Status (AP - ON-AIR/OFF-AIR)
      // Column 42: Last_Deploy_Date (AQ)
      // Column 43: First_Deploy_Date (AR)
      // Column 44: Vendor (AS)
      const staticCowId = cells[31]?.trim();
      
      if (staticCowId) {
        // Store the first complete record found for this COW
        if (!staticCowData.has(staticCowId)) {
          const cowRecord: Record<string, unknown> = {
            COW_ID: staticCowId,
          };

          // Extract all available fields from static section
          if (cells[34]) cowRecord.Region = cells[34].trim();
          if (cells[35]) cowRecord.District = cells[35].trim();
          if (cells[36]) cowRecord.City = cells[36].trim();
          if (cells[38]) cowRecord.Location = cells[38].trim();
          
          // Coordinates - ESSENTIAL for mapping
          if (cells[39]) {
            const lat = parseFloat(cells[39].trim());
            if (!isNaN(lat)) cowRecord.Latitude = lat;
          }
          if (cells[40]) {
            const lon = parseFloat(cells[40].trim());
            if (!isNaN(lon)) cowRecord.Longitude = lon;
          }
          
          // Status and deployment dates
          if (cells[41]) cowRecord.Status = cells[41].trim();
          if (cells[42]) cowRecord.Last_Deploy_Date = cells[42].trim();
          if (cells[43]) cowRecord.First_Deploy_Date = cells[43].trim();
          if (cells[44]) cowRecord.Vendor = cells[44].trim();

          staticCowData.set(staticCowId, cowRecord);
        }
      }
    }

    // Find never-moved cows: Static COWs that DON'T appear in movement data
    const neverMovedCows = Array.from(staticCowData.entries())
      .filter(([cowId]) => !cowsWithMovements.has(cowId))
      .map(([, cowData]) => cowData);

    console.log(`✓ Found ${cowsWithMovements.size} COWs with movements`);
    console.log(`✓ Found ${staticCowData.size} total static COWs`);
    console.log(`✓ Found ${neverMovedCows.length} never-moved COWs`);
    
    if (neverMovedCows.length > 0) {
      console.log(`✓ Sample never-moved COW: ${JSON.stringify(neverMovedCows[0])}`);
    }

    const responseData = {
      cows: neverMovedCows,
      totalCount: neverMovedCows.length,
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in never-moved-cows function:", errorMessage);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: errorMessage,
        cows: [],
        totalCount: 0,
      }),
    };
  }
};

export { handler };
