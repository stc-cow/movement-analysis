import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CowMovementsFact, DimLocation } from "@shared/models";
import {
  calculateWarehouseHubTime,
  getTopCowsByStayDays,
  getAverageStayPerWarehouse,
  getWarehousesHighestTotalStay,
} from "@/lib/analytics";

interface WarehouseHubTimeCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

const CHART_COLOR = "#3b82f6";

export function WarehouseHubTimeCard({
  movements,
  locations,
}: WarehouseHubTimeCardProps) {
  // Calculate warehouse hub times
  const hubTimes = calculateWarehouseHubTime(movements, locations);

  // Get analytics data
  const topCows = getTopCowsByStayDays(hubTimes, 10);
  const topWarehouses = getWarehousesHighestTotalStay(hubTimes, 10);

  // Chart data
  const cowsData = topCows.map((item) => ({
    name: item.cowId,
    "Stay Days": item.totalStayDays,
  }));

  const warehouseTotalData = topWarehouses.map((item) => ({
    name: item.warehouseName,
    "Total Days": item.totalStayDays,
  }));

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Total Hub Stays
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {hubTimes.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Total Stay Days
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {Math.round(
              hubTimes.reduce((sum, ht) => sum + ht.stayDays, 0) * 100,
            ) / 100}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Average Stay Days
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {hubTimes.length > 0
              ? Math.round(
                  (hubTimes.reduce((sum, ht) => sum + ht.stayDays, 0) /
                    hubTimes.length) *
                    100,
                ) / 100
              : 0}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 flex-1 min-h-0">
        {/* Top COWs by Total Stay Days */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col h-80 sm:h-96">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Top COWs by Total Stay Days
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
                <Bar dataKey="Stay Days" fill={CHART_COLOR} />
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
  );
}
