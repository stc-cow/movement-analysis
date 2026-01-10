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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CowMovementsFact, DimLocation } from "@shared/models";

interface MovementTypesCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

export function MovementTypesCard({
  movements,
  locations,
}: MovementTypesCardProps) {
  const totalMovements = movements.length;

  // Movement type distribution
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

  const movementTypeDataWithPercentages = movementTypeData.map((item) => ({
    ...item,
    displayName: `${item.type} (${((item.count / totalMovements) * 100).toFixed(1)}%)`,
  }));

  // Timeline data
  const timelineMap = new Map<string, Record<string, number>>();
  movements.forEach((mov) => {
    const date = new Date(mov.Moved_DateTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!timelineMap.has(monthKey)) {
      timelineMap.set(monthKey, { Full: 0, Half: 0, Zero: 0 });
    }
    const entry = timelineMap.get(monthKey)!;
    const type = mov.Movement_Type || "Zero";
    entry[type] = (entry[type] || 0) + 1;
  });

  const timelineData = Array.from(timelineMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({ month, ...data }));

  const COLORS = ["#3b82f6", "#a855f7", "#6b7280"];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0">
        {/* Distribution Donut Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Movement Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={movementTypeDataWithPercentages}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ displayName }) => displayName}
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {movementTypeDataWithPercentages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
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
          <div className="mt-4 grid grid-cols-3 gap-2">
            {movementTypeData.map((item, idx) => (
              <div
                key={item.type}
                className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded"
              >
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {item.type}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {item.count}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Count by Type
          </h3>
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
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Movement Trend Over Time (5 Years)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Full"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Half"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Zero"
              stroke="#6b7280"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
