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

    // Count movements per COW and extract coordinates for never-moved ones
    const cowMovementCount = new Map<string, number>();
    const cowCoordinates = new Map<
      string,
      { latitude: number; longitude: number }
    >();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const cells = parseCSVLine(line);
      const cowId = cells[0]?.trim();

      if (cowId) {
        cowMovementCount.set(cowId, (cowMovementCount.get(cowId) || 0) + 1);

        // Extract coordinates from AN (index 39) and AO (index 40)
        // Column AN = Latitude for static COWs
        // Column AO = Longitude for static COWs
        if (cells[39] && cells[40]) {
          const lat = parseFloat(cells[39].trim());
          const lon = parseFloat(cells[40].trim());

          if (!isNaN(lat) && !isNaN(lon)) {
            cowCoordinates.set(cowId, { latitude: lat, longitude: lon });
          }
        }
      }
    }

    // Find never-moved cows (those with exactly 1 movement)
    const neverMovedCows = Array.from(cowMovementCount.entries())
      .filter(([, count]) => count <= 1)
      .map(([cowId]) => {
        const coords = cowCoordinates.get(cowId);
        return {
          COW_ID: cowId,
          ...(coords && {
            Latitude: coords.latitude,
            Longitude: coords.longitude,
          }),
        };
      });

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
        neverMovedCows: [],
        totalCount: 0,
      }),
    };
  }
};

export { handler };
