import { useState, useEffect, useMemo } from "react";
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
    }, 2000);
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

  // Calculate region metrics from movements
  const regionMetrics = useMemo(() => {
    if (!currentMonth) return {};
    const metrics: Record<string, number> = {};
    const regionMap: Record<string, string> = {
      WEST: "Makkah",
      EAST: "Eastern Province",
      CENTRAL: "Riyadh",
      SOUTH: "Asir",
    };

    currentMonth.movements.forEach((mov) => {
      const toLoc = locations.find(
        (l) => l.Location_ID === mov.cowId.split("-")[0],
      );
      if (toLoc) {
        const regionName = regionMap[toLoc.Region] || toLoc.Region;
        metrics[regionName] = (metrics[regionName] || 0) + 1;
      }
    });

    return metrics;
  }, [currentMonth, locations]);

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
    <div className="h-[calc(100vh-200px)] w-full overflow-hidden flex flex-col bg-white dark:bg-slate-800">
      {/* Header with Controls */}
      <div className="flex-shrink-0 px-6 py-4 divider-modern flex items-center justify-between bg-gradient-to-r from-white to-gray-50 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center gap-2">
          {/* STC Logo */}
          <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
            STC
          </div>
        </div>

        {/* Timeline Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Month:
          </label>
          <select
            value={currentMonthIndex}
            onChange={(e) => {
              setCurrentMonthIndex(parseInt(e.target.value));
              setIsPlaying(false);
            }}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-slate-700 dark:text-white bg-white hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
          >
            <option value={-1}>All Months</option>
            {timelineMonths.map((month, idx) => (
              <option key={idx} value={idx}>
                {month.month} {month.year}
              </option>
            ))}
          </select>

          {/* Play Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-md transition-all duration-300 font-medium text-sm"
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

        {/* ACES Logo */}
        <div className="w-6 h-6 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
          ACES
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="flex-1 flex gap-0 overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* Left Panel: Movement Classification */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-6 overflow-auto flex flex-col">
          <h3 className="card-header">
            <span>≡</span> Movements by Category
          </h3>
          {categoryChartData.length > 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={90}
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
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              No movements this month
            </div>
          )}
          {currentMonth && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2 text-sm">
                {categoryChartData.map((item) => (
                  <div key={item.name} className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.name}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Panel: Highcharts Saudi Map */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-6 overflow-auto flex flex-col">
          <SaudiHighchartsMap
            regionMetrics={regionMetrics}
            maxMetric={maxRegionMetric}
            title="Movements by Region"
            totalMovements={currentMonth?.movements.length || 0}
          />
        </div>

        {/* Right Panel: Vendor Chart */}
        <div className="w-1/3 p-6 overflow-auto flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>≡</span> Movements by Vendor
          </h3>
          {vendorChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorChartData} margin={{ left: 60, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              No vendors active
            </div>
          )}

          {currentMonth && vendorChartData.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2 text-sm">
                {vendorChartData.map((item) => (
                  <div key={item.name} className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300 truncate">
                      {item.name}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
