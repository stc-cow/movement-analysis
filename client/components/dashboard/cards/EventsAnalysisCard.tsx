import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CowMovementsFact, DimEvent } from "@shared/models";

interface EventsAnalysisCardProps {
  movements: CowMovementsFact[];
  events: DimEvent[];
}

const EVENT_COLORS: Record<string, string> = {
  Hajj: "#FF375E", // Red (Base)
  Umrah: "#1Bced8", // Teal (Base)
  Royal: "#4F008C", // Purple (Base)
  "Mega Project": "#FF6F8A", // Red (Light)
  "National Event": "#5FE0E7", // Teal (Light)
  Seasonal: "#7A3DB8", // Purple (Light)
  Event: "#CC2C4B", // Red (Dark)
  "Normal Coverage": "#159CA3", // Teal (Dark)
};

// Normalize event type names
function normalizeEventType(type: string | undefined): string {
  if (!type) return "Normal Coverage";
  const normalized = type.trim().toLowerCase();

  // Match against known event types
  if (normalized.includes("hajj")) return "Hajj";
  if (normalized.includes("umrah")) return "Umrah";
  if (normalized.includes("royal")) return "Royal";
  if (normalized.includes("mega")) return "Mega Project";
  if (normalized.includes("national")) return "National Event";
  if (normalized.includes("seasonal")) return "Seasonal";
  if (normalized.includes("event")) return "Event";
  if (normalized.includes("normal")) return "Normal Coverage";

  // Return original if it's a non-empty custom event type
  return type;
}

export function EventsAnalysisCard({
  movements,
  events,
}: EventsAnalysisCardProps) {
  // Analyze event types from From_Sub_Location and To_Sub_Location fields
  const eventCounts: Record<string, number> = {};
  const distanceByEvent: Record<string, { total: number; count: number }> = {};

  movements.forEach((mov) => {
    // Check both From and To event types
    const fromEvent = normalizeEventType(mov.From_Sub_Location);
    const toEvent = normalizeEventType(mov.To_Sub_Location);

    // Use From event if available, otherwise use To event
    const eventType = mov.From_Sub_Location ? fromEvent : toEvent;

    // Count event occurrences
    eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;

    // Aggregate distances
    if (!distanceByEvent[eventType]) {
      distanceByEvent[eventType] = { total: 0, count: 0 };
    }
    distanceByEvent[eventType].total += mov.Distance_KM || 0;
    distanceByEvent[eventType].count++;
  });

  const eventData = Object.entries(eventCounts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: type,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  const totalMovements = movements.length;
  const eventDataWithPercentages = eventData
    .filter((item) => item.name !== "Normal Coverage") // Remove mock data
    .map((item) => ({
      ...item,
      percentage: ((item.value / totalMovements) * 100).toFixed(1),
      displayName: `${item.name} (${((item.value / totalMovements) * 100).toFixed(1)}%)`,
    }));

  const distanceData = Object.entries(distanceByEvent)
    .filter(([type, data]) => data.count > 0 && type !== "Normal Coverage")
    .map(([type, data]) => ({
      type,
      avgDistance: Math.round((data.total / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.avgDistance - a.avgDistance);

  const totalEventsData =
    eventDataWithPercentages.length > 0 ? eventDataWithPercentages : [];
  const topEventType = eventData[0];
  const topDistance = distanceData[0];

  // KPI Card color scheme
  const KPI_CARD_COLORS = [
    "#FF375E", // Red (Base)
    "#1Bced8", // Teal (Base)
    "#4F008C", // Purple (Base)
    "#FF6F8A", // Red (Light)
  ];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
      {/* Charts Section - Responsive Height */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 h-72 sm:h-80 md:h-96">
        {/* Event distribution pie */}
        <div
          className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col"
          style={{
            borderTopWidth: "4px",
            borderTopColor: "#4F008C",
          }}
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Movements by Event Type
          </h3>
          {totalEventsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalEventsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ displayName }) => displayName}
                  innerRadius={40}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {totalEventsData.map((entry, index) => (
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
                    `${value} movements (${((value / totalMovements) * 100).toFixed(1)}%)`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No event data available
            </div>
          )}
        </div>

        {/* Distance by event */}
        <div
          className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-hidden flex flex-col"
          style={{
            borderTopWidth: "4px",
            borderTopColor: "#1Bced8",
          }}
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex-shrink-0">
            Average Distance by Event Type
          </h3>
          {distanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distanceData}
                margin={{ top: 5, right: 20, left: -20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="type"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 11 }}
                />
                <YAxis width={40} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => `${value.toFixed(2)} KM`}
                />
                <Bar
                  dataKey="avgDistance"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No distance data available
            </div>
          )}
        </div>
      </div>

      {/* Event statistics - KPI Cards */}
      <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div
          className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 sm:p-3"
          style={{
            borderTopWidth: "4px",
            borderTopColor: KPI_CARD_COLORS[0],
          }}
        >
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Total Events Tracked
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {Object.keys(eventCounts).length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Event type categories
          </div>
        </div>

        {topEventType && (
          <div
            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 sm:p-3"
            style={{
              borderTopWidth: "4px",
              borderTopColor: KPI_CARD_COLORS[1],
            }}
          >
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Most Common Event
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {topEventType.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {topEventType.name}
            </div>
          </div>
        )}

        {topDistance && (
          <div
            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 sm:p-3"
            style={{
              borderTopWidth: "4px",
              borderTopColor: KPI_CARD_COLORS[2],
            }}
          >
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Longest Avg Distance
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {topDistance.avgDistance.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {topDistance.type} (KM)
            </div>
          </div>
        )}

        <div
          className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 sm:p-3"
          style={{
            borderTopWidth: "4px",
            borderTopColor: KPI_CARD_COLORS[3],
          }}
        >
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Total Movements
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {totalMovements}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            movements analyzed
          </div>
        </div>
      </div>

      {/* Detailed event breakdown */}
      {eventData.length > 0 && (
        <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 sm:p-4">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-4">
            Event Type Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {eventData.map(({ name, value }) => (
              <div
                key={name}
                className="p-2 sm:p-3 rounded text-center"
                style={{
                  backgroundColor: `${EVENT_COLORS[name] || "#6b7280"}15`,
                  borderWidth: "2px",
                  borderColor: EVENT_COLORS[name] || "#6b7280",
                  borderTopWidth: "4px",
                  borderTopColor: EVENT_COLORS[name] || "#6b7280",
                }}
              >
                <div
                  className="text-sm sm:text-base font-bold mb-0.5"
                  style={{ color: EVENT_COLORS[name] || "#6b7280" }}
                >
                  {value}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {((value / totalMovements) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
