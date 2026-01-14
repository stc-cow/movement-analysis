import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CowMovementsFact, DimLocation } from "@shared/models";
import { calculateWarehouseMetrics } from "@/lib/analytics";
import { useSortableTable } from "@/hooks/useSortableTable";

interface WarehouseIntelligenceCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

export function WarehouseIntelligenceCard({
  movements,
  locations,
}: WarehouseIntelligenceCardProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>();

  // Warehouses to exclude from analysis (repeaters, non-warehouse locations, etc.)
  const excludedWarehouses = new Set([
    "Bajda", // Repeater for CWH036
  ]);

  // Filter to include both warehouse types and locations with "WH" in their name
  // Exclude specific warehouses marked as repeaters or non-warehouse items
  const warehouses = useMemo(
    () =>
      locations.filter(
        (l) =>
          (l.Location_Type === "Warehouse" ||
            l.Location_Name.toUpperCase().includes("WH")) &&
          !excludedWarehouses.has(l.Location_Name),
      ),
    [locations],
  );

  const warehouseMetrics = useMemo(
    () =>
      warehouses
        .map((wh) =>
          calculateWarehouseMetrics(wh.Location_ID, movements, locations),
        )
        .filter((m) => m !== null),
    [warehouses, movements, locations],
  );

  // Filter metrics by selected region for dispatch/receiving analysis
  const filteredMetrics = useMemo(
    () =>
      selectedRegion
        ? warehouseMetrics.filter((m) => {
            const warehouse = warehouses.find(
              (w) => w.Location_ID === m?.Location_ID,
            );
            return warehouse?.Region === selectedRegion;
          })
        : warehouseMetrics,
    [warehouseMetrics, warehouses, selectedRegion],
  );

  const topOutgoing = useMemo(
    () =>
      filteredMetrics
        .sort((a, b) => b!.Outgoing_Movements - a!.Outgoing_Movements)
        .slice(0, 6),
    [filteredMetrics],
  );

  const topIncoming = useMemo(
    () =>
      filteredMetrics
        .sort((a, b) => b!.Incoming_Movements - a!.Incoming_Movements)
        .slice(0, 6),
    [filteredMetrics],
  );

  const regions = useMemo(
    () => [...new Set(warehouses.map((w) => w.Region))].sort(),
    [warehouses],
  );

  // Prepare table data for sorting
  const tableData = useMemo(
    () =>
      (selectedRegion ? filteredMetrics : warehouseMetrics)
        .filter((m) => m !== null)
        .map((m) => ({
          Location_ID: m!.Location_ID,
          Location_Name: m!.Location_Name,
          Region:
            warehouses.find((w) => w.Location_ID === m!.Location_ID)?.Region ||
            "",
          Outgoing_Movements: m!.Outgoing_Movements,
          Incoming_Movements: m!.Incoming_Movements,
        })),
    [selectedRegion, filteredMetrics, warehouseMetrics, warehouses],
  );

  // Set up table sorting
  const {
    sortedData: sortedTableData,
    setSortColumn,
    getSortIndicator,
  } = useSortableTable({
    data: tableData,
    initialSortColumn: "Outgoing_Movements",
    initialSortDirection: "desc",
  });

  // Colorful bar colors for warehouse charts
  const WAREHOUSE_COLORS = [
    "#3b82f6", // Blue
    "#06b6d4", // Cyan
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
  ];

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-4 p-3 sm:p-4">
      {/* Region Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedRegion(undefined)}
          className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            selectedRegion === undefined
              ? "bg-blue-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          All
        </button>
        {regions.map((region) => (
          <button
            key={region}
            onClick={() => setSelectedRegion(region)}
            className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              selectedRegion === region
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
        {/* Top Dispatch Warehouses */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-lg p-3 sm:p-4 overflow-hidden flex flex-col">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Top Dispatch Warehouses
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={topOutgoing.map((m) => ({
                name: m!.Location_Name.replace(/WH|Warehouse/gi, "").trim(),
                movements: m!.Outgoing_Movements,
              }))}
              margin={{ top: 10, right: 20, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="movements"
                radius={[8, 8, 0, 0]}
                isAnimationActive={false}
              >
                {topOutgoing.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={WAREHOUSE_COLORS[index % WAREHOUSE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Receiving Warehouses */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-lg p-3 sm:p-4 overflow-hidden flex flex-col">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Top Receiving Warehouses
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={topIncoming.map((m) => ({
                name: m!.Location_Name.replace(/WH|Warehouse/gi, "").trim(),
                movements: m!.Incoming_Movements,
              }))}
              margin={{ top: 10, right: 20, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="movements"
                radius={[8, 8, 0, 0]}
                isAnimationActive={false}
              >
                {topIncoming.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={WAREHOUSE_COLORS[index % WAREHOUSE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Warehouse Details Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-lg p-3 sm:p-4 overflow-hidden flex flex-col">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          📊 Warehouse Analytics
        </h3>
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableHead
                  className="text-left py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => setSortColumn("Location_Name")}
                >
                  Warehouse{getSortIndicator("Location_Name")}
                </TableHead>
                <TableHead
                  className="text-left py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => setSortColumn("Region")}
                >
                  Region{getSortIndicator("Region")}
                </TableHead>
                <TableHead
                  className="text-right py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => setSortColumn("Outgoing_Movements")}
                >
                  Outgoing{getSortIndicator("Outgoing_Movements")}
                </TableHead>
                <TableHead
                  className="text-right py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={() => setSortColumn("Incoming_Movements")}
                >
                  Incoming{getSortIndicator("Incoming_Movements")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTableData.slice(0, 12).map((m) => (
                <TableRow
                  key={m.Location_ID}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <TableCell className="font-medium py-3">
                    {m.Location_Name}
                  </TableCell>
                  <TableCell className="py-3 text-gray-600 dark:text-gray-400">
                    <span className="inline-block px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold">
                      {m.Region}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-3 font-semibold text-green-600 dark:text-green-400">
                    {m.Outgoing_Movements}
                  </TableCell>
                  <TableCell className="text-right py-3 font-semibold text-amber-600 dark:text-amber-400">
                    {m.Incoming_Movements}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 p-3 sm:p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#3A0CA3" }}
            />
            <span className="text-gray-700 dark:text-gray-300">STC</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#5F2EEA" }}
            />
            <span className="text-gray-700 dark:text-gray-300">ACES</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#1Bced8" }}
            />
            <span className="text-gray-700 dark:text-gray-300">Madaf</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#F97316" }}
            />
            <span className="text-gray-700 dark:text-gray-300">HOI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
