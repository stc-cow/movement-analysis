import fs from "fs";
import https from "https";

const REGION_BOUNDS = [
  { name: "NORTH", minLat: 30.5, maxLat: 33.1, minLon: 34.0, maxLon: 55.0 },
  { name: "EAST", minLat: 24.0, maxLat: 30.5, minLon: 47.5, maxLon: 55.0 },
  { name: "CENTRAL", minLat: 23.0, maxLat: 27.5, minLon: 41.0, maxLon: 47.5 },
  { name: "WEST", minLat: 19.0, maxLat: 27.5, minLon: 34.0, maxLon: 41.0 },
  { name: "SOUTH", minLat: 16.0, maxLat: 23.0, minLon: 41.0, maxLon: 49.0 },
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
  return "OUT_OF_BOUNDS";
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

async function analyzeFullDistribution() {
  const url =
    "https://cdn.builder.io/o/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F124e69817e1b4085be1859e4dfe70f5e?alt=media&token=f0a49c2c-922e-4255-8e54-4476523ef8fd&apiKey=abc8ab05f7d144f289a582747d3e5ca3";

  console.log("Analyzing full coordinate distribution...\n");

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

        const fromLatIdx = headers.indexOf("from_latitude");
        const fromLonIdx = headers.indexOf("from_longitude");
        const toLatIdx = headers.indexOf("to_latitude");
        const toLonIdx = headers.indexOf("to_longitude");

        const regionDistribution = {
          from: {},
          to: {},
        };

        let processedCount = 0;
        let validCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          processedCount++;
          const values = parseCSVLine(line);
          const fromLat = parseFloat(values[fromLatIdx]);
          const fromLon = parseFloat(values[fromLonIdx]);
          const toLat = parseFloat(values[toLatIdx]);
          const toLon = parseFloat(values[toLonIdx]);

          if (fromLat && fromLon && toLat && toLon) {
            validCount++;
            const fromRegion = getRegionFromCoordinates(fromLat, fromLon);
            const toRegion = getRegionFromCoordinates(toLat, toLon);

            regionDistribution.from[fromRegion] =
              (regionDistribution.from[fromRegion] || 0) + 1;
            regionDistribution.to[toRegion] =
              (regionDistribution.to[toRegion] || 0) + 1;
          }
        }

        console.log(`\n📊 ANALYSIS RESULTS:`);
        console.log(`Total rows processed: ${processedCount}`);
        console.log(`Valid coordinate pairs: ${validCount}`);

        console.log(`\n🗺️  FROM Region Distribution:`);
        Object.entries(regionDistribution.from)
          .sort((a, b) => b[1] - a[1])
          .forEach(([region, count]) => {
            const percentage = ((count / validCount) * 100).toFixed(1);
            console.log(
              `  ${region}: ${count} (${percentage}%)`,
            );
          });

        console.log(`\n🎯 TO Region Distribution:`);
        Object.entries(regionDistribution.to)
          .sort((a, b) => b[1] - a[1])
          .forEach(([region, count]) => {
            const percentage = ((count / validCount) * 100).toFixed(1);
            console.log(
              `  ${region}: ${count} (${percentage}%)`,
            );
          });

        // Show coordinate ranges
        console.log(`\n📍 Coordinate Ranges Found:`);
        let minLat = Infinity,
          maxLat = -Infinity;
        let minLon = Infinity,
          maxLon = -Infinity;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const values = parseCSVLine(line);
          const fromLat = parseFloat(values[fromLatIdx]);
          const fromLon = parseFloat(values[fromLonIdx]);
          const toLat = parseFloat(values[toLatIdx]);
          const toLon = parseFloat(values[toLonIdx]);

          if (fromLat && fromLon && toLat && toLon) {
            minLat = Math.min(minLat, fromLat, toLat);
            maxLat = Math.max(maxLat, fromLat, toLat);
            minLon = Math.min(minLon, fromLon, toLon);
            maxLon = Math.max(maxLon, fromLon, toLon);
          }
        }

        console.log(`  Latitude: ${minLat.toFixed(4)} to ${maxLat.toFixed(4)}`);
        console.log(`  Longitude: ${minLon.toFixed(4)} to ${maxLon.toFixed(4)}`);

        resolve();
      });
    });
  });
}

analyzeFullDistribution();
