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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COWMetrics } from "@shared/models";

interface COWUtilizationCardProps {
  cowMetrics: COWMetrics[];
}

export function COWUtilizationCard({ cowMetrics }: COWUtilizationCardProps) {
  // Histogram data
  const movementBuckets: Record<string, number> = {
    "0-5": 0,
    "6-10": 0,
    "11-20": 0,
    "21-50": 0,
    "50+": 0,
  };

  cowMetrics.forEach((cow) => {
    if (cow.Total_Movements <= 5) movementBuckets["0-5"]++;
    else if (cow.Total_Movements <= 10) movementBuckets["6-10"]++;
    else if (cow.Total_Movements <= 20) movementBuckets["11-20"]++;
    else if (cow.Total_Movements <= 50) movementBuckets["21-50"]++;
    else movementBuckets["50+"]++;
  });

  const histogramData = Object.entries(movementBuckets).map(
    ([range, count]) => ({
      range,
      count,
    }),
  );

  // Colors for each utilization bucket - red (low) to green (high)
  const BUCKET_COLORS = [
    "#FF375E", // Red (Base): 0-5 (low utilization)
    "#CC2C4B", // Red (Dark): 6-10
    "#FF6F8A", // Red (Light): 11-20
    "#1Bced8", // Teal (Base): 21-50
    "#5FE0E7", // Teal (Light): 50+ (high utilization)
  ];

  const topMostMoved = cowMetrics
    .sort((a, b) => b.Total_Movements - a.Total_Movements)
    .slice(0, 8);

  const topLeastMoved = cowMetrics
    .filter((c) => !c.Is_Static)
    .sort((a, b) => a.Total_Movements - b.Total_Movements)
    .slice(0, 8);

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-4 p-4">
      {/* Histogram */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Utilization Distribution
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Bar
              dataKey="count"
              radius={[8, 8, 0, 0]}
              label={{
                position: "top",
                fill: "#374151",
                fontSize: 10,
                fontWeight: "bold",
                formatter: (value: number) => value.toString(),
              }}
            >
              {histogramData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={BUCKET_COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top and Bottom COWs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Most utilized */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex-shrink-0">
            Most Utilized
          </h3>
          <div className="overflow-y-auto flex-1">
            <div className="space-y-2 pr-2">
              {topMostMoved.map((cow) => (
                <div
                  key={cow.COW_ID}
                  className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-semibold text-blue-600">
                      {cow.COW_ID}
                    </span>
                    <span className="font-bold">{cow.Total_Movements}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {cow.Total_Distance_KM.toLocaleString()} KM •{" "}
                    {cow.Regions_Served.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Least utilized */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex-shrink-0">
            Least Utilized
          </h3>
          <div className="overflow-y-auto flex-1">
            <div className="space-y-2 pr-2">
              {topLeastMoved.map((cow) => (
                <div
                  key={cow.COW_ID}
                  className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-semibold text-orange-600">
                      {cow.COW_ID}
                    </span>
                    <span className="font-bold">{cow.Total_Movements}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {cow.Total_Distance_KM.toFixed(0)} KM •{" "}
                    {cow.Regions_Served.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
