import { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CowMovementsFact, DimLocation } from "@shared/models";
import {
  calculateOffAirWarehouseAging,
  calculateShortIdleTime,
  getCOWOffAirAgingDetails,
  OffAirAgingTableRow,
} from "@/lib/analytics";
import { COWOffAirDetailsModal } from "./COWOffAirDetailsModal";
import { BucketCowsModal } from "./BucketCowsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSortableTable } from "@/hooks/useSortableTable";

interface WarehouseHubTimeCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

// Color palette for each bucket with 3D gradient effects
const BUCKET_COLORS = [
  { gradient: "url(#gradient0)", color: "#FF375E", dark: "#CC2C4B" }, // Red (Base) - 0-3 Months
  { gradient: "url(#gradient1)", color: "#1Bced8", dark: "#159CA3" }, // Teal (Base) - 4-6 Months
  { gradient: "url(#gradient2)", color: "#4F008C", dark: "#3A0066" }, // Purple (Base) - 7-9 Months
  { gradient: "url(#gradient3)", color: "#FF6F8A", dark: "#CC2C4B" }, // Red (Light) - 10-12 Months
  { gradient: "url(#gradient4)", color: "#5FE0E7", dark: "#159CA3" }, // Teal (Light) - 12+ Months
];

export function WarehouseHubTimeCard({
  movements,
  locations,
}: WarehouseHubTimeCardProps) {
  // State for modals
  const [selectedCowForModal, setSelectedCowForModal] = useState<string | null>(
    null,
  );
  const [selectedBucketForModal, setSelectedBucketForModal] = useState<
    string | null
  >(null);
  const [forceRender, setForceRender] = useState(false);

  // Calculate off-air warehouse aging data (memoized to prevent unnecessary recalculations)
  const { buckets, tableData, cowAgingMap, bucketCows } = useMemo(
    () => calculateOffAirWarehouseAging(movements, locations),
    [movements, locations],
  );

  // Calculate short idle time data
  const { buckets: shortIdleBuckets, bucketCows: shortIdleBucketCows } =
    useMemo(
      () => calculateShortIdleTime(movements, locations),
      [movements, locations],
    );

  // Force chart to render on mount by triggering a state update after DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceRender((prev) => !prev);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Chart data - ALWAYS shows ALL COWs in their buckets (never filtered)
  const chartData = useMemo(() => {
    return buckets.map((b) => ({
      name: b.bucket,
      count: b.count,
    }));
  }, [buckets]);

  // Short idle time chart data
  const shortIdleChartData = useMemo(() => {
    return shortIdleBuckets.map((b) => ({
      name: b.bucket,
      count: b.count,
    }));
  }, [shortIdleBuckets]);

  // Check if there's any data in the buckets
  const hasChartData = useMemo(() => {
    return buckets.some((b) => b.count > 0);
  }, [buckets]);

  // Handle chart bar click - show modal with all COWs in bucket
  const handleChartClick = (bucketName: string) => {
    setSelectedBucketForModal(bucketName);
  };

  // Handle table row click
  const handleTableRowClick = (cowId: string) => {
    setSelectedCowForModal(cowId);
  };

  // Get modal data
  const modalData = selectedCowForModal
    ? getCOWOffAirAgingDetails(selectedCowForModal, movements, locations)
    : null;

  // Set up table sorting
  const {
    sortedData: sortedTableData,
    setSortColumn,
    getSortIndicator,
  } = useSortableTable({
    data: tableData,
    initialSortColumn: "avgOffAirIdleDays",
    initialSortDirection: "desc",
  });

  return (
    <>
      <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
        {/* Off-Air Warehouse Aging Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col flex-shrink-0 min-h-[500px]">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Off-Air Warehouse Aging
          </h3>
          <svg width="0" height="0">
            <defs>
              {/* Gradient definitions for each bucket */}
              <linearGradient id="gradient0" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF375E" stopOpacity={1} />
                <stop offset="100%" stopColor="#CC2C4B" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1Bced8" stopOpacity={1} />
                <stop offset="100%" stopColor="#159CA3" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4F008C" stopOpacity={1} />
                <stop offset="100%" stopColor="#3A0066" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF6F8A" stopOpacity={1} />
                <stop offset="100%" stopColor="#CC2C4B" stopOpacity={1} />
              </linearGradient>
              <linearGradient id="gradient4" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5FE0E7" stopOpacity={1} />
                <stop offset="100%" stopColor="#159CA3" stopOpacity={1} />
              </linearGradient>

              {/* Shadow filter for 3D effect */}
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow
                  dx="2"
                  dy="4"
                  stdDeviation="3"
                  floodOpacity="0.3"
                />
              </filter>
            </defs>
          </svg>

          <div style={{ width: "100%", height: "400px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                key={`chart-${forceRender}`}
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <defs>
                  {/* Gradient definitions for Recharts */}
                  <linearGradient
                    id="gradient0"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FF375E" stopOpacity={1} />
                    <stop offset="100%" stopColor="#CC2C4B" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient
                    id="gradient1"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#1Bced8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#159CA3" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient
                    id="gradient2"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#4F008C" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3A0066" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient
                    id="gradient3"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FF6F8A" stopOpacity={1} />
                    <stop offset="100%" stopColor="#CC2C4B" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient
                    id="gradient4"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#5FE0E7" stopOpacity={1} />
                    <stop offset="100%" stopColor="#159CA3" stopOpacity={1} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12, fontWeight: 500 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number) => `${value} COWs`}
                  cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                />
                <Bar
                  dataKey="count"
                  radius={[12, 12, 0, 0]}
                  label={{
                    position: "top",
                    fill: "#374151",
                    fontSize: 11,
                    fontWeight: "bold",
                    formatter: (value: number) => value.toString(),
                  }}
                  onClick={(state: any) => {
                    if (state && state.name) {
                      handleChartClick(state.name);
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    filter: "drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.15))",
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        BUCKET_COLORS[index % BUCKET_COLORS.length].gradient
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!hasChartData && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded text-sm text-amber-700 dark:text-amber-300">
              <p className="font-semibold mb-1">No Data Available</p>
              <p>No Off-Air (Half/Zero) movements found in the current dataset. This card displays warehouse idle time analysis for COWs that were temporarily parked at warehouses.</p>
            </div>
          )}
        </div>

        {/* Short Idle Time Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col flex-shrink-0 min-h-[400px]">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Off-Air Warehouse Short Idle Time
          </h3>
          <svg width="0" height="0">
            <defs>
              {/* Gradient definitions for short idle time buckets */}
              <linearGradient
                id="shortIdleGradient0"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#FF375E" stopOpacity={1} />
                <stop offset="100%" stopColor="#CC2C4B" stopOpacity={1} />
              </linearGradient>
              <linearGradient
                id="shortIdleGradient1"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#1Bced8" stopOpacity={1} />
                <stop offset="100%" stopColor="#159CA3" stopOpacity={1} />
              </linearGradient>
              <linearGradient
                id="shortIdleGradient2"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#4F008C" stopOpacity={1} />
                <stop offset="100%" stopColor="#3A0066" stopOpacity={1} />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={shortIdleChartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <defs>
                  {/* Gradient definitions for short idle time buckets */}
                  <linearGradient
                    id="shortIdleGradient0"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FF375E" stopOpacity={1} />
                    <stop offset="100%" stopColor="#CC2C4B" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient
                    id="shortIdleGradient1"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#1Bced8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#159CA3" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient
                    id="shortIdleGradient2"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#4F008C" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3A0066" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12, fontWeight: 500 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number) => `${value} COWs`}
                  cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  label={{
                    position: "top",
                    fill: "#374151",
                    fontSize: 11,
                    fontWeight: "bold",
                    formatter: (value: number) => value.toString(),
                  }}
                  onClick={(state: any) => {
                    if (state && state.name) {
                      handleChartClick(state.name);
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    filter: "drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.15))",
                  }}
                >
                  {shortIdleChartData.map((entry, index) => (
                    <Cell
                      key={`shortIdle-${index}`}
                      fill={
                        [
                          "url(#shortIdleGradient0)",
                          "url(#shortIdleGradient1)",
                          "url(#shortIdleGradient2)",
                        ][index % 3]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {shortIdleChartData.every((d) => d.count === 0) && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded text-sm text-amber-700 dark:text-amber-300">
              <p className="font-semibold mb-1">No Data Available</p>
              <p>No short idle time (1-15 days) found in warehouse placements. Short idle time shows COWs that stayed at warehouses briefly.</p>
            </div>
          )}
        </div>

        {/* Off-Air Warehouse Aging Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Off-Air Warehouse Aging Details
          </h3>
          {tableData.length > 0 ? (
            <div className="overflow-x-auto flex-1">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead
                      className="text-left py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                      onClick={() => setSortColumn("cowId")}
                    >
                      COW ID{getSortIndicator("cowId")}
                    </TableHead>
                    <TableHead
                      className="text-center py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                      onClick={() => setSortColumn("totalMovementTimes")}
                    >
                      Total Movement Times
                      {getSortIndicator("totalMovementTimes")}
                    </TableHead>
                    <TableHead
                      className="text-center py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                      onClick={() => setSortColumn("avgOffAirIdleDays")}
                    >
                      Average Off-Air Idle Days
                      {getSortIndicator("avgOffAirIdleDays")}
                    </TableHead>
                    <TableHead
                      className="text-left py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                      onClick={() => setSortColumn("topOffAirWarehouse")}
                    >
                      Top Off-Air Warehouse
                      {getSortIndicator("topOffAirWarehouse")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTableData.map((row) => (
                    <TableRow
                      key={row.cowId}
                      onClick={() => handleTableRowClick(row.cowId)}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                    >
                      <TableCell className="py-3 font-medium text-blue-600 dark:text-blue-400">
                        {row.cowId}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {row.totalMovementTimes}
                      </TableCell>
                      <TableCell className="text-center py-3 font-semibold">
                        {row.avgOffAirIdleDays}
                      </TableCell>
                      <TableCell className="py-3 text-gray-700 dark:text-gray-300">
                        {row.topOffAirWarehouse}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-400">
              No COWs with Off-Air aging found
            </div>
          )}
        </div>
      </div>

      {/* Bucket Modal - shows all COWs in selected bucket */}
      {selectedBucketForModal && (
        <BucketCowsModal
          open={!!selectedBucketForModal}
          onOpenChange={(open) => {
            if (!open) setSelectedBucketForModal(null);
          }}
          bucketName={selectedBucketForModal}
          cowIds={
            ["1-5 Days", "6-10 Days", "11-15 Days"].includes(
              selectedBucketForModal,
            )
              ? shortIdleBucketCows.get(selectedBucketForModal) || []
              : bucketCows.get(selectedBucketForModal) || []
          }
          allTableData={tableData}
        />
      )}

      {/* Single COW Modal - shows details for a specific COW */}
      {selectedCowForModal && modalData && (
        <COWOffAirDetailsModal
          open={!!selectedCowForModal}
          onOpenChange={(open) => {
            if (!open) setSelectedCowForModal(null);
          }}
          cowId={selectedCowForModal}
          totalMovements={modalData.totalMovements}
          totalOffAirIdleDays={modalData.totalOffAirIdleDays}
          avgOffAirIdleDays={modalData.avgOffAirIdleDays}
          topOffAirWarehouse={modalData.topOffAirWarehouse}
          stays={modalData.stays}
        />
      )}
    </>
  );
}
