import { useState, useMemo } from "react";
import { DashboardFiltersComponent } from "@/components/dashboard/DashboardFilters";
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { MovementAnalytics } from "@/components/dashboard/MovementAnalytics";
import { WarehouseIntelligence } from "@/components/dashboard/WarehouseIntelligence";
import { CowUtilization } from "@/components/dashboard/CowUtilization";
import { EventRoyalAnalysis } from "@/components/dashboard/EventRoyalAnalysis";
import { DashboardFilters as DashboardFiltersType } from "@shared/models";
import { generateMockDatabase } from "@/lib/mockData";
import {
  enrichMovements,
  calculateCowMetrics,
  calculateRegionMetrics,
  filterMovements,
  calculateKPIs,
} from "@/lib/analytics";
import { MapPin, Database } from "lucide-react";

export default function Dashboard() {
  // Load mock data
  const { cows, locations, events, movements: rawMovements } =
    generateMockDatabase();

  // Enrich movements with classification
  const enrichedMovements = useMemo(
    () => enrichMovements(rawMovements, locations),
    [rawMovements, locations]
  );

  // Dashboard filters state
  const [filters, setFilters] = useState<DashboardFiltersType>({});

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
  const years = Array.from(
    new Set(
      enrichedMovements.map((m) => new Date(m.Moved_DateTime).getFullYear())
    )
  ).sort((a, b) => b - a);

  const vendors = Array.from(new Set(cows.map((c) => c.Vendor))).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  COW Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Comprehensive Cell on Wheels Fleet Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Database className="w-5 h-5" />
              <span className="text-sm font-medium">STC & ACES</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Filters */}
          <DashboardFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            vendors={vendors}
            years={years}
          />

          {/* KPI Strip */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="inline-block w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></span>
              Key Performance Indicators
            </h2>
            <KpiStrip
              totalCOWs={kpis.totalCOWs}
              totalMovements={kpis.totalMovements}
              totalDistanceKM={kpis.totalDistanceKM}
              activeCOWs={kpis.activeCOWs}
              staticCOWs={kpis.staticCOWs}
              avgMovesPerCOW={kpis.avgMovesPerCOW}
            />
          </div>

          {/* Movement Analytics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="inline-block w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></span>
              Movement Analytics
            </h2>
            <MovementAnalytics movements={filteredMovements} locations={locations} />
          </div>

          {/* Warehouse Intelligence */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="inline-block w-1 h-6 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></span>
              Warehouse Intelligence
            </h2>
            <WarehouseIntelligence
              movements={filteredMovements}
              locations={locations}
            />
          </div>

          {/* COW Utilization */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="inline-block w-1 h-6 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full"></span>
              COW Utilization Analysis
            </h2>
            <CowUtilization cowMetrics={cowMetrics} />
          </div>

          {/* Event & Royal Analysis */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="inline-block w-1 h-6 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></span>
              Event & Royal Analysis
            </h2>
            <EventRoyalAnalysis movements={filteredMovements} events={events} />
          </div>

          {/* Footer Info */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Data Model
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Immutable fact table with enriched dimensions for COWs, locations,
                  and events
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Analytics Engine
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Rule-based movement classification with distance calculations and
                  utilization metrics
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  ML Readiness
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Engineered features for demand forecasting and optimal asset
                  allocation
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
