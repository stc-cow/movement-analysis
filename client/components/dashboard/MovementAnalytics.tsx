import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CowMovementsFact, DimLocation } from "@shared/models";

interface MovementAnalyticsProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

export function MovementAnalytics({
  movements,
  locations,
}: MovementAnalyticsProps) {
  // Movement Type Distribution
  const movementTypeData = [
    {
      type: "Full",
      count: movements.filter((m) => m.Movement_Type === "Full").length,
    },
    {
      type: "Half",
      count: movements.filter((m) => m.Movement_Type === "Half").length,
    },
    {
      type: "Zero",
      count: movements.filter((m) => m.Movement_Type === "Zero").length,
    },
  ];

  // Region-to-Region Heatmap Data
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));
  const regionTransitions = new Map<string, number>();

  movements.forEach((mov) => {
    const fromLoc = locMap.get(mov.From_Location_ID);
    const toLoc = locMap.get(mov.To_Location_ID);
    if (fromLoc && toLoc) {
      const key = `${fromLoc.Region} → ${toLoc.Region}`;
      regionTransitions.set(key, (regionTransitions.get(key) || 0) + 1);
    }
  });

  const heatmapData = Array.from(regionTransitions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([route, count]) => ({
      route,
      count,
    }));

  // Timeline: Movements over time (monthly)
  const timelineMap = new Map<string, number>();
  movements.forEach((mov) => {
    const date = new Date(mov.Moved_DateTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    timelineMap.set(monthKey, (timelineMap.get(monthKey) || 0) + 1);
  });

  const timelineData = Array.from(timelineMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({
      month,
      movements: count,
    }));

  return (
    <div className="space-y-4">
      {/* Bar Chart: Movement Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Movement Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={movementTypeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#1Bced8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {movementTypeData.map((item) => (
              <div
                key={item.type}
                className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {item.type}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {item.count}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Region-to-Region Movement */}
      <Card>
        <CardHeader>
          <CardTitle>Top Region Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={heatmapData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 250 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis dataKey="route" type="category" width={240} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#4F008C" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Timeline: Movements over 5 years */}
      <Card>
        <CardHeader>
          <CardTitle>Movements Timeline (Monthly)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="movements"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
