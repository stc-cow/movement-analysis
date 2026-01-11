import { useState, useEffect, useMemo, useRef } from "react";
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
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
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
  const timelineMonths = useMemo(() => {
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
    }, 800);

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

  // Calculate region metrics for the map
  const regionMetrics = useMemo(() => {
    const metrics: Record<string, number> = {};
    const regionMap: Record<string, string> = {
      WEST: "Western Province",
      EAST: "Eastern Province",
      CENTRAL: "Riyadh",
      SOUTH: "Asir",
    };

    currentMonth.movements.forEach((movement) => {
      const regionName = regionMap[movement.toRegion as keyof typeof regionMap] || movement.toRegion;
      if (regionName) {
        metrics[regionName] = (metrics[regionName] || 0) + 1;
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

    return {
      totalCOWs: Math.max(kpis.totalCOWs, uniqueCows.size || kpis.totalCOWs),
      totalMovements: currentMonth.movements.length,
      totalDistanceKM: currentMonth.totalDistance,
      activeCOWs: uniqueCows.size,
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
      name: "Full (Site→Site)",
      value: movementsByType.full,
      color: "#3B82F6",
    },
    {
      name: "Half (WH↔Site)",
      value: movementsByType.half,
      color: "#A855F7",
    },
    {
      name: "Zero (WH→WH)",
      value: movementsByType.zero,
      color: "#6B7280",
    },
  ];

  // Calculate EBU Classification data
  const totalCurrentMovements = currentMonth.movements.length;
  const royalCount = currentMonth.movements.filter(
    (m) => m.EbuRoyalCategory === "ROYAL",
  ).length;
  const ebuCount = currentMonth.movements.filter(
    (m) => m.EbuRoyalCategory === "EBU",
  ).length;
  const nonEbuCount = currentMonth.movements.filter(
    (m) => m.EbuRoyalCategory === "NON EBU",
  ).length;

  // Donut chart data for EBU Classification
  const ebuChartData = [
    {
      name: "ROYAL",
      value: royalCount,
      color: "#8b5cf6",
    },
    {
      name: "EBU",
      value: ebuCount,
      color: "#fbbf24",
    },
    {
      name: "NON EBU",
      value: nonEbuCount,
      color: "#6b7280",
    },
  ];

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
      label: "High Moved COWs",
      value: monthlyKpis.activeCOWs,
    },
    {
      label: "One Time Moved COWs",
      value: monthlyKpis.staticCOWs,
    },
    {
      label: "Avg Moves/COW",
      value: monthlyKpis.avgMovesPerCOW.toFixed(1),
    },
  ];

  const summaryStats = [
    {
      label: "Active Warehouses",
      value: 10,
    },
    {
      label: "Deployment Sites",
      value: sites.length,
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

  const eventCounts: Record<string, number> = {};
  currentMonth.movements.forEach((mov) => {
    const fromEvent = normalizeEventType(mov.From_Sub_Location);
    const toEvent = normalizeEventType(mov.To_Sub_Location);
    const eventType = mov.From_Sub_Location ? fromEvent : toEvent;
    eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
  });

  const eventData = Object.entries(eventCounts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: type,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  const eventDataWithPercentages = eventData.map((item) => ({
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

      {/* Main Split Layout: Map (40%) + Overview (60%) */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 p-4 overflow-hidden">
        {/* Left Side: Saudi Map (40%) */}
        <div className="w-full lg:w-2/5 flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
          <SaudiHighchartsMap
            regionMetrics={regionMetrics || {}}
            maxMetric={maxMetric}
            title="Movement Distribution by Region"
          />
        </div>

        {/* Right Side: Executive Overview (60%) */}
        <div className="w-full lg:w-3/5 flex flex-col overflow-y-auto gap-4">
          {/* KPI Cards - 3D Style with Purple Background */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-4 transform transition-all hover:scale-105 hover:shadow-2xl"
                style={{
                  boxShadow:
                    "0 15px 35px -5px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <p className="text-white text-xs font-bold uppercase tracking-wider">
                  {metric.label}
                </p>
                <p className="text-white text-2xl font-bold mt-2">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {summaryStats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-3 transform transition-all hover:scale-105"
                style={{
                  boxShadow:
                    "0 15px 35px -5px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <p className="text-white text-xs font-bold">
                  {stat.label}
                </p>
                <p className="text-white text-lg font-bold mt-1">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts: Movement Classification, EBU Classification, and Movements by Event Type - WHITE BACKGROUND */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1">
            {/* Movement Classification Donut Chart */}
            <div
              className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg border border-gray-200"
            >
              <h3 className="text-gray-900 text-sm font-bold mb-3 text-center">
                Movement Classification
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={movementChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {movementChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      color: "#000",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "10px" }}
                    formatter={(value, entry: any) => (
                      <span style={{ color: "#374151", fontSize: "11px" }}>
                        {entry.payload.name}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* EBU Classification Donut Chart */}
            <div
              className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg border border-gray-200"
            >
              <h3 className="text-gray-900 text-sm font-bold mb-3 text-center">
                EBU Classification
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={ebuChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ebuChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      color: "#000",
                    }}
                    formatter={(value: number) =>
                      `${value} movements (${totalCurrentMovements > 0 ? ((value / totalCurrentMovements) * 100).toFixed(1) : 0}%)`
                    }
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "10px" }}
                    formatter={(value, entry: any) => (
                      <span style={{ color: "#374151", fontSize: "11px" }}>
                        {entry.payload.name}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Movements by Event Type Donut Chart */}
            <div
              className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg border border-gray-200"
            >
              <h3 className="text-gray-900 text-sm font-bold mb-3 text-center">
                Movements by Event Type
              </h3>
              {eventDataWithPercentages.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={eventDataWithPercentages}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ displayName }) => displayName}
                      innerRadius={40}
                      outerRadius={70}
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
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        color: "#000",
                      }}
                      formatter={(value: number) =>
                        `${value} movements (${totalCurrentMovements > 0 ? ((value / totalCurrentMovements) * 100).toFixed(1) : 0}%)`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
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
