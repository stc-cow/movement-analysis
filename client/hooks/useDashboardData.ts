import { useEffect, useState } from "react";
import { DimCow, DimLocation, DimEvent, CowMovementsFact } from "@shared/models";

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
 * Hook to load dashboard data from Google Sheets API
 * NO fallback to mock data - uses real data only
 */
export function useDashboardData(): UseDashboardDataResult {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Loading dashboard data from Google Sheets...");

        // Load real data from Google Sheets API
        const response = await fetch("/api/data/processed-data", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.details || `API returned ${response.status}`
          );
        }

        const realData = (await response.json()) as DashboardDataResponse;

        // Verify we have meaningful data
        if (realData.movements.length === 0) {
          throw new Error("No movement data found in Google Sheet");
        }

        if (realData.cows.length === 0) {
          throw new Error("No COW data found in Google Sheet");
        }

        console.log(
          `✓ Loaded real data: ${realData.movements.length} movements, ${realData.cows.length} cows, ${realData.locations.length} locations`
        );
        setData(realData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Failed to load data from Google Sheets:", errorMessage);
        setError(errorMessage);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, loading, error };
}
