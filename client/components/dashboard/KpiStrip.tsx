interface KpiStripProps {
  totalCOWs: number;
  totalMovements: number;
  totalDistanceKM: number;
  activeCOWs: number;
  staticCOWs: number;
  avgMovesPerCOW: number;
}

export function KpiStrip({
  totalCOWs,
  totalMovements,
  totalDistanceKM,
  activeCOWs,
  staticCOWs,
  avgMovesPerCOW,
}: KpiStripProps) {
  const kpis = [
    {
      label: "Total COWs",
      value: totalCOWs,
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Total Movements",
      value: totalMovements,
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      label: "Total Distance (KM)",
      value: totalDistanceKM.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      }),
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      label: "High Moved COWs",
      value: activeCOWs,
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      label: "One Time Moved COWs",
      value: staticCOWs,
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      label: "Avg Moves/COW",
      value: avgMovesPerCOW.toFixed(1),
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`${kpi.bgColor} rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow`}
        >
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {kpi.label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
}
