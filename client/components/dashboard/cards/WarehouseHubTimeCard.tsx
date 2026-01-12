import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CowMovementsFact, DimLocation } from "@shared/models";
import {
  calculateWarehouseHubTime,
  getTopCowsByStayDays,
  getWarehousesHighestTotalStay,
  calculateOffAirWarehouseStays,
  getCOWOffAirDetails,
} from "@/lib/analytics";
import { COWOffAirDetailsModal } from "./COWOffAirDetailsModal";

interface WarehouseHubTimeCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

const CHART_COLOR = "#3b82f6";

export function WarehouseHubTimeCard({
  movements,
  locations,
}: WarehouseHubTimeCardProps) {
  // State for filter and modal
  const [selectedCowIds, setSelectedCowIds] = useState<string[]>([]);
  const [selectedCowForModal, setSelectedCowForModal] = useState<string | null>(
    null,
  );

  // Calculate warehouse hub times
  const hubTimes = calculateWarehouseHubTime(movements, locations);

  // Calculate off-air warehouse stays
  const offAirStays = calculateOffAirWarehouseStays(movements, locations);

  // Get all unique COW IDs for filter dropdown
  const allCowIds = useMemo(
    () =>
      Array.from(new Set(movements.map((m) => m.COW_ID)))
        .filter((id) => id)
        .sort(),
    [movements],
  );

  // Filter hub times based on selected COWs
  const filteredHubTimes = useMemo(
    () =>
      selectedCowIds.length > 0
        ? hubTimes.filter((ht) => selectedCowIds.includes(ht.cowId))
        : hubTimes,
    [hubTimes, selectedCowIds],
  );

  // Get analytics data from filtered hub times
  const topCows = getTopCowsByStayDays(filteredHubTimes, 10);
  const topWarehouses = getWarehousesHighestTotalStay(filteredHubTimes, 10);

  // Chart data
  const cowsData = topCows.map((item) => ({
    name: item.cowId,
    "Stay Days": item.totalStayDays,
  }));

  const warehouseTotalData = topWarehouses.map((item) => ({
    name: item.warehouseName,
    "Total Days": item.totalStayDays,
  }));

  // Handle COW ID filter change
  const handleCowFilterChange = (cowId: string, isChecked: boolean) => {
    setSelectedCowIds((prev) =>
      isChecked ? [...prev, cowId] : prev.filter((id) => id !== cowId),
    );
  };

  // Handle chart/table click to open modal
  const handleOpenModal = (cowId: string) => {
    setSelectedCowForModal(cowId);
  };

  // Get modal data
  const modalData = selectedCowForModal
    ? getCOWOffAirDetails(selectedCowForModal, offAirStays)
    : null;

  return (
    <>
      <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
        {/* COW ID Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Filter by COW ID
          </div>
          <div className="flex flex-wrap gap-2">
            {allCowIds.slice(0, 15).map((cowId) => (
              <label
                key={cowId}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedCowIds.includes(cowId)}
                  onChange={(e) =>
                    handleCowFilterChange(cowId, e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {cowId}
                </span>
              </label>
            ))}
            {allCowIds.length > 15 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                +{allCowIds.length - 15} more COWs
              </div>
            )}
          </div>
          {selectedCowIds.length > 0 && (
            <button
              onClick={() => setSelectedCowIds([])}
              className="mt-3 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Hub Stays
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {filteredHubTimes.length}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Stay Days
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(
                filteredHubTimes.reduce((sum, ht) => sum + ht.stayDays, 0) *
                  100,
              ) / 100}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Average Stay Days
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {filteredHubTimes.length > 0
                ? Math.round(
                    (filteredHubTimes.reduce(
                      (sum, ht) => sum + ht.stayDays,
                      0,
                    ) /
                      filteredHubTimes.length) *
                      100,
                  ) / 100
                : 0}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 flex-1 min-h-0">
          {/* Top COWs by Total Stay Days - Now Clickable */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col h-80 sm:h-96">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
              Top COWs by Total Stay Days (Click to view details)
            </h3>
            {cowsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cowsData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => `${value} days`}
                  />
                  <Bar
                    dataKey="Stay Days"
                    fill={CHART_COLOR}
                    onClick={(state: any) => {
                      if (state && state.name) {
                        handleOpenModal(state.name);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No warehouse stay data available
              </div>
            )}
          </div>
        </div>

        {/* Warehouses with Highest Total Stay Days - Full Width */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col h-80 sm:h-96">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Warehouses with Highest Total Stay Days
          </h3>
          {warehouseTotalData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={warehouseTotalData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => `${value} days`}
                />
                <Bar dataKey="Total Days" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No warehouse data available
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedCowForModal && modalData && (
        <COWOffAirDetailsModal
          open={!!selectedCowForModal}
          onOpenChange={(open) => {
            if (!open) setSelectedCowForModal(null);
          }}
          cowId={selectedCowForModal}
          totalMovements={modalData.totalMovements}
          totalIdleDays={modalData.totalIdleDays}
          avgIdleDays={modalData.avgIdleDays}
          topWarehouse={modalData.topWarehouse}
          stays={modalData.stays}
        />
      )}
    </>
  );
}
