import { useState, useMemo } from "react";
import { CardTabs, DASHBOARD_CARDS } from "@/components/dashboard/CardTabs";
import { HeaderFilters } from "@/components/dashboard/HeaderFilters";
import { ExecutiveOverviewCard } from "@/components/dashboard/cards/ExecutiveOverviewCard";
import { SaudiMapCard } from "@/components/dashboard/cards/SaudiMapCard";
import { MovementHeatMapCard } from "@/components/dashboard/cards/MovementHeatMapCard";
import { RegionAnalysisCard } from "@/components/dashboard/cards/RegionAnalysisCard";
import { WarehouseIntelligenceCard } from "@/components/dashboard/cards/WarehouseIntelligenceCard";
import { COWUtilizationCard } from "@/components/dashboard/cards/COWUtilizationCard";
import { EventsAnalysisCard } from "@/components/dashboard/cards/EventsAnalysisCard";
import { RoyalEBUAnalysisCard } from "@/components/dashboard/cards/RoyalEBUAnalysisCard";
import { DashboardFilters as DashboardFiltersType } from "@shared/models";
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
    () => filterMovements(enrichedMovements, filters, locations),
    [enrichedMovements, filters, locations],
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
      ).sort((a, b) => b - a),
    [enrichedMovements],
  );

  const vendors = useMemo(
    () => Array.from(new Set(cows.map((c) => c.Vendor))).sort(),
    [cows],
  );

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Loading dashboard data...</p>
          <p className="text-sm text-gray-400">Fetching from Google Sheets</p>
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
              {error?.includes("404")
                ? "Google Sheet is not accessible (404 error)"
                : error || "Unknown error occurred"}
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-left w-full">
            <p className="text-sm font-semibold text-blue-200 mb-3">
              📋 Diagnostic Info:
            </p>
            <p className="text-xs text-blue-100 font-mono bg-slate-900 p-2 rounded mb-2 break-all">
              Error: {error}
            </p>
            <p className="text-xs text-blue-100">
              Check the server logs or visit{" "}
              <code className="bg-slate-900 px-1 rounded">
                /api/data/diagnostic
              </code>{" "}
              for detailed diagnostics.
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-left w-full">
            <p className="text-sm font-semibold text-amber-200 mb-3">
              ⚙️ Steps to Fix:
            </p>
            <ol className="text-xs text-amber-100 space-y-2 list-decimal list-inside">
              <li className="font-semibold">Get the correct Sheet ID:</li>
              <ol className="ml-4 space-y-1 list-disc list-inside">
                <li>Open your Google Sheet in edit mode</li>
                <li>Look at the URL bar</li>
                <li>Copy the ID between /d/ and /edit</li>
              </ol>
              <li className="font-semibold mt-2">Update the configuration:</li>
              <ol className="ml-4 space-y-1 list-disc list-inside">
                <li>
                  In{" "}
                  <code className="bg-slate-900 px-1 rounded">
                    server/routes/data.ts
                  </code>
                </li>
                <li>
                  Change{" "}
                  <code className="bg-slate-900 px-1 rounded">
                    ACTUAL_SHEET_ID
                  </code>{" "}
                  to your Sheet ID
                </li>
                <li>Or set environment variable: GOOGLE_SHEET_ID=YOUR_ID</li>
              </ol>
              <li className="font-semibold mt-2">Test the connection:</li>
              <ol className="ml-4 space-y-1 list-disc list-inside">
                <li>Visit /api/data/diagnostic in your browser</li>
                <li>Check which URLs are working</li>
              </ol>
            </ol>
          </div>

          <div className="bg-gray-700 rounded-lg p-3 w-full">
            <p className="text-xs text-gray-300 text-center">
              For detailed setup instructions, see GOOGLE_SHEET_SETUP.md in the
              project root
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      {/* Fixed Header with Enhanced Design */}
      <header className="flex-shrink-0 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 border-b border-purple-700/40 backdrop-blur-xl shadow-lg shadow-purple-500/20">
        <div className="px-6 py-2 flex items-center justify-between gap-4">
          {/* Logo Section with Modern Styling */}
          <div className="flex items-center gap-2 flex-shrink-0 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F9714b8edf4b54584a6f670699d58193d?format=webp&width=800"
                alt="STC Logo"
                className="h-6 object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="space-y-0">
              <h1 className="text-lg font-bold text-white leading-tight">
                COW Analytics
              </h1>
              <p className="text-xs font-medium text-purple-100 tracking-wide">
                STC COW Management
              </p>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex-1 mx-4">
            <HeaderFilters
              filters={filters}
              onFiltersChange={setFilters}
              vendors={vendors}
              years={years}
            />
          </div>

          {/* ACES Logo with Enhanced Design */}
          <div className="flex-shrink-0 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F517b5a99a8d64dec873728f66fb46b24?format=webp&width=800"
              alt="ACES Logo"
              className="h-16 object-contain relative transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
      </header>

      {/* Card Navigation Tabs */}
      <CardTabs
        tabs={DASHBOARD_CARDS}
        activeTab={activeCard}
        onTabChange={setActiveCard}
      />

      {/* Card Content Area - Full Screen with Enhanced Styling */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950">
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

        {/* Movement Types */}
        {activeCard === "movements" && (
          <MovementTypesCard
            movements={filteredMovements}
            locations={locations}
          />
        )}

        {/* Region Analysis */}
        {activeCard === "regions" && (
          <RegionAnalysisCard
            movements={filteredMovements}
            locations={locations}
            regionMetrics={regionMetrics}
          />
        )}

        {/* Warehouse Intelligence */}
        {activeCard === "warehouse" && (
          <WarehouseIntelligenceCard
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

        {/* Movement Heat Map */}
        {activeCard === "heatmap" && (
          <MovementHeatMapCard
            movements={filteredMovements}
            locations={locations}
          />
        )}
      </div>
    </div>
  );
}
