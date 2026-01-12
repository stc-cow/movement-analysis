import { useEffect, useState } from "react";
import {
  DimCow,
  DimLocation,
  DimEvent,
  CowMovementsFact,
} from "@shared/models";
import {
  generateMockCows,
  generateMockLocations,
  generateMockMovements,
  generateMockEvents,
} from "@/lib/mockData";

interface DashboardDataResponse {
  movements: CowMovementsFact[];
  cows: DimCow[];
  locations: DimLocation[];
  events: DimEvent[];
}

interface UseDashboardDataResult {
  data: DashboardDataResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to load dashboard data - DISABLED API CALLS
 * Uses mock data to prevent page hanging on slow/unavailable API
 * To re-enable API calls, see the commented code below
 */
export function useDashboardData(): UseDashboardDataResult {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Simulate a small load delay for UX
    const loadMockData = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!isMounted) return;

        const mockData: DashboardDataResponse = {
          cows: generateMockCows(15),
          locations: generateMockLocations(),
          movements: generateMockMovements(200),
          events: generateMockEvents(20),
        };

        console.log(
          `✓ Loaded mock data: ${mockData.movements.length} movements, ${mockData.cows.length} cows, ${mockData.locations.length} locations`,
        );
        setData(mockData);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading mock data:", err);
        setError("Failed to load data");
        setLoading(false);
      }
    };

    loadMockData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading, error };
}

/**
 * COMMENTED: Original API call code (DO NOT USE - causes page hanging)
 * This code would retry up to 5 times and hang the page
 *
 * To re-enable API calls when backend is ready:
 * 1. Uncomment the fetch code below
 * 2. Remove the mock data code above
 * 3. Ensure /api/data/processed-data endpoint is responding
 * 4. Remove the generateMockData imports
 *
 * const fetchDataWithRetry = async (
 *   attempt: number = 1,
 *   maxAttempts: number = 5,
 * ) => {
 *   try {
 *     const response = await fetch("/api/data/processed-data", {
 *       signal: AbortSignal.timeout(15000),
 *     });
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     const realData = await response.json();
 *     setData(realData);
 *     setLoading(false);
 *   } catch (err) {
 *     if (attempt < maxAttempts) {
 *       const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
 *       setTimeout(() => fetchDataWithRetry(attempt + 1, maxAttempts), delay);
 *     } else {
 *       setError("Failed to load data");
 *       setLoading(false);
 *     }
 *   }
 * };
 */
