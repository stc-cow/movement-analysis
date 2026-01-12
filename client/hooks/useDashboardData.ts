import { useEffect, useState } from "react";
import {
  DimCow,
  DimLocation,
  DimEvent,
  CowMovementsFact,
} from "@shared/models";

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
 * Single source of truth: Google Sheets CSV
 * No retries - single timeout-based request only to prevent hanging
 */
export function useDashboardData(): UseDashboardDataResult {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (!isMounted) return;

        setLoading(true);
        setError(null);

        console.log("Loading dashboard data from Google Sheets...");

        const controller = new AbortController();
        // 10 second timeout - strict, no retries
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch("/api/data/processed-data", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const realData = (await response.json()) as DashboardDataResponse;

        // Verify we have meaningful data
        if (!realData.movements || realData.movements.length === 0) {
          throw new Error("No movement data in response");
        }

        if (!isMounted) return;

        console.log(
          `✓ Loaded data: ${realData.movements.length} movements, ${realData.cows.length} cows`,
        );
        setData(realData);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to load data:", errorMessage);
        setError(errorMessage);
        setData(null);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading, error };
}
