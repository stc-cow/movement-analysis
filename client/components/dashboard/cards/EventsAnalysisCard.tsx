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
  Hajj: "#f59e0b",
  Umrah: "#06b6d4",
  Royal: "#8b5cf6",
  "Mega Project": "#ec4899",
  "National Event": "#10b981",
  Seasonal: "#14b8a6",
  Event: "#3b82f6",
  "Normal Coverage": "#6b7280",
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
  const eventDataWithPercentages = eventData.map((item) => ({
    ...item,
    percentage: ((item.value / totalMovements) * 100).toFixed(1),
    displayName: `${item.name} (${((item.value / totalMovements) * 100).toFixed(1)}%)`,
  }));

  const distanceData = Object.entries(distanceByEvent)
    .filter(([_, data]) => data.count > 0)
    .map(([type, data]) => ({
      type,
      avgDistance: Math.round((data.total / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.avgDistance - a.avgDistance);

  const totalEventsData = eventDataWithPercentages.length > 0 ? eventDataWithPercentages : [];
  const topEventType = eventData[0];
  const topDistance = distanceData[0];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Event distribution pie */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
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
                  innerRadius={60}
                  outerRadius={100}
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
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            Average Distance by Event Type
          </h3>
          {distanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distanceData}
                margin={{ top: 5, right: 30, left: 0, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="type"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
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

      {/* Event statistics */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Event Statistics Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-700">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
              Total Events Tracked
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {Object.keys(eventCounts).length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Event type categories
            </div>
          </div>
          {topEventType && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded border border-purple-200 dark:border-purple-700">
              <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                Most Common Event
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {topEventType.value}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {topEventType.name}
              </div>
            </div>
          )}
          {topDistance && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-700">
              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                Longest Avg Distance
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {topDistance.avgDistance.toFixed(0)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {topDistance.type} (KM)
              </div>
            </div>
          )}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Total Movements
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {totalMovements}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              movements analyzed
            </div>
          </div>
        </div>
      </div>

      {/* Detailed event breakdown */}
      {eventData.length > 0 && (
        <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Event Type Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {eventData.map(({ name, value }) => (
              <div
                key={name}
                className="p-3 rounded border-2 text-center"
                style={{
                  backgroundColor: `${EVENT_COLORS[name] || "#6b7280"}15`,
                  borderColor: EVENT_COLORS[name] || "#6b7280",
                }}
              >
                <div
                  className="text-sm font-bold"
                  style={{ color: EVENT_COLORS[name] || "#6b7280" }}
                >
                  {value}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
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
