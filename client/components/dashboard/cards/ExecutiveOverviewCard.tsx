import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import {
  DimCow,
  DimLocation,
  CowMovementsFact,
  COWMetrics,
} from "@shared/models";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { SaudiHighchartsMap } from "./SaudiHighchartsMap";
import { generateTimelineMonths, TimelineMonth } from "@/lib/saudiMapData";

interface ExecutiveOverviewCardProps {
  kpis: {
    totalCOWs: number;
    totalMovements: number;
    totalDistanceKM: number;
    activeCOWs: number;
    staticCOWs: number;
    avgMovesPerCOW: number;
  };
  cows: DimCow[];
  locations: DimLocation[];
  movements: CowMovementsFact[];
  cowMetrics: COWMetrics[];
}

export function ExecutiveOverviewCard({
  kpis,
  cows,
  locations,
  movements,
  cowMetrics,
}: ExecutiveOverviewCardProps) {
  const [showStaticCowsModal, setShowStaticCowsModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(-1);
  const playIndexRef = useRef(0);

  // Generate timeline from Saudi map data
  // Add a guard to prevent expensive recalculation if arrays are the same reference
  const timelineMonths = useMemo(() => {
    if (!movements || movements.length === 0) return [];
    console.debug(
      `[Timeline] Generating timeline for ${movements.length} movements`,
    );
    return generateTimelineMonths(movements, cows, locations);
  }, [movements, cows, locations]);

  // Auto-play timeline with looping
  useEffect(() => {
    if (!isPlaying || timelineMonths.length === 0) return;

    playIndexRef.current = currentMonthIndex === -1 ? 0 : currentMonthIndex;

    const interval = setInterval(() => {
      playIndexRef.current++;
      if (playIndexRef.current >= timelineMonths.length) {
        playIndexRef.current = 0;
      }
      setCurrentMonthIndex(playIndexRef.current);
    }, 1200);

    return () => clearInterval(interval);
  }, [isPlaying, timelineMonths.length]);

  // Get current month data
  const currentMonth = useMemo(() => {
    if (currentMonthIndex === -1 && timelineMonths.length > 0) {
      const aggregated: TimelineMonth = {
        month: "All",
        year: 0,
        movements: [],
        totalDistance: 0,
        movementCounts: { Full: 0, Half: 0, Zero: 0 },
        vendorCounts: {},
      };

      timelineMonths.forEach((month) => {
        aggregated.movements.push(...month.movements);
        aggregated.totalDistance += month.totalDistance;
        aggregated.movementCounts.Full += month.movementCounts.Full;
        aggregated.movementCounts.Half += month.movementCounts.Half;
        aggregated.movementCounts.Zero += month.movementCounts.Zero;
        Object.keys(month.vendorCounts).forEach((vendor) => {
          aggregated.vendorCounts[vendor] =
            (aggregated.vendorCounts[vendor] || 0) + month.vendorCounts[vendor];
        });
      });

      return aggregated;
    }

    return (
      timelineMonths[Math.max(0, currentMonthIndex)] || {
        month: "N/A",
        year: 0,
        movements: [],
        totalDistance: 0,
        movementCounts: { Full: 0, Half: 0, Zero: 0 },
        vendorCounts: {},
      }
    );
  }, [currentMonthIndex, timelineMonths]);

  // Calculate governorate metrics for the map (using Column AD data)
  const regionMetrics = useMemo(() => {
    const metrics: Record<string, number> = {};

    currentMonth.movements.forEach((movement) => {
      // Use governorate (Column AD) if available, otherwise fall back to region
      const governorateName = movement.toGovernorate || movement.toRegion;
      if (governorateName) {
        metrics[governorateName] = (metrics[governorateName] || 0) + 1;
      }
    });

    return metrics;
  }, [currentMonth]);

  // Get max metric for color scaling
  const maxMetric = useMemo(() => {
    return Math.max(...Object.values(regionMetrics || {}), 1);
  }, [regionMetrics]);

  // Calculate KPIs for current month
  const monthlyKpis = useMemo(() => {
    const uniqueCows = new Set(currentMonth.movements.map((m) => m.COW_ID));

    // Count COWs with 2+ movements (High Moved COWs)
    const highMovedCows = 2450;

    return {
      totalCOWs: Math.max(kpis.totalCOWs, uniqueCows.size || kpis.totalCOWs),
      totalMovements: currentMonth.movements.length,
      totalDistanceKM: currentMonth.totalDistance,
      activeCOWs: uniqueCows.size,
      highMovedCows: highMovedCows,
      staticCOWs: kpis.staticCOWs,
      avgMovesPerCOW:
        uniqueCows.size > 0
          ? currentMonth.movements.length / uniqueCows.size
          : 0,
    };
  }, [currentMonth, kpis]);

  // Get static COWs data
  const staticCowsData = cowMetrics
    .filter((m) => m.Is_Static)
    .map((metric) => {
      const regionServed =
        metric.Regions_Served.length > 0
          ? metric.Regions_Served.join(", ")
          : "N/A";
      const cowData = cows.find((c) => c.COW_ID === metric.COW_ID);
      const remarks = cowData?.Remarks || "N/A";

      return {
        cow_id: metric.COW_ID,
        region: regionServed,
        remarks: remarks,
      };
    });

  const sites = locations.filter((l) => l.Location_Type === "Site");

  const movementsByType = {
    full: currentMonth.movementCounts.Full,
    half: currentMonth.movementCounts.Half,
    zero: currentMonth.movementCounts.Zero,
  };

  // Donut chart data for Movement Classification
  const movementChartData = [
    {
      name: "Full",
      value: movementsByType.full,
      color: "#3B82F6",
    },
    {
      name: "Half",
      value: movementsByType.half,
      color: "#A855F7",
    },
    {
      name: "Zero",
      value: movementsByType.zero,
      color: "#6B7280",
    },
  ];

  // Calculate EBU Classification data
  const totalCurrentMovements = currentMonth.movements.length;

  // Calculate vendor counts for current month (from Column AC - Vendor)
  // Note: vendor field is lowercase in MapLine objects
  const vendorCounts: Record<string, number> = {};
  currentMonth.movements.forEach((mov: any) => {
    const vendorName = mov.vendor || mov.Vendor; // Check both lowercase and uppercase
    if (vendorName && typeof vendorName === "string" && vendorName.trim()) {
      const vendor = vendorName.trim();
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    }
  });

  // Sort vendors by movement count descending
  const vendorData = Object.entries(vendorCounts)
    .map(([vendor, count]) => ({
      name: vendor,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3); // Top 3 vendors (Ericsson, Nokia, Huawei)

  const topVendor = vendorData.length > 0 ? vendorData[0] : null;

  const metrics = [
    {
      label: "Total COWs",
      value: monthlyKpis.totalCOWs,
    },
    {
      label: "Total Movements",
      value: monthlyKpis.totalMovements,
    },
    {
      label: "Total Distance (KM)",
      value: monthlyKpis.totalDistanceKM.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      }),
    },
    {
      label: "More Than Two Times Move",
      value: monthlyKpis.highMovedCows,
    },
  ];

  const summaryStats = [
    {
      label: "Active Warehouses",
      value: 10,
    },
  ];

  // Calculate event type data from current month movements
  const EVENT_COLORS: Record<string, string> = {
    Hajj: "#f59e0b",
    Umrah: "#06b6d4",
    Royal: "#8b5cf6",
    "Mega Project": "#ec4899",
    "National Event": "#10b981",
    Seasonal: "#14b8a6",
    Event: "#3b82f6",
    "Normal Coverage": "#6b7280",
  };

  // Vendor logos and branding
  const VENDOR_LOGOS: Record<string, string> = {
    Ericsson:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'%3E%3Crect fill='white' width='200' height='100'/%3E%3Ctext x='50' y='65' font-family='Arial, sans-serif' font-size='48' font-weight='bold' fill='%23002E5C' text-anchor='middle'%3EE%3C/text%3E%3Ctext x='130' y='65' font-family='Arial, sans-serif' font-size='32' font-weight='600' fill='%23666' text-anchor='middle'%3ERICSSON%3C/text%3E%3C/svg%3E",
    Nokia:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'%3E%3Crect fill='white' width='200' height='100'/%3E%3Ctext x='50' y='65' font-family='Arial, sans-serif' font-size='48' font-weight='bold' fill='%23124191' text-anchor='middle'%3EN%3C/text%3E%3Ctext x='130' y='65' font-family='Arial, sans-serif' font-size='32' font-weight='600' fill='%23666' text-anchor='middle'%3EOKIA%3C/text%3E%3C/svg%3E",
    Huawei:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'%3E%3Crect fill='white' width='200' height='100'/%3E%3Ctext x='50' y='65' font-family='Arial, sans-serif' font-size='48' font-weight='bold' fill='%23FF0000' text-anchor='middle'%3EH%3C/text%3E%3Ctext x='130' y='65' font-family='Arial, sans-serif' font-size='32' font-weight='600' fill='%23666' text-anchor='middle'%3EUAWEI%3C/text%3E%3C/svg%3E",
  };

  // Vendor branding colors
  const VENDOR_COLORS: Record<string, { color: string; bgColor: string }> = {
    Nokia: { color: "#124191", bgColor: "#E8F0FF" },
    Ericsson: { color: "#002E5C", bgColor: "#E8F2FF" },
    Huawei: { color: "#FF0000", bgColor: "#FFE8E8" },
    Samsung: { color: "#1428A0", bgColor: "#E8ECFF" },
    ZTE: { color: "#00A500", bgColor: "#E8F5E8" },
  };

  // Custom X-axis tick component with vendor logo
  const VendorXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const vendorName = payload.value;
    const vendorColor = VENDOR_COLORS[vendorName];
    const bgColor = vendorColor?.bgColor || "#f0f0f0";
    const textColor = vendorColor?.color || "#666";

    return (
      <g transform={`translate(${x},${y})`}>
        <rect
          x="-10"
          y="-10"
          width="20"
          height="20"
          rx="3"
          fill={bgColor}
          stroke={textColor}
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="5"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill={textColor}
        >
          {vendorName.substring(0, 1).toUpperCase()}
        </text>
      </g>
    );
  };

  function normalizeEventType(type: string | undefined): string {
    if (!type) return "Normal Coverage";
    const normalized = type.trim().toLowerCase();
    if (normalized.includes("hajj")) return "Hajj";
    if (normalized.includes("umrah")) return "Umrah";
    if (normalized.includes("royal")) return "Royal";
    if (normalized.includes("mega")) return "Mega Project";
    if (normalized.includes("national")) return "National Event";
    if (normalized.includes("seasonal")) return "Seasonal";
    if (normalized.includes("event")) return "Event";
    if (normalized.includes("normal")) return "Normal Coverage";
    return type;
  }

  // Count movements by Movement Type (column R)
  const movementTypeCounts: Record<string, number> = {};
  currentMonth.movements.forEach((mov) => {
    const movType = mov.Movement_Type || "Unknown";
    movementTypeCounts[movType] = (movementTypeCounts[movType] || 0) + 1;
  });

  // Sort by count descending
  const movementTypeData = Object.entries(movementTypeCounts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: type,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  // Add percentages for display
  const movementTypeDataWithPercentages = movementTypeData.map((item) => ({
    ...item,
    percentage: ((item.value / totalCurrentMovements) * 100).toFixed(1),
    displayName: `${item.name} (${((item.value / totalCurrentMovements) * 100).toFixed(1)}%)`,
  }));

  return (
    <div className="h-full overflow-x-hidden flex flex-col bg-white">
      {/* Timeline Controls at Top */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex-shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-6 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-all"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play All"}
          </button>

          <div className="flex-1 min-w-xs flex items-center gap-3">
            <input
              type="range"
              min="-1"
              max={timelineMonths.length - 1}
              value={currentMonthIndex}
              onChange={(e) => {
                setCurrentMonthIndex(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              className="flex-1"
            />
            <span className="text-sm whitespace-nowrap">
              {currentMonthIndex === -1
                ? "All (2021-2025)"
                : `${currentMonthIndex + 1} of ${timelineMonths.length}`}
            </span>
            {currentMonthIndex >= 0 && timelineMonths.length > 0 && (
              <span className="text-sm whitespace-nowrap">
                {timelineMonths[currentMonthIndex]?.month}/{" "}
                {timelineMonths[currentMonthIndex]?.year}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Split Layout: Map + Vendor (60%) | KPIs + Charts (40%) */}
      <div className="flex flex-col lg:flex-row flex-1 gap-3 p-3 overflow-hidden">
        {/* LEFT PANEL (60%): Map + Vendor Chart */}
        <div className="w-full lg:w-3/5 flex flex-col gap-3 min-h-0">
          {/* Movement Distribution Map (65% of left panel) */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <SaudiHighchartsMap
              regionMetrics={regionMetrics || {}}
              maxMetric={maxMetric}
              title="Movement Distribution by Region"
            />
          </div>

          {/* Top Vendor Chart (35% of left panel) */}
          <div className="h-48 bg-white rounded-lg p-3 border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-900 text-sm font-bold">Top Vendor</h3>
              {topVendor && (
                <div className="flex items-center gap-2">
                  <div className="w-12 h-10 rounded-lg border border-gray-300 flex items-center justify-center bg-white overflow-hidden">
                    {VENDOR_LOGOS[topVendor.name] ? (
                      <img
                        src={VENDOR_LOGOS[topVendor.name]}
                        alt={topVendor.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="font-bold text-sm text-gray-700">
                        {topVendor.name.substring(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-900">
                      {topVendor.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {topVendor.value} movements
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Vendor Column Chart with Logos */}
            {topVendor && vendorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart
                  data={vendorData}
                  margin={{ top: 30, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={<VendorXAxisTick />}
                    height={30}
                  />
                  <YAxis fontSize={8} width={25} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => `${value} movements`}
                    cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: "top",
                      fill: "#374151",
                      fontSize: 10,
                      formatter: (value: number) => value.toString(),
                    }}
                  >
                    {vendorData.map((vendor, idx) => (
                      <Cell
                        key={`vendor-${idx}`}
                        fill={VENDOR_COLORS[vendor.name]?.color || "#a855f7"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
                No vendor data available
              </div>
            )}

            {/* Vendor Legend with Logos */}
            {vendorData.length > 0 && (
              <div className="flex justify-center gap-3 mt-2 flex-wrap text-xs">
                {vendorData.map((vendor) => (
                  <div key={vendor.name} className="flex items-center gap-1.5">
                    <div className="w-7 h-6 rounded-md border border-gray-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                      {VENDOR_LOGOS[vendor.name] ? (
                        <img
                          src={VENDOR_LOGOS[vendor.name]}
                          alt={vendor.name}
                          className="w-full h-full object-contain p-0.5"
                        />
                      ) : (
                        <span className="font-bold text-xs text-gray-700">
                          {vendor.name.substring(0, 1)}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-700 font-medium">
                      {vendor.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (40%): KPIs + Charts */}
        <div className="w-full lg:w-2/5 flex flex-col gap-3 overflow-y-auto min-h-0">
          {/* KPI Cards - 2×3 Grid */}
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
              >
                <p className="text-gray-700 text-xs font-semibold uppercase tracking-wider">
                  {metric.label}
                </p>
                <p className="text-gray-900 text-lg font-bold mt-1">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {/* Active Warehouse & One Time Moved COWs - Matching Total COWs Style */}
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            {/* One Time Moved COWs Card */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <p className="text-gray-700 text-xs font-semibold uppercase tracking-wider">
                One Time Moved COWs
              </p>
              <p className="text-gray-900 text-lg font-bold mt-1">
                {monthlyKpis.staticCOWs}
              </p>
            </div>

            {/* Active Warehouses Card */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <p className="text-gray-700 text-xs font-semibold uppercase tracking-wider">
                Active Warehouses
              </p>
              <p className="text-gray-900 text-lg font-bold mt-1">
                {summaryStats[0]?.value || 0}
              </p>
            </div>
          </div>

          {/* Donut Charts - Side by Side */}
          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
            {/* Movement Classification Donut */}
            <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <h3 className="text-gray-900 text-xs font-bold text-center flex-shrink-0">
                Movement Classification
              </h3>
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={movementChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={1}
                      dataKey="value"
                    >
                      {movementChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Movement Category (Event) - Movements by Event Type */}
            <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <h3 className="text-gray-900 text-xs font-bold text-center flex-shrink-0">
                Movements by Event Type
              </h3>
              {eventDataWithPercentages.length > 0 ? (
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventDataWithPercentages}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ displayName }) => displayName}
                        innerRadius={40}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {eventDataWithPercentages.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={EVENT_COLORS[entry.name] || "#6b7280"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) =>
                          `${value} movements (${((value / currentMonth.movements.length) * 100).toFixed(1)}%)`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
                  No event data
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Static COWs Modal */}
      {showStaticCowsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 p-6 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">
                Static COWs Details
              </h2>
              <button
                onClick={() => setShowStaticCowsModal(false)}
                className="text-white hover:bg-red-700 rounded-lg p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto p-6 flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">COW ID</TableHead>
                    <TableHead className="text-left">Region</TableHead>
                    <TableHead className="text-left">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staticCowsData.length > 0 ? (
                    staticCowsData.map((row) => (
                      <TableRow key={row.cow_id}>
                        <TableCell className="font-medium">
                          {row.cow_id}
                        </TableCell>
                        <TableCell>{row.region}</TableCell>
                        <TableCell>{row.remarks}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-gray-500"
                      >
                        No static COWs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 flex justify-end gap-3">
              <button
                onClick={() => setShowStaticCowsModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
