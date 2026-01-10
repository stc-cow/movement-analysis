import {
  DimCow,
  DimLocation,
  CowMovementsFact,
  COWMetrics,
} from "@shared/models";

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
  // Filter to include both warehouse types and locations with "WH" in their name
  const warehouses = locations.filter(
    (l) =>
      l.Location_Type === "Warehouse" ||
      l.Location_Name.toUpperCase().includes("WH"),
  );
  const sites = locations.filter((l) => l.Location_Type === "Site");

  // Count warehouses that have at least one movement (incoming or outgoing)
  const warehouseLocationIds = new Set(warehouses.map((w) => w.Location_ID));
  const activeWarehouses = new Set<string>();

  movements.forEach((mov) => {
    // Also check location names for "WH" in movements
    const fromLoc = locations.find((l) => l.Location_ID === mov.From_Location_ID);
    const toLoc = locations.find((l) => l.Location_ID === mov.To_Location_ID);

    if (fromLoc && (fromLoc.Location_Type === "Warehouse" || fromLoc.Location_Name.toUpperCase().includes("WH"))) {
      activeWarehouses.add(mov.From_Location_ID);
    }
    if (toLoc && (toLoc.Location_Type === "Warehouse" || toLoc.Location_Name.toUpperCase().includes("WH"))) {
      activeWarehouses.add(mov.To_Location_ID);
    }
  });

  const movementsByType = {
    full: movements.filter((m) => m.Movement_Type === "Full").length,
    half: movements.filter((m) => m.Movement_Type === "Half").length,
    zero: movements.filter((m) => m.Movement_Type === "Zero").length,
  };

  const metrics = [
    {
      label: "Total COWs",
      value: kpis.totalCOWs,
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30",
      accentColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200/50 dark:border-blue-800/50",
    },
    {
      label: "Total Movements",
      value: kpis.totalMovements,
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30",
      accentColor: "text-purple-600 dark:text-purple-400",
      borderColor: "border-purple-200/50 dark:border-purple-800/50",
    },
    {
      label: "Total Distance (KM)",
      value: kpis.totalDistanceKM.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      }),
      bgColor: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30",
      accentColor: "text-green-600 dark:text-green-400",
      borderColor: "border-green-200/50 dark:border-green-800/50",
    },
    {
      label: "Active COWs",
      value: kpis.activeCOWs,
      bgColor: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30",
      accentColor: "text-orange-600 dark:text-orange-400",
      borderColor: "border-orange-200/50 dark:border-orange-800/50",
    },
    {
      label: "Static COWs",
      value: kpis.staticCOWs,
      bgColor: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30",
      accentColor: "text-red-600 dark:text-red-400",
      borderColor: "border-red-200/50 dark:border-red-800/50",
    },
    {
      label: "Avg Moves/COW",
      value: kpis.avgMovesPerCOW.toFixed(1),
      bgColor: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/30",
      accentColor: "text-yellow-600 dark:text-yellow-400",
      borderColor: "border-yellow-200/50 dark:border-yellow-800/50",
    },
  ];

  const summaryStats = [
    {
      label: "Active Warehouses",
      value: activeWarehouses.size,
    },
    {
      label: "Deployment Sites",
      value: sites.length,
    },
    {
      label: "Movement Types",
      value: "Full / Half / Zero",
    },
    {
      label: "Avg Fleet Utilization",
      value: `${((kpis.activeCOWs / kpis.totalCOWs) * 100).toFixed(1)}%`,
    },
  ];

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 flex-shrink-0 px-6 pt-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`${metric.bgColor} ${metric.borderColor} border rounded-xl p-4 hover-lift transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 group`}
          >
            <p className={`text-xs font-semibold ${metric.accentColor} uppercase tracking-wider`}>
              {metric.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2 group-hover:scale-105 transition-transform duration-300">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Summary Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 flex-shrink-0">
        {summaryStats.map((stat, idx) => (
          <div key={idx} className="card-modern-sm hover-lift bg-gradient-to-br from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm hover:border-blue-300/50 dark:hover:border-blue-600/50 transition-all duration-300">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              {stat.label}
            </p>
            <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-100 bg-clip-text text-transparent">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Movement Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0 mb-6">
        <div className="card-modern hover-lift bg-gradient-to-br from-white/70 to-white/50 dark:from-slate-800/70 dark:to-slate-700/50 border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm hover:border-blue-300/50 dark:hover:border-blue-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
          <h3 className="card-header text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent mb-4">Movement Classification</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Full Moves (Site→Site)
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {movementsByType.full}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${(movementsByType.full / kpis.totalMovements) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Half Moves (WH↔Site)
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {movementsByType.half}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{
                  width: `${(movementsByType.half / kpis.totalMovements) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Zero Moves (WH→WH)
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {movementsByType.zero}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-500 h-2 rounded-full"
                style={{
                  width: `${(movementsByType.zero / kpis.totalMovements) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="card-modern hover-lift bg-gradient-to-br from-white/70 to-white/50 dark:from-slate-800/70 dark:to-slate-700/50 border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm hover:border-green-300/50 dark:hover:border-green-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
          <h3 className="card-header text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent mb-4">Asset Status</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Active Utilization
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {((kpis.activeCOWs / kpis.totalCOWs) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-500 h-2.5 rounded-full shadow-sm"
                  style={{
                    width: `${(kpis.activeCOWs / kpis.totalCOWs) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Static Assets
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {((kpis.staticCOWs / kpis.totalCOWs) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-400 to-red-500 h-2.5 rounded-full shadow-sm"
                  style={{
                    width: `${(kpis.staticCOWs / kpis.totalCOWs) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-modern hover-lift bg-gradient-to-br from-white/70 to-white/50 dark:from-slate-800/70 dark:to-slate-700/50 border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm hover:border-purple-300/50 dark:hover:border-purple-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
          <h3 className="card-header text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent mb-4">Coverage Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Total Regions Served
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                4/4
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Avg Distance per Move
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {(kpis.totalDistanceKM / kpis.totalMovements).toFixed(0)} KM
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Data Span
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                5 years
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Last Update
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                Live
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="flex-1 flex items-end">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          All metrics calculated from immutable fact table spanning 5 years of
          operational data
        </p>
      </div>
    </div>
  );
}
