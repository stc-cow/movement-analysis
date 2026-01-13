import { useMemo } from "react";
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
import { CowMovementsFact } from "@shared/models";
import { calculateTopEvents, TopEventData } from "@/lib/analytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TopEventsMovementCardProps {
  movements: CowMovementsFact[];
}

// Logo mapping for top events - match by lowercase for flexibility
interface EventLogo {
  name: string;
  emoji?: string; // For emoji-based logos
  imageUrl?: string; // For image-based logos
  color: string;
}

const EVENT_LOGOS: Record<string, EventLogo> = {
  "riyadh season": {
    name: "Riyadh Season",
    emoji: "🎪",
    color: "#9f1d20",
  },
  "jeddah season": {
    name: "Jeddah Season",
    emoji: "🌊",
    color: "#00a9d5",
  },
  hajj: {
    name: "Hajj",
    emoji: "⛩️",
    color: "#1f4788",
  },
  "formula 1": {
    name: "Formula 1",
    emoji: "🏎️",
    color: "#e3000f",
  },
  "formula e": {
    name: "Formula E",
    emoji: "⚡",
    color: "#1a5c7a",
  },
  mdlbeast: {
    name: "MDLBEAST",
    emoji: "🎵",
    color: "#000000",
  },
  "fifa world cup": {
    name: "FIFA World Cup",
    emoji: "⚽",
    color: "#003366",
  },
  "camel festival": {
    name: "Camel Festival",
    imageUrl: "https://cdn.builder.io/api/v1/image/assets%2Fabc8ab05f7d144f289a582747d3e5ca3%2F153f48735c454e7fa35cb585f06eecf3?format=webp&width=800",
    color: "#d4a574",
  },
};

// Helper function to find matching logo for an event
function getLogoForEvent(eventName: string): EventLogo {
  const eventLower = eventName.toLowerCase();

  // First try exact match
  if (EVENT_LOGOS[eventLower]) {
    return EVENT_LOGOS[eventLower];
  }

  // Then try substring matching
  for (const [key, logo] of Object.entries(EVENT_LOGOS)) {
    if (eventLower.includes(key) || key.includes(eventLower)) {
      return logo;
    }
  }

  // Default fallback
  return {
    name: eventName,
    emoji: "📍",
    color: "#6366f1",
  };
}

// Bar colors for chart
const BAR_COLORS = [
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
];

export function TopEventsMovementCard({
  movements,
}: TopEventsMovementCardProps) {
  // Calculate top events
  const topEvents = useMemo(() => {
    return calculateTopEvents(movements);
  }, [movements]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return topEvents.map((event) => ({
      name: event.eventName,
      count: event.movementCount,
    }));
  }, [topEvents]);

  // Get top 3 events for logo section
  const topThree = useMemo(() => {
    return topEvents.slice(0, 3);
  }, [topEvents]);

  // Calculate total movements
  const totalMovements = useMemo(() => {
    return topEvents.reduce((sum, event) => sum + event.movementCount, 0);
  }, [topEvents]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
      {/* Top 3 Events Logos Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {topThree.map((event, index) => {
          const logoData = getLogoForEvent(event.eventName);

          return (
            <div
              key={event.eventName}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center"
              style={{
                borderTopWidth: "4px",
                borderTopColor: logoData.color,
              }}
            >
              <div
                className="text-5xl sm:text-6xl mb-3 drop-shadow-lg"
                style={{
                  filter: `drop-shadow(0 2px 4px ${logoData.color}33)`,
                }}
              >
                {logoData.emoji}
              </div>
              <h3 className="text-center font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-2">
                {logoData.name}
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {event.movementCount}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  movements
                </span>
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">
                {event.percentage}% of total
              </div>
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${event.percentage}%`,
                    backgroundColor: logoData.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col flex-shrink-0 min-h-[450px]">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
          Top Events Movement
        </h3>
        <div style={{ width: "100%", height: "350px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 200, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={190}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => `${value} movements`}
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              />
              <Bar
                dataKey="count"
                radius={[0, 12, 12, 0]}
                style={{ cursor: "pointer", filter: "drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.15))" }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
          Top 10 Event Movements
        </h3>
        {topEvents.length > 0 ? (
          <div className="overflow-x-auto flex-1">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900">
                  <TableHead className="text-center py-3 w-12">Rank</TableHead>
                  <TableHead className="text-left py-3">Event Name</TableHead>
                  <TableHead className="text-center py-3">
                    Total Movements
                  </TableHead>
                  <TableHead className="text-center py-3">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEvents.map((event, index) => (
                  <TableRow
                    key={event.eventName}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <TableCell className="py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold">
                        {index + 1}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 font-medium text-gray-900 dark:text-white">
                      {event.eventName}
                    </TableCell>
                    <TableCell className="text-center py-3 font-semibold text-gray-900 dark:text-white">
                      {event.movementCount}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${event.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-10">
                          {event.percentage}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-400">
            No events data available
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-700/50 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wide">
              Total Event Movements (Filtered)
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {totalMovements}
            </p>
          </div>
          <div className="text-right text-xs sm:text-sm text-blue-600 dark:text-blue-300">
            <p>Showing {topEvents.length} events</p>
            <p className="text-xs">WH & Others excluded</p>
          </div>
        </div>
      </div>
    </div>
  );
}
