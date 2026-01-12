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
  calculateOffAirWarehouseAging,
  getCOWOffAirAgingDetails,
  OffAirAgingTableRow,
} from "@/lib/analytics";
import { COWOffAirDetailsModal } from "./COWOffAirDetailsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

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
  const [cowIdFilter, setCowIdFilter] = useState<string>("");
  const [selectedCowForModal, setSelectedCowForModal] = useState<string | null>(
    null,
  );

  // Calculate off-air warehouse aging data
  const { buckets, tableData, cowAgingMap } =
    calculateOffAirWarehouseAging(movements, locations);

  // Filter table data by COW ID search
  const filteredTableData = useMemo(() => {
    if (!cowIdFilter.trim()) return tableData;
    const lowerFilter = cowIdFilter.toLowerCase();
    return tableData.filter((row) =>
      row.cowId.toLowerCase().includes(lowerFilter),
    );
  }, [tableData, cowIdFilter]);

  // Filter buckets based on filtered COWs
  const filteredBuckets = useMemo(() => {
    if (!cowIdFilter.trim()) return buckets;

    const lowerFilter = cowIdFilter.toLowerCase();
    const filteredCowIds = new Set(
      tableData
        .filter((row) => row.cowId.toLowerCase().includes(lowerFilter))
        .map((row) => row.cowId),
    );

    return buckets.map((bucket) => {
      let filteredCount = 0;
      cowAgingMap.forEach((months, cowId) => {
        if (!filteredCowIds.has(cowId)) return;

        if (
          (bucket.bucket === "0-3 Months" && months <= 3) ||
          (bucket.bucket === "4-6 Months" && months > 3 && months <= 6) ||
          (bucket.bucket === "7-9 Months" && months > 6 && months <= 9) ||
          (bucket.bucket === "10-12 Months" && months > 9 && months <= 12) ||
          (bucket.bucket === "More than 12 Months" && months > 12)
        ) {
          filteredCount++;
        }
      });
      return { ...bucket, count: filteredCount };
    });
  }, [buckets, cowIdFilter, tableData, cowAgingMap]);

  // Chart data
  const chartData = filteredBuckets.map((b) => ({
    name: b.bucket,
    count: b.count,
  }));

  // Handle chart bar click
  const handleChartClick = (bucketName: string) => {
    // Find first COW in this bucket (for demo)
    let targetCowId: string | null = null;

    const lowerFilter = cowIdFilter.toLowerCase();
    const filteredCowIds = new Set(
      tableData
        .filter((row) => row.cowId.toLowerCase().includes(lowerFilter))
        .map((row) => row.cowId),
    );

    cowAgingMap.forEach((months, cowId) => {
      if (targetCowId) return;
      if (!filteredCowIds.has(cowId)) return;

      if (
        (bucketName === "0-3 Months" && months <= 3) ||
        (bucketName === "4-6 Months" && months > 3 && months <= 6) ||
        (bucketName === "7-9 Months" && months > 6 && months <= 9) ||
        (bucketName === "10-12 Months" && months > 9 && months <= 12) ||
        (bucketName === "More than 12 Months" && months > 12)
      ) {
        targetCowId = cowId;
      }
    });

    if (targetCowId) {
      setSelectedCowForModal(targetCowId);
    }
  };

  // Handle table row click
  const handleTableRowClick = (cowId: string) => {
    setSelectedCowForModal(cowId);
  };

  // Get modal data
  const modalData = selectedCowForModal
    ? getCOWOffAirAgingDetails(selectedCowForModal, movements, locations)
    : null;

  return (
    <>
      <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
        {/* COW ID Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Filter by COW ID
          </label>
          <Input
            placeholder="Search COW ID..."
            value={cowIdFilter}
            onChange={(e) => setCowIdFilter(e.target.value)}
            className="w-full sm:w-64"
          />
          {cowIdFilter && (
            <button
              onClick={() => setCowIdFilter("")}
              className="mt-2 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Off-Air Warehouse Aging Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col h-80 sm:h-96">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Off-Air Warehouse Aging
          </h3>
          {chartData.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
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
                  formatter={(value: number) => `${value} COWs`}
                />
                <Bar
                  dataKey="count"
                  fill={CHART_COLOR}
                  onClick={(state: any) => {
                    if (state && state.name) {
                      handleChartClick(state.name);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No off-air warehouse aging data available
            </div>
          )}
        </div>

        {/* Off-Air Warehouse Aging Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Off-Air Warehouse Aging Details
          </h3>
          {filteredTableData.length > 0 ? (
            <div className="overflow-x-auto flex-1">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="text-left py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                      COW ID
                    </TableHead>
                    <TableHead className="text-center py-3">
                      Total Movement Times
                    </TableHead>
                    <TableHead className="text-center py-3">
                      Average Off-Air Idle Days
                    </TableHead>
                    <TableHead className="text-left py-3">
                      Top Off-Air Warehouse
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTableData.map((row) => (
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
              No COWs match the filter
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
          totalOffAirIdleDays={modalData.totalOffAirIdleDays}
          avgOffAirIdleDays={modalData.avgOffAirIdleDays}
          topOffAirWarehouse={modalData.topOffAirWarehouse}
          stays={modalData.stays}
        />
      )}
    </>
  );
}
