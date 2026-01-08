import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { CowMovementsFact, DimCow, DimLocation } from "@shared/models";

interface DistanceCostProxyCardProps {
  movements: CowMovementsFact[];
  cows: DimCow[];
  locations: DimLocation[];
}

export function DistanceCostProxyCard({
  movements,
  cows,
  locations,
}: DistanceCostProxyCardProps) {
  // Distance by year
  const yearlyDistance: Record<number, number> = {};
  movements.forEach((mov) => {
    const year = new Date(mov.Moved_DateTime).getFullYear();
    yearlyDistance[year] = (yearlyDistance[year] || 0) + (mov.Distance_KM || 0);
  });

  const yearData = Object.entries(yearlyDistance)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([year, distance]) => ({
      year: parseInt(year),
      distance: Math.round(distance),
    }));

  // Distance by region
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));
  const regionDistance: Record<string, number> = {};
  const REGIONS = ["WEST", "EAST", "CENTRAL", "SOUTH", "NORTH"];
  REGIONS.forEach((r) => (regionDistance[r] = 0));

  movements.forEach((mov) => {
    const toLoc = locMap.get(mov.To_Location_ID);
    if (toLoc) {
      regionDistance[toLoc.Region] = (regionDistance[toLoc.Region] || 0) + (mov.Distance_KM || 0);
    }
  });

  const regionData = Object.entries(regionDistance).map(([region, distance]) => ({
    region,
    distance: Math.round(distance),
  }));

  // Distance by vendor
  const vendorDistance: Record<string, number> = {};
  cows.forEach((cow) => {
    const cowMoves = movements.filter((m) => m.COW_ID === cow.COW_ID);
    const distance = cowMoves.reduce((sum, m) => sum + (m.Distance_KM || 0), 0);
    vendorDistance[cow.Vendor] = (vendorDistance[cow.Vendor] || 0) + distance;
  });

  const vendorData = Object.entries(vendorDistance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([vendor, distance]) => ({
      vendor,
      distance: Math.round(distance),
    }));

  const totalDistance = movements.reduce((sum, m) => sum + (m.Distance_KM || 0), 0);

  return (
    <div className="h-[calc(100vh-200px)] overflow-hidden flex flex-col gap-4 p-4">
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Distance
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {(totalDistance / 1000).toFixed(1)}K KM
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Avg per Movement
          </div>
          <div className="text-2xl font-bold text-green-600">
            {(totalDistance / movements.length).toFixed(0)} KM
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Cost Proxy (Est.)
          </div>
          <div className="text-2xl font-bold text-orange-600">
            ${(totalDistance * 0.15).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Yearly trend */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            Distance by Year
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" />
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
                dataKey="distance"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distance by region */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">
            Distance by Region
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={regionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="distance" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distance by vendor */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Top Vendors by Distance
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={vendorData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="vendor" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="distance" fill="#a855f7" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
