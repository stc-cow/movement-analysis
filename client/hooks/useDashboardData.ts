import { useEffect, useState } from "react";
import {
  DimCow,
  DimLocation,
  DimEvent,
  CowMovementsFact,
} from "@shared/models";
import { fetchMovementData } from "@/lib/googleSheetsFetcher";

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
 * Hook to load dashboard data from Google Sheets (client-side)
 * Single source of truth: Google Sheets CSV (published to web)
 * No backend required - works 100% on GitHub Pages
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

        console.log("📊 Loading dashboard data from Google Sheets (client-side)...");

        const controller = new AbortController();
        // 30 second timeout for Google Sheets fetch
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const realData = await fetchMovementData();

          clearTimeout(timeoutId);

          // Verify we have meaningful data
          if (!realData.movements || realData.movements.length === 0) {
            throw new Error("No movement data in response");
          }

          if (!isMounted) return;

          console.log(
            `✅ Loaded data: ${realData.movements.length} movements, ${realData.cows.length} cows`,
          );
          setData(realData);
          setError(null);
          setLoading(false);
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
      } catch (err) {
        if (!isMounted) return;

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("❌ Failed to load data from Google Sheets:", errorMessage);
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
