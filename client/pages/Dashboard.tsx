import { useEffect, useState, useMemo } from "react";
import { CardTabs, DASHBOARD_CARDS } from "@/components/dashboard/CardTabs";
import { HeaderFilters } from "@/components/dashboard/HeaderFilters";
import { ExecutiveOverviewCard } from "@/components/dashboard/cards/ExecutiveOverviewCard";
import { SaudiMapCard } from "@/components/dashboard/cards/SaudiMapCard";
import { MovementHeatMapCard } from "@/components/dashboard/cards/MovementHeatMapCard";
import { StaticCowMapCard } from "@/components/dashboard/cards/StaticCowMapCard";
import { NeverMovedCowCard } from "@/components/dashboard/cards/NeverMovedCowCard";
import { WarehouseIntelligenceCard } from "@/components/dashboard/cards/WarehouseIntelligenceCard";
import { WarehouseHubTimeCard } from "@/components/dashboard/cards/WarehouseHubTimeCard";
import { COWUtilizationCard } from "@/components/dashboard/cards/COWUtilizationCard";
import { EventsAnalysisCard } from "@/components/dashboard/cards/EventsAnalysisCard";
import { RoyalEBUAnalysisCard } from "@/components/dashboard/cards/RoyalEBUAnalysisCard";
import { TopEventsMovementCard } from "@/components/dashboard/cards/TopEventsMovementCard";
import {
  DashboardFilters as DashboardFiltersType,
  NeverMovedCow,
} from "@shared/models";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  enrichMovements,
  calculateCowMetrics,
  calculateRegionMetrics,
  filterMovements,
  calculateKPIs,
} from "@/lib/analytics";

export default function Dashboard() {
  // Load real data from Google Sheets API
  const { data, loading, error } = useDashboardData();

  // Dashboard filters state - MUST be before any conditional returns
  const [filters, setFilters] = useState<DashboardFiltersType>({});
  const [activeCard, setActiveCard] = useState("executive");
  const [neverMovedCows, setNeverMovedCows] = useState<NeverMovedCow[]>([]);
  const [neverMovedLoading, setNeverMovedLoading] = useState(false);

  // Fetch "Never Moved COWs" data - single request, no retries
  useEffect(() => {
    const fetchNeverMovedCowsData = async () => {
      try {
        setNeverMovedLoading(true);

        console.log(`📊 Loading Never Moved COWs from local JSON...`);

        const { loadNeverMovedCows } = await import("@/lib/localDataFetcher");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const result = await loadNeverMovedCows();

          clearTimeout(timeoutId);

          setNeverMovedCows(result || []);
          console.log(`✅ Loaded ${result?.length || 0} Never Moved COWs`);
          setNeverMovedLoading(false);
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
      } catch (err) {
        console.warn("⚠️  Never-moved COWs fetch failed:", err);
        // Don't error out - just leave empty
        setNeverMovedCows([]);
        setNeverMovedLoading(false);
      }
    };

    fetchNeverMovedCowsData();
  }, []);

  // Initialize with empty data and update when data loads
  const {
    cows,
    locations,
    events,
    movements: rawMovements,
  } = data || {
    cows: [],
    locations: [],
    events: [],
    movements: [],
  };

  // Enrich movements with classification
  const enrichedMovements = useMemo(
    () => enrichMovements(rawMovements, locations),
    [rawMovements, locations],
  );

  // Calculate metrics
  const filteredMovements = useMemo(
    () => filterMovements(enrichedMovements, filters, locations, cows),
    [enrichedMovements, filters, locations, cows],
  );

  const cowMetrics = useMemo(
    () =>
      cows.map((cow) =>
        calculateCowMetrics(cow.COW_ID, filteredMovements, locations),
      ),
    [filteredMovements, cows, locations],
  );

  const regionMetrics = useMemo(() => {
    const regions = ["WEST", "EAST", "CENTRAL", "SOUTH"];
    return regions.map((region) =>
      calculateRegionMetrics(
        region,
        cows,
        locations,
        filteredMovements,
        cowMetrics,
      ),
    );
  }, [filteredMovements, cows, locations, cowMetrics]);

  const kpis = useMemo(
    () => calculateKPIs(filteredMovements, cows, locations, cowMetrics),
    [filteredMovements, cows, locations, cowMetrics],
  );

  // Get unique years and vendors
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          enrichedMovements.map((m) =>
            new Date(m.Moved_DateTime).getFullYear(),
          ),
        ),
      )
        .filter((y) => y !== 2026)
        .sort((a, b) => b - a),
    [enrichedMovements],
  );

  const vendors = useMemo(() => {
    // Get vendors from movements (not from COWs)
    // This matches the filter logic which filters by movement.Vendor
    const allVendors = Array.from(
      new Set(enrichedMovements.map((m) => m.Vendor)),
    );
    const nonUnknownVendors = allVendors
      .filter((v) => v && v !== "Unknown")
      .sort();

    // Debug logging
    console.debug(
      `[Vendors] Total movements: ${enrichedMovements.length}, All unique vendors: ${JSON.stringify(allVendors)}, Non-unknown: ${JSON.stringify(nonUnknownVendors)}`,
    );

    return nonUnknownVendors;
  }, [enrichedMovements]);

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Loading Dashboard data</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (!data) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="flex flex-col items-center gap-6 max-w-2xl">
          <div className="text-center space-y-3">
            <p className="text-white font-bold text-2xl">
              Unable to Load Dashboard Data
            </p>
            <p className="text-sm text-gray-300">
              {error || "Unknown error occurred"}
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-left w-full">
            <p className="text-sm font-semibold text-blue-200 mb-3">
              📋 Error Details:
            </p>
            <p className="text-xs text-blue-100 font-mono bg-slate-900 p-2 rounded mb-2 break-all">
              {error}
            </p>
            <p className="text-xs text-blue-100">
              Data is loaded from local JSON files in the{" "}
              <code className="bg-slate-900 px-1 rounded">/public</code> folder.
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-left w-full">
            <p className="text-sm font-semibold text-amber-200 mb-3">
              ⚙️ Troubleshooting Steps:
            </p>
            <ol className="text-xs text-amber-100 space-y-2 list-decimal list-inside">
              <li className="font-semibold">Verify JSON files exist:</li>
              <ol className="ml-4 space-y-1 list-disc list-inside">
                <li>
                  Check that{" "}
                  <code className="bg-slate-900 px-1 rounded">
                    public/movement-data.json
                  </code>{" "}
                  exists
                </li>
                <li>
                  Check that{" "}
                  <code className="bg-slate-900 px-1 rounded">
                    public/never-moved-cows.json
                  </code>{" "}
                  exists
                </li>
              </ol>
              <li className="font-semibold mt-2">Regenerate JSON files:</li>
              <ol className="ml-4 space-y-1 list-disc list-inside">
                <li>
                  Run:{" "}
                  <code className="bg-slate-900 px-1 rounded">
                    pnpm exec node convert-csv-to-json.mjs
                  </code>
                </li>
                <li>This will update both JSON files from CSV sources</li>
              </ol>
              <li className="font-semibold mt-2">Check browser console:</li>
              <ol className="ml-4 space-y-1 list-disc list-inside">
                <li>Open DevTools (F12) and check the Console tab</li>
                <li>Look for specific error messages about JSON loading</li>
              </ol>
              <li className="font-semibold mt-2">Verify server is running:</li>
              <ol className="ml-4 space-y-1 list-disc list-inside">
                <li>Dev server must be running to serve static files</li>
                <li>
                  Run:{" "}
                  <code className="bg-slate-900 px-1 rounded">
                    pnpm run dev
                  </code>
                </li>
              </ol>
            </ol>
          </div>

          <div className="bg-gray-700 rounded-lg p-3 w-full">
            <p className="text-xs text-gray-300 text-center">
              See API_REMOVAL_COMPLETE.md for detailed setup and troubleshooting
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      {/* Fixed Header with Enhanced Design - Responsive */}
      <header className="flex-shrink-0 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 border-b border-purple-700/40 backdrop-blur-xl shadow-lg shadow-purple-500/20">
        <div className="px-3 sm:px-4 md:px-6 py-2 md:py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
          {/* Logo Section with Modern Styling */}
          <div className="flex items-center gap-2 flex-shrink-0 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F9714b8edf4b54584a6f670699d58193d?format=webp&width=800"
                alt="STC Logo"
                className="h-5 sm:h-6 object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="space-y-0">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                COW Analytics
              </h1>
              <p className="text-xs font-medium text-purple-100 tracking-wide hidden sm:block">
                STC COW Management
              </p>
            </div>
          </div>

          {/* Filters Section - Full width on mobile, flex-1 on desktop */}
          <div className="flex-1 w-full md:w-auto md:mx-4 min-w-0">
            <HeaderFilters
              filters={filters}
              onFiltersChange={setFilters}
              vendors={vendors}
              years={years}
            />
          </div>

          {/* ACES Logo with Enhanced Design */}
          <div className="flex-shrink-0 group cursor-pointer hidden sm:block">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F517b5a99a8d64dec873728f66fb46b24?format=webp&width=800"
              alt="ACES Logo"
              className="h-12 sm:h-14 md:h-16 object-contain relative transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
        {/* Data Range Info */}
        <div className="w-full border-t border-purple-600/30 px-3 sm:px-4 md:px-6 py-2">
          <p className="text-xs text-purple-100 font-medium">
            Analysis applied on Movement data from Jan 2021 to Oct 2025
          </p>
        </div>
      </header>

      {/* Card Navigation Tabs */}
      <CardTabs
        tabs={DASHBOARD_CARDS}
        activeTab={activeCard}
        onTabChange={setActiveCard}
      />

      {/* Card Content Area - Fully responsive */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-white w-full">
        {/* Executive Overview */}
        {activeCard === "executive" && (
          <ExecutiveOverviewCard
            kpis={kpis}
            cows={cows}
            locations={locations}
            movements={filteredMovements}
            cowMetrics={cowMetrics}
          />
        )}

        {/* Warehouse Intelligence */}
        {activeCard === "warehouse" && (
          <WarehouseIntelligenceCard
            movements={filteredMovements}
            locations={locations}
          />
        )}

        {/* Warehouse Hub Time */}
        {activeCard === "warehouse-hub-time" && (
          <WarehouseHubTimeCard
            movements={filteredMovements}
            locations={locations}
          />
        )}

        {/* COW Utilization */}
        {activeCard === "utilization" && (
          <COWUtilizationCard cowMetrics={cowMetrics} />
        )}

        {/* Events Analysis */}
        {activeCard === "events" && (
          <EventsAnalysisCard movements={filteredMovements} events={events} />
        )}

        {/* Royal/EBU Analysis */}
        {activeCard === "royal" && (
          <RoyalEBUAnalysisCard movements={filteredMovements} />
        )}

        {/* Saudi Map */}
        {activeCard === "map" && (
          <SaudiMapCard
            movements={filteredMovements}
            cows={cows}
            locations={locations}
          />
        )}

        {/* Static COWs Map */}
        {activeCard === "heatmap" && (
          <StaticCowMapCard
            movements={filteredMovements}
            cows={cows}
            locations={locations}
          />
        )}

        {/* Never Moved COWs */}
        {activeCard === "never-moved" && (
          <NeverMovedCowCard neverMovedCows={neverMovedCows} />
        )}

        {/* Top Events Movement */}
        {activeCard === "top-events" && (
          <TopEventsMovementCard movements={filteredMovements} />
        )}
      </div>
    </div>
  );
}
