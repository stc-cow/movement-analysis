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
    (a, b) => b.Total_COWs_Deployed - a.Total_COWs_Deployed,
  );

  // Color mapping for regions
  const regionColors: Record<string, string> = {
    WEST: "#FF375E", // Red (Base)
    EAST: "#1Bced8", // Teal (Base)
    CENTRAL: "#4F008C", // Purple (Base)
    SOUTH: "#FF6F8A", // Red (Light)
  };

  // Get gradient color for bars based on count
  const getBarColor = (index: number) => {
    const colors = [
      "#4F008C", // Purple (Base)
      "#7A3DB8", // Purple (Light)
      "#3A0066", // Purple (Dark)
      "#FF375E", // Red (Base)
      "#FF6F8A", // Red (Light)
    ];
    return colors[index % colors.length];
  };

  // Prepare cross-region data for chart
  const crossRegionChartData = sortedRegionMetrics.map((region) => ({
    region: region.Region,
    movements: region.Cross_Region_Movements,
  }));

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-5 p-6">
      {/* Two-Column Layout with Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-0">
        {/* Left Chart: Top Region Movement */}
        <div className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-700/40 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 overflow-hidden flex flex-col backdrop-blur-sm hover:border-blue-300/50 dark:hover:border-blue-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 min-h-0">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent mb-4 flex-shrink-0 uppercase tracking-wide px-4">
            🔄 Region Movement
          </h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={heatmapData}
                margin={{ top: 10, right: 20, bottom: 100, left: 50 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#d1d5db"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="route"
                  type="category"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }}
                  interval={0}
                />
                <YAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  label={{ value: "Count", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "2px solid #a855f7",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                    padding: "12px 16px",
                  }}
                  cursor={{ fill: "rgba(168, 85, 247, 0.15)" }}
                  formatter={(value) => [`${value} transitions`, "Count"]}
                />
                <Bar
                  dataKey="count"
                  fill="#a855f7"
                  radius={[8, 8, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Cross-Region Movements */}
        <div className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-700/40 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 overflow-hidden flex flex-col backdrop-blur-sm hover:border-orange-300/50 dark:hover:border-orange-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 min-h-0">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-400 dark:to-orange-300 bg-clip-text text-transparent mb-6 flex-shrink-0 uppercase tracking-wide">
            🌍 Cross-Region Movements
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={crossRegionChartData}
                margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#d1d5db"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="region"
                  type="category"
                  tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }}
                />
                <YAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  label={{
                    value: "Movements",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "2px solid #1Bced8",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                    padding: "12px 16px",
                  }}
                  cursor={{ fill: "rgba(27, 206, 216, 0.15)" }}
                  formatter={(value) => [`${value} movements`, "Count"]}
                />
                <Bar
                  dataKey="movements"
                  fill="#1Bced8"
                  radius={[8, 8, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
