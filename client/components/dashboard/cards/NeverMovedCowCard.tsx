import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NeverMovedCow } from "@shared/models";
import { NeverMovedCowMap } from "./NeverMovedCowMap";
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

interface NeverMovedCowCardProps {
  neverMovedCows: NeverMovedCow[];
}

export function NeverMovedCowCard({ neverMovedCows }: NeverMovedCowCardProps) {
  const [selectedCow, setSelectedCow] = useState<NeverMovedCow | null>(null);

  // Calculate years on-air and bucket data
  const chartData = useMemo(() => {
    const buckets = {
      "1-3 Years": 0,
      "4-6 Years": 0,
      "7-9 Years": 0,
      "10-12 Years": 0,
      "12+ Years": 0,
    };

    neverMovedCows.forEach((cow) => {
      const yearsOnAir = (cow.Days_On_Air || 0) / 365;
      if (yearsOnAir <= 3) {
        buckets["1-3 Years"]++;
      } else if (yearsOnAir <= 6) {
        buckets["4-6 Years"]++;
      } else if (yearsOnAir <= 9) {
        buckets["7-9 Years"]++;
      } else if (yearsOnAir <= 12) {
        buckets["10-12 Years"]++;
      } else {
        buckets["12+ Years"]++;
      }
    });

    return Object.entries(buckets).map(([range, count]) => ({
      name: range,
      count,
    }));
  }, [neverMovedCows]);

  const BAR_COLORS = [
    "#3b82f6", // Blue
    "#06b6d4", // Cyan
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
  ];

  // Calculate regional breakdown
  const regionStats = useMemo(() => {
    const regions: Record<string, number> = {
      WEST: 0,
      SOUTH: 0,
      CENTRAL: 0,
      EAST: 0,
    };

    neverMovedCows.forEach((cow) => {
      const region = cow.Region?.toUpperCase() || "UNKNOWN";
      if (region in regions) {
        regions[region]++;
      }
    });

    return regions;
  }, [neverMovedCows]);

  const REGION_COLORS: Record<string, string> = {
    WEST: "#3b82f6",
    SOUTH: "#10b981",
    CENTRAL: "#f59e0b",
    EAST: "#ef4444",
  };

  const KPI_CARD_COLORS = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Left Panel: On-Air Duration Chart and Stats */}
      <div className="flex flex-col overflow-y-auto gap-4">
        {/* KPI Cards: Total COWs and Regional Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-shrink-0">
          <div
            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            style={{
              borderTopWidth: "4px",
              borderTopColor: KPI_CARD_COLORS[0],
            }}
          >
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Total COWs
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {neverMovedCows.length}
              </p>
            </div>
          </div>

          {Object.entries(regionStats)
            .filter(([_, count]) => count > 0)
            .map(([region, count]) => (
              <div
                key={region}
                className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                style={{
                  borderTopWidth: "4px",
                  borderTopColor: REGION_COLORS[region] || "#6b7280",
                }}
              >
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    {region}
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: REGION_COLORS[region] || "#6b7280" }}
                  >
                    {count}
                  </p>
                </div>
              </div>
            ))}
        </div>

        {/* Chart */}
        <div
          className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700"
          style={{
            borderTopWidth: "4px",
            borderTopColor: KPI_CARD_COLORS[2],
          }}
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Never Moved COWs - On-Air Duration
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Static COWs grouped by years on deployment location
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0 p-6">
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
                    formatter={(value: number) => `${value} COWs`}
                    cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No COWs data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Map */}
      <div
        className="flex flex-col rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800"
        style={{
          borderTopWidth: "4px",
          borderTopColor: KPI_CARD_COLORS[3],
        }}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Location Map
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Click on a COW marker to view full details ({neverMovedCows.length}{" "}
            COWs)
          </p>
        </div>
        <NeverMovedCowMap
          cows={neverMovedCows}
          onCowSelected={setSelectedCow}
        />
      </div>

      {/* Full Details Modal - Rendered as Portal to appear above map */}
      {selectedCow &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 2147483647 }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              style={{ position: "relative", zIndex: 1 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 p-6 flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">
                  {selectedCow.COW_ID}
                </h2>
                <button
                  onClick={() => setSelectedCow(null)}
                  className="text-white hover:bg-blue-700 rounded-lg p-2 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* Status Badge */}
                <div>
                  <Badge
                    className={
                      selectedCow.Status === "ON-AIR"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }
                  >
                    {selectedCow.Status}
                  </Badge>
                </div>

                {/* Main Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Location
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.Location}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Region
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.Region}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        District
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.District}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        City
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.City}
                      </p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Vendor
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.Vendor}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        1st Deploy Date
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {new Date(
                          selectedCow.First_Deploy_Date,
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Last Deploy Date
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {new Date(
                          selectedCow.Last_Deploy_Date,
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Days On-Air
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.Days_On_Air} days
                      </p>
                    </div>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-2">
                    GPS Coordinates
                  </label>
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {selectedCow.Latitude.toFixed(4)},{" "}
                    {selectedCow.Longitude.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedCow(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
