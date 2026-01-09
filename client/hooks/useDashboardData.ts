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
 * NO fallback to mock data - uses real data only
 * Includes retry logic to handle timing issues with server startup
 */
export function useDashboardData(): UseDashboardDataResult {
  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retryTimeoutId: NodeJS.Timeout | null = null;

    const fetchDataWithRetry = async (
      attempt: number = 1,
      maxAttempts: number = 5,
    ) => {
      try {
        if (!isMounted) return;

        setLoading(true);
        setError(null);

        console.log(`[Attempt ${attempt}/${maxAttempts}] Loading dashboard data from Google Sheets...`);

        // Add initial delay to allow server to be ready
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch("/api/data/processed-data", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.details || `API returned ${response.status}`,
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

        if (!isMounted) return;

        console.log(
          `✓ Loaded real data: ${realData.movements.length} movements, ${realData.cows.length} cows, ${realData.locations.length} locations`,
        );
        setData(realData);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;

        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";

        // Retry on network errors or server timeouts, but not on data validation errors
        const isRetryableError =
          err instanceof TypeError ||
          (err instanceof Error &&
            (err.message.includes("fetch") ||
             err.message.includes("timeout") ||
             err.message.includes("net::") ||
             err.message.includes("Failed to fetch")));

        if (isRetryableError && attempt < maxAttempts) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          console.warn(
            `⚠ Retrying in ${delayMs}ms (${attempt}/${maxAttempts}): ${errorMessage}`,
          );
          retryTimeoutId = setTimeout(() => {
            if (isMounted) {
              fetchDataWithRetry(attempt + 1, maxAttempts);
            }
          }, delayMs);
        } else {
          console.error(
            "Failed to load data from Google Sheets:",
            errorMessage,
          );
          setError(errorMessage);
          setData(null);
          setLoading(false);
        }
      }
    };

    fetchDataWithRetry();

    return () => {
      isMounted = false;
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, []);

  return { data, loading, error };
}
