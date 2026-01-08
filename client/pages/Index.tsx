import { useState, useMemo } from "react";
import { MapPin, Database } from "lucide-react";
import { CardTabs, DASHBOARD_CARDS } from "@/components/dashboard/CardTabs";
import { HeaderFilters } from "@/components/dashboard/HeaderFilters";
import { ExecutiveOverviewCard } from "@/components/dashboard/cards/ExecutiveOverviewCard";
import { SaudiMapCard } from "@/components/dashboard/cards/SaudiMapCard";
import { MovementTypesCard } from "@/components/dashboard/cards/MovementTypesCard";
import { RegionAnalysisCard } from "@/components/dashboard/cards/RegionAnalysisCard";
import { WarehouseIntelligenceCard } from "@/components/dashboard/cards/WarehouseIntelligenceCard";
import { COWUtilizationCard } from "@/components/dashboard/cards/COWUtilizationCard";
import { EventsAnalysisCard } from "@/components/dashboard/cards/EventsAnalysisCard";
import { RoyalEBUAnalysisCard } from "@/components/dashboard/cards/RoyalEBUAnalysisCard";
import { DistanceCostProxyCard } from "@/components/dashboard/cards/DistanceCostProxyCard";
import { AIReadinessCard } from "@/components/dashboard/cards/AIReadinessCard";
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
  const { cows, locations, events, movements: rawMovements } = data || {
    cows: [],
    locations: [],
    events: [],
    movements: [],
  };

  // Enrich movements with classification
  const enrichedMovements = useMemo(
    () => enrichMovements(rawMovements, locations),
    [rawMovements, locations]
  );

  // Calculate metrics
  const filteredMovements = useMemo(
    () => filterMovements(enrichedMovements, filters, locations),
    [enrichedMovements, filters, locations]
  );

  const cowMetrics = useMemo(
    () =>
      cows.map((cow) =>
        calculateCowMetrics(cow.COW_ID, filteredMovements, locations)
      ),
    [filteredMovements, cows, locations]
  );

  const regionMetrics = useMemo(
    () => {
      const regions = ["WEST", "EAST", "CENTRAL", "SOUTH", "NORTH"];
      return regions.map((region) =>
        calculateRegionMetrics(region, cows, locations, filteredMovements, cowMetrics)
      );
    },
    [filteredMovements, cows, locations, cowMetrics]
  );

  const kpis = useMemo(
    () => calculateKPIs(filteredMovements, cows, locations, cowMetrics),
    [filteredMovements, cows, locations, cowMetrics]
  );

  // Get unique years and vendors
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          enrichedMovements.map((m) => new Date(m.Moved_DateTime).getFullYear())
        )
      ).sort((a, b) => b - a),
    [enrichedMovements]
  );

  const vendors = useMemo(
    () => Array.from(new Set(cows.map((c) => c.Vendor))).sort(),
    [cows]
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
        <div className="flex flex-col items-center gap-6 max-w-md">
          <Database className="w-16 h-16 text-red-500" />
          <div className="text-center space-y-3">
            <p className="text-white font-bold text-xl">
              Unable to Load Dashboard Data
            </p>
            <p className="text-sm text-gray-300">{error || "Unknown error"}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-left w-full">
            <p className="text-sm font-semibold text-red-200 mb-2">
              How to fix:
            </p>
            <ol className="text-xs text-red-100 space-y-1 list-decimal list-inside">
              <li>Open your Google Sheet</li>
              <li>Go to File → Share → Publish to web</li>
              <li>Select the correct sheet tab</li>
              <li>Choose "Comma-separated values (.csv)"</li>
              <li>Copy the published link</li>
              <li>Update the sheet ID in the server configuration</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Fixed Header */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-4 py-4 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                COW Analytics
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                STC & ACES Fleet Management
              </p>
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex-1 mx-6">
            <HeaderFilters
              filters={filters}
              onFiltersChange={setFilters}
              vendors={vendors}
              years={years}
            />
          </div>

          {/* Org Badge */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Database className="w-5 h-5" />
            <span className="text-sm font-medium">Live Data</span>
          </div>
        </div>
      </header>

      {/* Card Navigation Tabs */}
      <CardTabs
        tabs={DASHBOARD_CARDS}
        activeTab={activeCard}
        onTabChange={setActiveCard}
      />

      {/* Card Content Area - Full Screen */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-slate-950">
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
          <EventsAnalysisCard
            movements={filteredMovements}
            events={events}
          />
        )}

        {/* Royal/EBU Analysis */}
        {activeCard === "royal" && (
          <RoyalEBUAnalysisCard movements={filteredMovements} />
        )}

        {/* Distance & Cost Proxy */}
        {activeCard === "distance" && (
          <DistanceCostProxyCard
            movements={filteredMovements}
            cows={cows}
            locations={locations}
          />
        )}

        {/* AI Readiness */}
        {activeCard === "ai" && (
          <AIReadinessCard
            cowMetrics={cowMetrics}
            movements={filteredMovements}
            locations={locations}
          />
        )}

        {/* Saudi Map */}
        {activeCard === "map" && (
          <SaudiMapCard
            movements={filteredMovements}
            cows={cows}
            locations={locations}
          />
        )}
      </div>
    </div>
  );
}
