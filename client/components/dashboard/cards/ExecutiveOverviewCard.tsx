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
import { calculateRepeatedMovementSites, calculateOneTimeMovedCows } from "@/lib/analytics";

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
    }, 1500); // 1500ms = faster playback (4x faster than current)

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

    // Count sites repeated 2 or more times dynamically
    const highMovedCows = calculateRepeatedMovementSites(currentMonth.movements);

    // Use API's totalDistanceKM for "All" view (currentMonthIndex === -1) which is the accurate sum of Column Y
    // For individual months, use the timeline's aggregated distance
    const totalDistanceForDisplay =
      currentMonthIndex === -1
        ? kpis.totalDistanceKM
        : currentMonth.totalDistance;

    return {
      totalCOWs: Math.max(kpis.totalCOWs, uniqueCows.size || kpis.totalCOWs),
      totalMovements: currentMonth.movements.length,
      totalDistanceKM: totalDistanceForDisplay,
      activeCOWs: uniqueCows.size,
      highMovedCows: highMovedCows,
      staticCOWs: kpis.staticCOWs,
      avgMovesPerCOW:
        uniqueCows.size > 0
          ? currentMonth.movements.length / uniqueCows.size
          : 0,
    };
  }, [currentMonth, kpis, currentMonthIndex]);

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
  const totalMovementClassifications =
    movementsByType.full + movementsByType.half + movementsByType.zero;
  const movementChartData = [
    {
      name: "Full",
      value: movementsByType.full,
      color: "#FF375E", // Red (Base)
      percentage: (
        (movementsByType.full / (totalMovementClassifications || 1)) *
        100
      ).toFixed(1),
    },
    {
      name: "Half",
      value: movementsByType.half,
      color: "#1Bced8", // Teal (Base)
      percentage: (
        (movementsByType.half / (totalMovementClassifications || 1)) *
        100
      ).toFixed(1),
    },
    {
      name: "Zero",
      value: movementsByType.zero,
      color: "#4F008C", // Purple (Base)
      percentage: (
        (movementsByType.zero / (totalMovementClassifications || 1)) *
        100
      ).toFixed(1),
    },
  ];

  // Calculate Movement by Event Type data from Column R (fromSubLocation in MapLine)
  // If fromSubLocation is empty, fall back to toSubLocation
  const eventTypeCounts: Record<string, number> = {};

  currentMonth.movements.forEach((mov: any) => {
    // MapLine objects have fromSubLocation/toSubLocation (camelCase)
    // Try fromSubLocation first, then toSubLocation, default to "Other"
    const rawValue =
      mov.fromSubLocation?.trim() || mov.toSubLocation?.trim() || "Other";
    const eventType = rawValue.length > 0 ? rawValue : "Other";
    eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1;
  });

  const totalEventTypeMovements = currentMonth.movements.length;
  const movementByEventTypeData = Object.entries(eventTypeCounts)
    .map(([type, count]) => ({
      name: type,
      value: count,
      percentage: ((count / (totalEventTypeMovements || 1)) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value);

  // Color mapping for event types
  const EVENT_TYPE_COLOR_MAP: Record<string, string> = {
    Event: "#FF375E", // Red (Base)
    Other: "#1Bced8", // Teal (Base)
    "Mega project": "#4F008C", // Purple (Base)
    Royal: "#FF6F8A", // Red (Light)
    WH: "#5FE0E7", // Teal (Light)
  };

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

  // Vendor logos and branding
  const VENDOR_LOGOS: Record<string, string> = {
    Ericsson:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50'%3E%3Crect fill='%23E8F2FF' width='100' height='50'/%3E%3Ctext x='50' y='35' font-family='Arial' font-size='20' font-weight='bold' fill='%23002E5C' text-anchor='middle'%3EEricsson%3C/text%3E%3C/svg%3E",
    Nokia:
      "https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F678f82bc9d334b3994979166456b650d?format=webp&width=800",
    Huawei:
      "https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2Fd1ba7c0e87ca426ba5edf2584d5648dd?format=webp&width=800",
  };

  // Vendor branding colors
  const VENDOR_COLORS: Record<string, { color: string; bgColor: string }> = {
    Nokia: { color: "#124191", bgColor: "#E8F0FF" },
    Ericsson: { color: "#002E5C", bgColor: "#E8F2FF" },
    Huawei: { color: "#FF0000", bgColor: "#FFE8E8" },
    Samsung: { color: "#1428A0", bgColor: "#E8ECFF" },
    ZTE: { color: "#00A500", bgColor: "#E8F5E8" },
  };

  // KPI Card color scheme matching TopEventsMovementCard
  const KPI_CARD_COLORS = [
    "#FF375E", // Red (Base)
    "#1Bced8", // Teal (Base)
    "#4F008C", // Purple (Base)
    "#FF6F8A", // Red (Light)
    "#5FE0E7", // Teal (Light)
    "#7A3DB8", // Purple (Light)
  ];

  // Custom X-axis tick component with vendor logo image
  const VendorXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const vendorName = payload.value;
    const logoUrl = VENDOR_LOGOS[vendorName];
    const vendorColor = VENDOR_COLORS[vendorName];
    const bgColor = vendorColor?.bgColor || "#f0f0f0";

    if (!logoUrl) return null;

    return (
      <g transform={`translate(${x},${y})`}>
        <rect x="-26" y="-11" width="52" height="22" rx="3" fill={bgColor} />
        <image
          x="-24"
          y="-10"
          width="48"
          height="20"
          xlinkHref={logoUrl}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    );
  };

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
      <div className="flex flex-col lg:flex-row flex-1 gap-3 p-3 overflow-y-auto">
        {/* LEFT PANEL (60%): Map + Vendor Chart */}
        <div className="w-full lg:w-3/5 flex flex-col gap-3 min-h-fit lg:min-h-0">
          {/* Movement Distribution Map (65% of left panel) */}
          <div className="flex-1 min-h-[500px] bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
            <SaudiHighchartsMap
              regionMetrics={regionMetrics || {}}
              maxMetric={maxMetric}
              title="Movement Distribution by Region"
            />

            {/* Month-Year Indicator */}
            <div className="flex justify-center items-center px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full text-white font-semibold text-sm shadow-md">
                <span className="text-lg">📅</span>
                <span>
                  {currentMonthIndex === -1
                    ? "All Months"
                    : `${timelineMonths[currentMonthIndex]?.month} ${timelineMonths[currentMonthIndex]?.year}`}
                </span>
              </div>
            </div>
          </div>

          {/* Top Vendor Chart (35% of left panel) */}
          <div className="h-48 bg-white rounded-lg p-3 border border-gray-200 shadow-sm flex flex-col">
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
            {metrics.map((metric, idx) => {
              const borderColor = KPI_CARD_COLORS[idx % KPI_CARD_COLORS.length];
              return (
                <div
                  key={metric.label}
                  className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
                  style={{
                    borderTopWidth: "4px",
                    borderTopColor: borderColor,
                  }}
                >
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-1">
                    {metric.label}
                  </p>
                  <p className="text-gray-900 text-lg font-bold">
                    {metric.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Active Warehouse & One Time Moved COWs - Matching Total COWs Style */}
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            {/* One Time Moved COWs Card */}
            <div
              className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
              style={{
                borderTopWidth: "4px",
                borderTopColor: "#1Bced8",
              }}
            >
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-1">
                One Time Moved COWs
              </p>
              <p className="text-gray-900 text-lg font-bold">
                {monthlyKpis.staticCOWs}
              </p>
            </div>

            {/* Active Warehouses Card */}
            <div
              className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow"
              style={{
                borderTopWidth: "4px",
                borderTopColor: "#4F008C",
              }}
            >
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-1">
                Active Warehouses
              </p>
              <p className="text-gray-900 text-lg font-bold">
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
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name} (${percentage}%)`
                      }
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

            {/* Movement by Event Type Donut (Column R) */}
            <div className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <h3 className="text-gray-900 text-xs font-bold text-center flex-shrink-0">
                Movement Category
              </h3>
              {movementByEventTypeData.length > 0 ? (
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={movementByEventTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={1}
                        dataKey="value"
                        labelLine={false}
                        label={({ name, percentage }) =>
                          `${name} (${percentage}%)`
                        }
                      >
                        {movementByEventTypeData.map((entry, index) => (
                          <Cell
                            key={`event-type-${index}`}
                            fill={EVENT_TYPE_COLOR_MAP[entry.name] || "#a855f7"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name, props) =>
                          `${value} movements (${props.payload.percentage}%)`
                        }
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
                  No event type data
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
