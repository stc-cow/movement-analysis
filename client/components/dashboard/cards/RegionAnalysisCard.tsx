import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { CowMovementsFact, DimLocation, RegionMetrics } from "@shared/models";

interface RegionAnalysisCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
  regionMetrics: RegionMetrics[];
}

export function RegionAnalysisCard({
  movements,
  locations,
  regionMetrics,
}: RegionAnalysisCardProps) {
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));
  
  // Region-to-Region transitions (heatmap style)
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
    .slice(0, 15)
    .map(([route, count]) => ({
      route,
      count,
    }));

  // Regional metrics sorted
  const sortedRegionMetrics = [...regionMetrics].sort(
    (a, b) => b.Total_COWs_Deployed - a.Total_COWs_Deployed
  );

  return (
    <div className="h-[calc(100vh-200px)] overflow-hidden flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Region heatmap */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            Top Region Transitions
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={heatmapData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis dataKey="route" type="category" width={190} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Regional deployment metrics */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            COWs by Region
          </h3>
          <div className="overflow-y-auto flex-1">
            <div className="space-y-3 pr-2">
              {sortedRegionMetrics.map((region) => (
                <div key={region.Region} className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {region.Region}
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {region.Total_COWs_Deployed}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Active: {region.Active_COWs}</span>
                      <span>Static: {region.Static_COWs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance: {region.Total_Distance_KM.toLocaleString()} KM</span>
                      <span>Avg: {region.Avg_Deployment_Duration_Days.toFixed(1)}d</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Regional summary table */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Cross-Region Movement Summary
        </h3>
        <div className="grid grid-cols-5 gap-4 text-center text-sm">
          {sortedRegionMetrics.map((region) => (
            <div key={region.Region} className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {region.Region}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {region.Cross_Region_Movements}
              </div>
              <div className="text-xs text-gray-500">cross-region</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
