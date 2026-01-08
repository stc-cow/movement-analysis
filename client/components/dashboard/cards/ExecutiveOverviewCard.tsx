import { BarChart3, Zap, Route, TrendingUp, Lock, Activity, Users, MapPin } from "lucide-react";
import { DimCow, DimLocation, CowMovementsFact, COWMetrics } from "@shared/models";

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
  const warehouses = locations.filter((l) => l.Location_Type === "Warehouse");
  const sites = locations.filter((l) => l.Location_Type === "Site");
  
  const movementsByType = {
    full: movements.filter((m) => m.Movement_Type === "Full").length,
    half: movements.filter((m) => m.Movement_Type === "Half").length,
    zero: movements.filter((m) => m.Movement_Type === "Zero").length,
  };

  const metrics = [
    {
      label: "Total COWs",
      value: kpis.totalCOWs,
      icon: BarChart3,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Total Movements",
      value: kpis.totalMovements,
      icon: Route,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      label: "Total Distance (KM)",
      value: kpis.totalDistanceKM.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      label: "Active COWs",
      value: kpis.activeCOWs,
      icon: Activity,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      label: "Static COWs",
      value: kpis.staticCOWs,
      icon: Lock,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      label: "Avg Moves/COW",
      value: kpis.avgMovesPerCOW.toFixed(1),
      icon: Zap,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
    },
  ];

  const summaryStats = [
    { label: "Active Warehouses", value: warehouses.length, icon: <MapPin className="w-4 h-4" /> },
    { label: "Deployment Sites", value: sites.length, icon: <MapPin className="w-4 h-4" /> },
    { label: "Movement Types", value: "Full / Half / Zero", icon: <Route className="w-4 h-4" /> },
    { label: "Avg Fleet Utilization", value: `${((kpis.activeCOWs / kpis.totalCOWs) * 100).toFixed(1)}%`, icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="h-[calc(100vh-200px)] overflow-hidden flex flex-col">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 flex-shrink-0">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={`${metric.bgColor} rounded-lg p-3 border border-gray-200 dark:border-gray-800`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {metric.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {metric.value}
                  </p>
                </div>
                <div className={`bg-gradient-to-br ${metric.color} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 flex-shrink-0">
        {summaryStats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="text-blue-500">{stat.icon}</div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Movement Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Movement Classification</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Full Moves (Site→Site)</span>
              <span className="font-bold text-gray-900 dark:text-white">{movementsByType.full}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(movementsByType.full / kpis.totalMovements) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Half Moves (WH↔Site)</span>
              <span className="font-bold text-gray-900 dark:text-white">{movementsByType.half}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${(movementsByType.half / kpis.totalMovements) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Zero Moves (WH→WH)</span>
              <span className="font-bold text-gray-900 dark:text-white">{movementsByType.zero}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-500 h-2 rounded-full"
                style={{ width: `${(movementsByType.zero / kpis.totalMovements) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Asset Status</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Utilization</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {((kpis.activeCOWs / kpis.totalCOWs) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(kpis.activeCOWs / kpis.totalCOWs) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Static Assets</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {((kpis.staticCOWs / kpis.totalCOWs) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${(kpis.staticCOWs / kpis.totalCOWs) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Coverage Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Regions Served</span>
              <span className="font-bold text-gray-900 dark:text-white">5/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Avg Distance per Move</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {(kpis.totalDistanceKM / kpis.totalMovements).toFixed(0)} KM
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Data Span</span>
              <span className="font-bold text-gray-900 dark:text-white">5 years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Update</span>
              <span className="font-bold text-gray-900 dark:text-white">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="flex-1 flex items-end">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          All metrics calculated from immutable fact table spanning 5 years of operational data
        </p>
      </div>
    </div>
  );
}
