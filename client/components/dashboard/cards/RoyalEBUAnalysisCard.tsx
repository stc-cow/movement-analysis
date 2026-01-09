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

export function RoyalEBUAnalysisCard({ movements }: RoyalEBUAnalysisCardProps) {
  const royalCount = movements.filter((m) => m.Is_Royal).length;
  const nonRoyalCount = movements.length - royalCount;
  const ebuCount = movements.filter((m) => m.Is_EBU).length;
  const nonEbuCount = movements.length - ebuCount;

  const vipData = [
    { name: "Royal", value: royalCount },
    { name: "Non-Royal", value: nonRoyalCount },
  ];

  const ebuData = [
    { name: "EBU", value: ebuCount },
    { name: "Non-EBU", value: nonEbuCount },
  ];

  // Distance for royal vs normal
  const royalDistance = movements
    .filter((m) => m.Is_Royal)
    .reduce((sum, m) => sum + (m.Distance_KM || 0), 0);
  const normalDistance = movements
    .filter((m) => !m.Is_Royal)
    .reduce((sum, m) => sum + (m.Distance_KM || 0), 0);

  const distanceData = [
    {
      type: "Royal",
      distance: Math.round((royalDistance / royalCount) * 100) / 100 || 0,
    },
    {
      type: "Non-Royal",
      distance: Math.round((normalDistance / nonRoyalCount) * 100) / 100 || 0,
    },
  ];

  return (
    <div className="h-[calc(100vh-200px)] overflow-hidden flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Royal vs Non-Royal */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            Royal Classification
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={vipData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {vipData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "#8b5cf6" : "#cbd5e1"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* EBU vs Non-EBU */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            EBU Classification
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ebuData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {ebuData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "#fbbf24" : "#cbd5e1"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
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

      {/* Statistics summary */}
      <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Royal Movements
          </div>
          <div className="text-2xl font-bold text-purple-600">{royalCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((royalCount / movements.length) * 100).toFixed(1)}% of total
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            EBU Movements
          </div>
          <div className="text-2xl font-bold text-yellow-600">{ebuCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            {((ebuCount / movements.length) * 100).toFixed(1)}% of total
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Avg Royal Distance
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {distanceData[0].distance.toFixed(0)} KM
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Avg Normal Distance
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {distanceData[1].distance.toFixed(0)} KM
          </div>
        </div>
      </div>
    </div>
  );
}
