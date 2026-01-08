import { useState, useEffect, useMemo } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CowMovementsFact, DimCow, DimLocation } from "@shared/models";
import {
  generateTimelineMonths,
  TimelineMonth,
} from "@/lib/saudiMapData";

interface SaudiMapCardProps {
  movements: CowMovementsFact[];
  cows: DimCow[];
  locations: DimLocation[];
}

export function SaudiMapCard({
  movements,
  cows,
  locations,
}: SaudiMapCardProps) {
  const [timelineMonths, setTimelineMonths] = useState<TimelineMonth[]>([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Generate timeline
  useEffect(() => {
    const months = generateTimelineMonths(movements, cows, locations);
    setTimelineMonths(months);
    setCurrentMonthIndex(Math.max(0, months.length - 1));
  }, [movements, cows, locations]);

  // Auto-play timeline
  useEffect(() => {
    if (!isPlaying || timelineMonths.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMonthIndex((prev) => (prev + 1) % timelineMonths.length);
    }, 1500); // 1.5 seconds per month

    return () => clearInterval(interval);
  }, [isPlaying, timelineMonths.length]);

  const currentMonth = timelineMonths[currentMonthIndex];
  const currentMovements = currentMonth?.movements || [];

  // Prepare data for visualization
  const warehousePoints = useMemo(() => {
    return locations
      .filter((l) => l.Location_Type === "Warehouse")
      .map((l) => ({
        lon: l.Longitude,
        lat: l.Latitude,
        name: l.Location_Name.split(" ")[0],
        type: "warehouse",
      }));
  }, [locations]);

  const sitePoints = useMemo(() => {
    return locations
      .filter((l) => l.Location_Type === "Site")
      .map((l) => ({
        lon: l.Longitude,
        lat: l.Latitude,
        name: l.Location_Name.split(" ")[0],
        type: "site",
      }));
  }, [locations]);

  // Movement flow data for scatter
  const movementFlows = useMemo(() => {
    return currentMovements.map((mov) => ({
      x: mov.from[0],
      y: mov.from[1],
      xEnd: mov.to[0],
      yEnd: mov.to[1],
      cowId: mov.cowId,
      distance: mov.distance,
      type: mov.movementType,
      vendor: mov.vendor,
      date: mov.date,
    }));
  }, [currentMovements]);

  // Category chart data
  const categoryChartData = useMemo(() => {
    if (!currentMonth) return [];
    return [
      { name: "Full", value: currentMonth.movementCounts.Full, fill: "#3b82f6" },
      { name: "Half", value: currentMonth.movementCounts.Half, fill: "#a855f7" },
      { name: "Zero", value: currentMonth.movementCounts.Zero, fill: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [currentMonth]);

  // Vendor chart data
  const vendorChartData = useMemo(() => {
    if (!currentMonth) return [];
    return Object.entries(currentMonth.vendorCounts)
      .map(([vendor, count]) => ({
        name: vendor,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [currentMonth]);

  // Saudi Arabia bounds for map
  const saudiMapData = useMemo(() => {
    const allLons = [...warehousePoints, ...sitePoints].map((p) => p.lon);
    const allLats = [...warehousePoints, ...sitePoints].map((p) => p.lat);
    return {
      minLon: Math.min(...allLons) - 1,
      maxLon: Math.max(...allLons) + 1,
      minLat: Math.min(...allLats) - 1,
      maxLat: Math.max(...allLats) + 1,
    };
  }, [warehousePoints, sitePoints]);

  const COLORS = ["#3b82f6", "#a855f7", "#6b7280", "#10b981", "#f59e0b"];

  return (
    <div className="h-[calc(100vh-200px)] overflow-hidden flex flex-col gap-0">
      {/* Main Layout: Map + Right Panel */}
      <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
        {/* Left: Map and Category Chart */}
        <div className="flex-1 flex flex-col gap-0 overflow-hidden">
          {/* Interactive Map */}
          <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden relative border border-gray-200">
            <svg
              viewBox={`${saudiMapData.minLon} ${saudiMapData.minLat} ${saudiMapData.maxLon - saudiMapData.minLon} ${saudiMapData.maxLat - saudiMapData.minLat}`}
              className="w-full h-full"
            >
              {/* Movement flows */}
              {movementFlows.map((flow, idx) => (
                <g key={`flow-${idx}`}>
                  <line
                    x1={flow.x}
                    y1={flow.y}
                    x2={flow.xEnd}
                    y2={flow.yEnd}
                    stroke={
                      flow.type === "Full"
                        ? "#3b82f6"
                        : flow.type === "Half"
                          ? "#a855f7"
                          : "#6b7280"
                    }
                    strokeWidth="0.15"
                    opacity="0.6"
                    strokeLinecap="round"
                  />
                  {/* Arrow head */}
                  <circle
                    cx={flow.xEnd}
                    cy={flow.yEnd}
                    r="0.1"
                    fill={
                      flow.type === "Full"
                        ? "#3b82f6"
                        : flow.type === "Half"
                          ? "#a855f7"
                          : "#6b7280"
                    }
                  />
                </g>
              ))}

              {/* Warehouse markers */}
              {warehousePoints.map((wh, idx) => (
                <g key={`wh-${idx}`}>
                  <rect
                    x={wh.lon - 0.2}
                    y={wh.lat - 0.2}
                    width="0.4"
                    height="0.4"
                    fill="#8b7355"
                    opacity="0.8"
                    rx="0.05"
                  />
                  <title>{wh.name}</title>
                </g>
              ))}

              {/* Site markers */}
              {sitePoints.map((site, idx) => (
                <g key={`site-${idx}`}>
                  <circle
                    cx={site.lon}
                    cy={site.lat}
                    r="0.12"
                    fill="#06b6d4"
                    opacity="0.8"
                  />
                  <title>{site.name}</title>
                </g>
              ))}
            </svg>

            {/* Fixed Logos Overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm z-50">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">STC</span>
            </div>
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm z-50">
              <span className="text-xs font-semibold text-purple-600">ACES</span>
            </div>

            {/* Month Label Overlay */}
            {currentMonth && (
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-4 py-3 rounded-lg shadow-md z-50 border border-blue-200">
                <p className="text-sm font-bold text-gray-900">
                  {currentMonth.month} {currentMonth.year}
                </p>
                <p className="text-xs text-gray-700">
                  {currentMonth.movements.length} movements • {currentMonth.totalDistance.toLocaleString()} KM
                </p>
              </div>
            )}
          </div>

          {/* Movement Category Chart Below Map */}
          <div className="h-32 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-3">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
              Movement Classification
            </h3>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-500 h-full flex items-center">
                No movements this month
              </p>
            )}
          </div>
        </div>

        {/* Right Panel: Vendor Chart + Timeline Controls */}
        <div className="w-64 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
          {/* Vendor Chart */}
          <div className="flex-1 border-b border-gray-200 dark:border-gray-700 p-3 overflow-hidden">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
              Active Vendors
            </h3>
            {vendorChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorChartData} layout="vertical" margin={{ left: 60 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-500">No vendors active</p>
            )}
          </div>

          {/* Timeline Controls */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
            {/* Play/Pause */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Play
                  </>
                )}
              </button>
            </div>

            {/* Timeline Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={Math.max(0, timelineMonths.length - 1)}
                value={currentMonthIndex}
                onChange={(e) => {
                  setCurrentMonthIndex(parseInt(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{timelineMonths[0]?.month} {timelineMonths[0]?.year}</span>
                <span>
                  {currentMonth?.month} {currentMonth?.year}
                </span>
                <span>
                  {timelineMonths[timelineMonths.length - 1]?.month}{" "}
                  {timelineMonths[timelineMonths.length - 1]?.year}
                </span>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCurrentMonthIndex(Math.max(0, currentMonthIndex - 1))
                }
                disabled={currentMonthIndex === 0}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentMonthIndex(
                    Math.min(timelineMonths.length - 1, currentMonthIndex + 1)
                  )
                }
                disabled={currentMonthIndex === timelineMonths.length - 1}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Month Info */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded p-2 text-xs border border-blue-200 dark:border-blue-800">
              <p className="text-blue-900 dark:text-blue-200 font-semibold">
                {currentMonthIndex + 1} / {timelineMonths.length}
              </p>
              <p className="text-blue-800 dark:text-blue-300 text-xs">
                {currentMonth?.movements.length || 0} movements
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
