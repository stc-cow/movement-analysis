import fs from "fs";
import https from "https";

// Copy the region mapping logic
const REGION_BOUNDS = [
  {
    name: "NORTH",
    minLat: 30.5,
    maxLat: 33.1,
    minLon: 34.0,
    maxLon: 55.0,
  },
  {
    name: "EAST",
    minLat: 24.0,
    maxLat: 30.5,
    minLon: 47.5,
    maxLon: 55.0,
  },
  {
    name: "CENTRAL",
    minLat: 23.0,
    maxLat: 27.5,
    minLon: 41.0,
    maxLon: 47.5,
  },
  {
    name: "WEST",
    minLat: 19.0,
    maxLat: 27.5,
    minLon: 34.0,
    maxLon: 41.0,
  },
  {
    name: "SOUTH",
    minLat: 16.0,
    maxLat: 23.0,
    minLon: 41.0,
    maxLon: 49.0,
  },
];

function getRegionFromCoordinates(latitude, longitude) {
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return "UNKNOWN";
  }

  for (const bounds of REGION_BOUNDS) {
    if (
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat &&
      longitude >= bounds.minLon &&
      longitude <= bounds.maxLon
    ) {
      return bounds.name;
    }
  }

  // Find closest
  const regionCenters = {
    NORTH: [32.0, 36.5],
    WEST: [22.3, 39.2],
    CENTRAL: [24.7, 46.6],
    EAST: [26.2, 50.2],
    SOUTH: [19.5, 43.5],
  };

  let closestRegion = "UNKNOWN";
  let closestDistance = Infinity;

  for (const [region, [centerLat, centerLon]] of Object.entries(
    regionCenters,
  )) {
    const distance = Math.sqrt(
      Math.pow(latitude - centerLat, 2) + Math.pow(longitude - centerLon, 2),
    );
    if (distance < closestDistance) {
      closestDistance = distance;
      closestRegion = region;
    }
  }

  return closestRegion;
}

function parseCSVLine(line) {
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
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function downloadAndAnalyze() {
  const url =
    "https://cdn.builder.io/o/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F124e69817e1b4085be1859e4dfe70f5e?alt=media&token=f0a49c2c-922e-4255-8e54-4476523ef8fd&apiKey=abc8ab05f7d144f289a582747d3e5ca3";

  console.log("Downloading and analyzing CSV...\n");

  return new Promise((resolve) => {
    https.get(url, (response) => {
      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => {
        const lines = data.trim().split("\n");
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine);

        // Find column indices
        const fromLatIdx = headers.indexOf("from_latitude");
        const fromLonIdx = headers.indexOf("from_longitude");
        const toLatIdx = headers.indexOf("to_latitude");
        const toLonIdx = headers.indexOf("to_longitude");
        const fromLocIdx = headers.indexOf("from_location");
        const toLocIdx = headers.indexOf("to_locatio"); // Note: CSV has typo

        console.log(`Headers found:`);
        console.log(`  from_latitude: ${fromLatIdx}`);
        console.log(`  from_longitude: ${fromLonIdx}`);
        console.log(`  to_latitude: ${toLatIdx}`);
        console.log(`  to_longitude: ${toLonIdx}`);
        console.log(`  from_location: ${fromLocIdx}`);
        console.log(`  to_location: ${toLocIdx}\n`);

        const regionCounts = {};
        const samples = [];

        for (let i = 1; i < Math.min(lines.length, 100); i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = parseCSVLine(line);
          const fromLat = parseFloat(values[fromLatIdx]);
          const fromLon = parseFloat(values[fromLonIdx]);
          const toLat = parseFloat(values[toLatIdx]);
          const toLon = parseFloat(values[toLonIdx]);
          const fromLoc = values[fromLocIdx];
          const toLoc = values[toLocIdx];

          if (fromLat && fromLon && toLat && toLon) {
            const fromRegion = getRegionFromCoordinates(fromLat, fromLon);
            const toRegion = getRegionFromCoordinates(toLat, toLon);

            regionCounts[fromRegion] =
              (regionCounts[fromRegion] || 0) + 1;
            regionCounts[toRegion] =
              (regionCounts[toRegion] || 0) + 1;

            if (samples.length < 10) {
              samples.push({
                fromLoc,
                fromLat,
                fromLon,
                fromRegion,
                toLoc,
                toLat,
                toLon,
                toRegion,
              });
            }
          }
        }

        console.log("Sample coordinates (first 10 rows):");
        samples.forEach((s, idx) => {
          console.log(`\n${idx + 1}.`);
          console.log(`  ${s.fromLoc} (${s.fromLat}, ${s.fromLon}) -> ${s.fromRegion}`);
          console.log(`  ${s.toLoc} (${s.toLat}, ${s.toLon}) -> ${s.toRegion}`);
        });

        console.log("\n\nRegion distribution (first 100 rows):");
        Object.entries(regionCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([region, count]) => {
            console.log(`  ${region}: ${count}`);
          });

        resolve();
      });
    });
  });
}

downloadAndAnalyze();
