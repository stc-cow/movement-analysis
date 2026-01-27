/**
 * Map Saudi Arabia coordinates (latitude, longitude) to regions
 * Based on Saudi administrative boundaries
 * 
 * Regions:
 * - NORTH: Northern region (Tabuk, Northern Borders)
 * - WEST: Western region (Makkah, Madinah)
 * - CENTRAL: Central region (Riyadh, Qassim)
 * - EAST: Eastern region (Eastern Province)
 * - SOUTH: Southern region (Asir, Jazan, Najran)
 */

export interface RegionBounds {
  name: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

// Saudi Arabia's major regions with non-overlapping geographic boundaries
// Carefully designed to avoid overlaps and ensure proper regional classification
const REGION_BOUNDS: RegionBounds[] = [
  // NORTH: Tabuk, Northern Borders - highest latitude
  {
    name: "NORTH",
    minLat: 30.5,
    maxLat: 33.1,
    minLon: 34.0,
    maxLon: 55.0, // Extends across full width when in northern latitudes
  },
  // EAST: Eastern Province (Dammam, Khobar) - eastern longitude
  {
    name: "EAST",
    minLat: 24.0,
    maxLat: 30.5,
    minLon: 47.5,
    maxLon: 55.0,
  },
  // CENTRAL: Riyadh, Qassim - central longitude and latitude
  {
    name: "CENTRAL",
    minLat: 23.0,
    maxLat: 27.5,
    minLon: 41.0,
    maxLon: 47.5,
  },
  // WEST: Makkah, Madinah - western coast
  {
    name: "WEST",
    minLat: 19.0,
    maxLat: 27.5,
    minLon: 34.0,
    maxLon: 41.0,
  },
  // SOUTH: Asir, Jazan, Najran - southern regions
  {
    name: "SOUTH",
    minLat: 16.0,
    maxLat: 23.0,
    minLon: 41.0,
    maxLon: 49.0,
  },
];

/**
 * Determine which region a coordinate belongs to
 * Returns the region code (NORTH, WEST, CENTRAL, EAST, SOUTH)
 * If coordinate doesn't match any region, returns CENTRAL as default
 */
export function getRegionFromCoordinates(
  latitude: number,
  longitude: number,
): string {
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return "CENTRAL"; // Default fallback
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

  // If no exact match, find the closest region
  return findClosestRegion(latitude, longitude);
}

/**
 * Find the closest region based on distance from center points
 */
function findClosestRegion(latitude: number, longitude: number): string {
  const regionCenters: Record<string, [number, number]> = {
    NORTH: [32.0, 36.5],
    WEST: [22.3, 39.2],
    CENTRAL: [24.7, 46.6],
    EAST: [26.2, 50.2],
    SOUTH: [19.5, 43.5],
  };

  let closestRegion = "CENTRAL";
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

/**
 * Map a region code to its display name
 */
export const REGION_NAMES: Record<string, string> = {
  NORTH: "Northern",
  WEST: "Makkah",
  CENTRAL: "Riyadh",
  EAST: "Eastern Province",
  SOUTH: "Asir",
};
