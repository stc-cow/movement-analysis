import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-4 p-4">
      {/* Region Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedRegion(undefined)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
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
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Dispatch Warehouses */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-lg p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            Top Dispatch Warehouses
          </h3>
          <ResponsiveContainer width="100%" height={300}>
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
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Receiving Warehouses */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-lg p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            Top Receiving Warehouses
          </h3>
          <ResponsiveContainer width="100%" height={300}>
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
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Warehouse Details Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 shadow-lg p-4 overflow-hidden flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 Warehouse Analytics
        </h3>
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableHead className="text-left py-3">Warehouse</TableHead>
                <TableHead className="text-left py-3">Region</TableHead>
                <TableHead className="text-left py-3">Owner</TableHead>
                <TableHead className="text-right py-3">Outgoing</TableHead>
                <TableHead className="text-right py-3">Incoming</TableHead>
                <TableHead className="text-right py-3">Avg Out (KM)</TableHead>
                <TableHead className="text-right py-3">Avg In (KM)</TableHead>
                <TableHead className="text-right py-3">Idle Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(selectedRegion ? filteredMetrics : warehouseMetrics)
                .slice(0, 12)
                .map((m) => (
                  <TableRow
                    key={m!.Location_ID}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <TableCell className="font-medium py-3">
                      {m!.Location_Name}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-400">
                      <span className="inline-block px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold">
                        {
                          warehouses.find(
                            (w) => w.Location_ID === m!.Location_ID,
                          )?.Region
                        }
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-400">
                      <span className="inline-block px-2 py-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-semibold">
                        {
                          warehouses.find(
                            (w) => w.Location_ID === m!.Location_ID,
                          )?.Owner
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 font-semibold text-green-600 dark:text-green-400">
                      {m!.Outgoing_Movements}
                    </TableCell>
                    <TableCell className="text-right py-3 font-semibold text-amber-600 dark:text-amber-400">
                      {m!.Incoming_Movements}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {m!.Avg_Outgoing_Distance.toFixed(0)} km
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {m!.Avg_Incoming_Distance.toFixed(0)} km
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {m!.Idle_Accumulation_Days.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-gray-200/60 dark:border-gray-700/40 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
              style={{ backgroundColor: "#06B6D4" }}
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
