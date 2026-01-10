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
import { CowMovementsFact } from "@shared/models";

interface RoyalEBUAnalysisCardProps {
  movements: CowMovementsFact[];
}

/**
 * RoyalEBUAnalysisCard
 *
 * Displays analysis of Royal, EBU, and NON EBU movements
 * Data source: Column E (ebu_royal_flag) from Google Sheet
 * Three mutually exclusive categories:
 * - ROYAL: contains "Royal"
 * - EBU: contains "EBU" (but NOT "Royal")
 * - NON EBU: contains neither
 */
export function RoyalEBUAnalysisCard({ movements }: RoyalEBUAnalysisCardProps) {
  const totalMovements = movements.length;

  // Count by three mutually exclusive categories
  const royalCount = movements.filter(
    (m) => m.EbuRoyalCategory === "ROYAL",
  ).length;
  const ebuCount = movements.filter((m) => m.EbuRoyalCategory === "EBU").length;
  const nonEbuCount = movements.filter(
    (m) => m.EbuRoyalCategory === "NON EBU",
  ).length;

  const categoryData = [
    {
      name: "ROYAL",
      value: royalCount,
      displayName: `ROYAL (${((royalCount / totalMovements) * 100).toFixed(1)}%)`,
    },
    {
      name: "EBU",
      value: ebuCount,
      displayName: `EBU (${((ebuCount / totalMovements) * 100).toFixed(1)}%)`,
    },
    {
      name: "NON EBU",
      value: nonEbuCount,
      displayName: `NON EBU (${((nonEbuCount / totalMovements) * 100).toFixed(1)}%)`,
    },
  ];

  // Distance by category
  const royalDistance = movements
    .filter((m) => m.EbuRoyalCategory === "ROYAL")
    .reduce((sum, m) => sum + (m.Distance_KM || 0), 0);
  const ebuDistance = movements
    .filter((m) => m.EbuRoyalCategory === "EBU")
    .reduce((sum, m) => sum + (m.Distance_KM || 0), 0);
  const nonEbuDistance = movements
    .filter((m) => m.EbuRoyalCategory === "NON-EBU")
    .reduce((sum, m) => sum + (m.Distance_KM || 0), 0);

  const distanceData = [
    {
      type: "ROYAL",
      distance: Math.round((royalDistance / Math.max(royalCount, 1)) * 100) / 100 || 0,
    },
    {
      type: "EBU",
      distance: Math.round((ebuDistance / Math.max(ebuCount, 1)) * 100) / 100 || 0,
    },
    {
      type: "NON-EBU",
      distance: Math.round((nonEbuDistance / Math.max(nonEbuCount, 1)) * 100) / 100 || 0,
    },
  ];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
        {/* EBU Classification - Three Categories */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            EBU Classification
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ displayName }) => displayName}
                innerRadius={50}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => {
                  const colors = ["#8b5cf6", "#fbbf24", "#6b7280"];
                  return <Cell key={`cell-${index}`} fill={colors[index]} />;
                })}
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
        </div>

        {/* Average distance comparison */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            Average Distance Deployed
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distanceData}>
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
              <Bar dataKey="distance" fill="#ec4899" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistics summary - Three categories */}
      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 px-3 sm:px-4 md:px-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            ROYAL Movements
          </div>
          <div className="text-2xl font-bold text-purple-600">{royalCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((royalCount / totalMovements) * 100).toFixed(1)}% of total
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            EBU Movements
          </div>
          <div className="text-2xl font-bold text-yellow-600">{ebuCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((ebuCount / totalMovements) * 100).toFixed(1)}% of total
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            NON-EBU Movements
          </div>
          <div className="text-2xl font-bold text-gray-600">{nonEbuCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((nonEbuCount / totalMovements) * 100).toFixed(1)}% of total
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Avg ROYAL Distance
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {distanceData[0].distance.toFixed(0)} KM
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Avg EBU Distance
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {distanceData[1].distance.toFixed(0)} KM
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Avg NON-EBU Distance
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {distanceData[2].distance.toFixed(0)} KM
          </div>
        </div>
      </div>
    </div>
  );
}
