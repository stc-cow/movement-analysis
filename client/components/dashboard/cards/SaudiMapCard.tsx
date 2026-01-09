import { useState, useEffect, useMemo, useRef } from "react";
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
import { generateTimelineMonths, TimelineMonth } from "@/lib/saudiMapData";
import { SaudiHighchartsMap } from "./SaudiHighchartsMap";

interface SaudiMapCardProps {
  movements: CowMovementsFact[];
  cows: DimCow[];
  locations: DimLocation[];
}

// Vendor logo mapping
const VENDOR_LOGOS: Record<string, string> = {
  Ericsson: "https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2Fce8a05f0444047fbab6b38351ba3e00b?format=webp&width=800",
  Nokia: "https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F8b1d4da5de9a4830adc8ff8bb94f9384?format=webp&width=800",
  Huawei: "https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F1d0933328ffa4621ac07c43c539a6656?format=webp&width=800",
};

export function SaudiMapCard({
  movements,
  cows,
  locations,
}: SaudiMapCardProps) {
  const [timelineMonths, setTimelineMonths] = useState<TimelineMonth[]>([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIndexRef = useRef(0);

  // Generate timeline
  useEffect(() => {
    const months = generateTimelineMonths(movements, cows, locations);
    setTimelineMonths(months);
    setCurrentMonthIndex(Math.max(0, months.length - 1));
  }, [movements, cows, locations]);

  // Auto-play timeline
  useEffect(() => {
    if (!isPlaying || timelineMonths.length === 0) return;

    playIndexRef.current = currentMonthIndex === -1 ? 0 : currentMonthIndex;

    const interval = setInterval(() => {
      playIndexRef.current++;
      if (playIndexRef.current >= timelineMonths.length) {
        setIsPlaying(false);
        return;
      }
      setCurrentMonthIndex(playIndexRef.current);
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, timelineMonths.length]);

  // Get current month or aggregate all months
  const currentMonth = useMemo(() => {
    if (currentMonthIndex === -1 && timelineMonths.length > 0) {
      // Aggregate all months
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
        Object.entries(month.vendorCounts).forEach(([vendor, count]) => {
          aggregated.vendorCounts[vendor] =
            (aggregated.vendorCounts[vendor] || 0) + count;
        });
      });

      return aggregated;
    }
    return timelineMonths[currentMonthIndex] || null;
  }, [currentMonthIndex, timelineMonths]);

  // Calculate region metrics from movements based on destination region
  const regionMetrics = useMemo(() => {
    if (!currentMonth) return {};
    const metrics: Record<string, number> = {};
    const regionMap: Record<string, string> = {
      WEST: "Makkah",
      EAST: "Eastern Province",
      CENTRAL: "Riyadh",
      SOUTH: "Asir",
    };

    // Aggregate movements by destination region from mapLine data
    currentMonth.movements.forEach((mapLine) => {
      const regionName = regionMap[mapLine.toRegion] || mapLine.toRegion;
      metrics[regionName] = (metrics[regionName] || 0) + 1;
    });

    return metrics;
  }, [currentMonth]);

  // Get max metric for color scaling
  const maxRegionMetric = useMemo(() => {
    return Math.max(...Object.values(regionMetrics), 1) as number;
  }, [regionMetrics]);

  // Category chart data
  const categoryChartData = useMemo(() => {
    if (!currentMonth) return [];
    return [
      {
        name: "Full",
        value: currentMonth.movementCounts.Full,
        fill: "#3b82f6",
      },
      {
        name: "Half",
        value: currentMonth.movementCounts.Half,
        fill: "#a855f7",
      },
      {
        name: "Zero",
        value: currentMonth.movementCounts.Zero,
        fill: "#6b7280",
      },
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

  const COLORS = ["#3b82f6", "#a855f7", "#6b7280", "#10b981", "#f59e0b"];

  return (
    <div className="h-[calc(100vh-200px)] w-full overflow-hidden flex flex-col bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-slate-800">
      {/* Header with Controls - Enhanced Design */}
      <div className="flex-shrink-0 px-6 py-5 flex items-center justify-between bg-gradient-to-r from-white/80 via-blue-50/40 to-white/80 dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-800/80 border-b border-gray-200/40 dark:border-gray-700/40 backdrop-blur-sm">

        {/* Timeline Selector */}
        <div className="flex items-center gap-4 flex-1">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Timeline:
          </label>

          {/* Timeline Slider */}
          <input
            type="range"
            min="-1"
            max={timelineMonths.length - 1}
            value={currentMonthIndex}
            onChange={(e) => {
              setCurrentMonthIndex(parseInt(e.target.value));
              setIsPlaying(false);
            }}
            className="flex-1 px-3 py-2 h-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full accent-blue-600 cursor-pointer"
          />

          {/* Month Label */}
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 min-w-[120px] text-right">
            {currentMonthIndex === -1
              ? "All Months"
              : timelineMonths[currentMonthIndex]
              ? `${timelineMonths[currentMonthIndex].month} ${timelineMonths[currentMonthIndex].year}`
              : "Select"}
          </span>

          {/* Play Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 font-bold text-sm whitespace-nowrap"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
        </div>
      </div>

      {/* Two-Column Layout: Map + Vendor */}
      <div className="flex-1 flex gap-0 overflow-hidden bg-gradient-to-b from-white/50 to-white dark:from-slate-800/50 dark:to-slate-800">
        {/* Center Panel: Highcharts Saudi Map - Expanded */}
        <div className="flex-1 border-r border-gray-200 dark:border-gray-700 p-6 overflow-auto flex flex-col">
          <SaudiHighchartsMap
            regionMetrics={regionMetrics}
            maxMetric={maxRegionMetric}
            title="Movements by Region"
          />
        </div>

        {/* Right Panel: Vendor Chart - Compressed */}
        <div className="w-72 border-l border-gray-200/40 dark:border-gray-700/40 p-5 overflow-auto flex flex-col bg-gradient-to-b from-white/50 to-transparent dark:from-slate-800/50 dark:to-transparent">
          {/* Top Vendor Logo */}
          {vendorChartData.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-br from-purple-50/70 to-blue-50/70 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl border border-purple-200/50 dark:border-purple-800/30 flex items-center gap-3 hover:border-purple-300/70 dark:hover:border-purple-700/50 transition-all duration-300">
              <div className="w-16 h-16 flex-shrink-0 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-md hover:shadow-lg border border-gray-200/60 dark:border-gray-600/60 overflow-hidden transition-all duration-300">
                {VENDOR_LOGOS[vendorChartData[0].name] ? (
                  <img
                    src={VENDOR_LOGOS[vendorChartData[0].name]}
                    alt={vendorChartData[0].name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-sm">
                    {vendorChartData[0].name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1 uppercase tracking-wide">Top Vendor</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                  {vendorChartData[0].name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {vendorChartData[0].value} movements
                </p>
              </div>
            </div>
          )}

          <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
            📊 Vendor Distribution
          </h3>
          {vendorChartData.length > 0 ? (
            <div className="bg-gradient-to-br from-white/60 to-white/40 dark:from-slate-700/40 dark:to-slate-600/30 rounded-lg p-3 border border-purple-200/30 dark:border-purple-800/20 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={vendorChartData} margin={{ left: 30, right: 5, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#d1d5db" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Tooltip cursor={{ fill: "rgba(139, 92, 246, 0.15)" }} />
                  <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              No vendors
            </div>
          )}

          {vendorChartData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200/40 dark:border-gray-700/40 text-xs space-y-2">
              {vendorChartData.map((item) => (
                <div key={item.name} className="flex justify-between items-center p-2 hover:bg-white/40 dark:hover:bg-slate-700/40 rounded-lg transition-colors duration-200">
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                    {item.name}
                  </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-950/50 px-2 py-1 rounded-md text-xs">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
