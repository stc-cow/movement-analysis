import { useState } from "react";
import {
  DimCow,
  DimLocation,
  CowMovementsFact,
  COWMetrics,
} from "@shared/models";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [showStaticCowsModal, setShowStaticCowsModal] = useState(false);

  // Get static COWs data
  const staticCowsData = cowMetrics
    .filter((m) => m.Is_Static)
    .map((metric) => {
      const regionServed = metric.Regions_Served.length > 0 ? metric.Regions_Served.join(", ") : "N/A";
      const cowMovements = movements.filter((m) => m.COW_ID === metric.COW_ID);
      const isRoyal = cowMovements.some((m) => m.Is_Royal);
      const isEBU = cowMovements.some((m) => m.Is_EBU);

      let ebRoyalStatus = "No";
      if (isRoyal && isEBU) {
        ebRoyalStatus = "Royal & EBU";
      } else if (isRoyal) {
        ebRoyalStatus = "Royal";
      } else if (isEBU) {
        ebRoyalStatus = "EBU";
      }

      return {
        cow_id: metric.COW_ID,
        region: regionServed,
        eb_royal: ebRoyalStatus,
      };
    });
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
    const fromLoc = locations.find(
      (l) => l.Location_ID === mov.From_Location_ID,
    );
    const toLoc = locations.find((l) => l.Location_ID === mov.To_Location_ID);

    if (
      fromLoc &&
      (fromLoc.Location_Type === "Warehouse" ||
        fromLoc.Location_Name.toUpperCase().includes("WH"))
    ) {
      activeWarehouses.add(mov.From_Location_ID);
    }
    if (
      toLoc &&
      (toLoc.Location_Type === "Warehouse" ||
        toLoc.Location_Name.toUpperCase().includes("WH"))
    ) {
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
      bgColor: "bg-white dark:bg-white",
      accentColor: "text-purple-600",
      borderColor: "border-purple-600",
    },
    {
      label: "Total Movements",
      value: kpis.totalMovements,
      bgColor: "bg-white dark:bg-white",
      accentColor: "text-purple-600",
      borderColor: "border-purple-600",
    },
    {
      label: "Total Distance (KM)",
      value: kpis.totalDistanceKM.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      }),
      bgColor: "bg-white dark:bg-white",
      accentColor: "text-purple-600",
      borderColor: "border-purple-600",
    },
    {
      label: "Active COWs",
      value: kpis.activeCOWs,
      bgColor: "bg-white dark:bg-white",
      accentColor: "text-purple-600",
      borderColor: "border-purple-600",
    },
    {
      label: "Static COWs",
      value: kpis.staticCOWs,
      bgColor: "bg-white dark:bg-white",
      accentColor: "text-purple-600",
      borderColor: "border-purple-600",
    },
    {
      label: "Avg Moves/COW",
      value: kpis.avgMovesPerCOW.toFixed(1),
      bgColor: "bg-white dark:bg-white",
      accentColor: "text-purple-600",
      borderColor: "border-purple-600",
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
      label: "Avg COW Utilization",
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
            onClick={() =>
              metric.label === "Static COWs" && setShowStaticCowsModal(true)
            }
            className={`${metric.bgColor} ${metric.borderColor} border-2 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl group shadow-lg flex flex-col items-center justify-center text-center ${
              metric.label === "Static COWs" ? "cursor-pointer" : ""
            }`}
            style={{
              boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.05)"
            }}
          >
            <p
              className={`text-xs font-bold ${metric.accentColor} uppercase tracking-wider`}
            >
              {metric.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2 group-hover:scale-105 transition-transform duration-300">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Summary Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 flex-shrink-0 px-6">
        {summaryStats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 border-2 border-purple-600 transition-all duration-300 hover:shadow-xl shadow-lg flex flex-col items-center justify-center text-center"
            style={{
              boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.05)"
            }}
          >
            <p className="text-sm font-bold text-purple-600 mb-2">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Movement Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-shrink-0 mb-6 px-6">
        <div className="bg-white rounded-2xl p-6 border-2 border-purple-600 transition-all duration-300 hover:shadow-xl shadow-lg flex flex-col items-center justify-center" style={{
              boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.05)"
            }}>
          <h3 className="text-lg font-bold text-purple-600 mb-4 text-center">
            Movement Classification
          </h3>
          <div className="space-y-2 w-full">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Full Moves (Site→Site)
              </span>
              <span className="font-bold text-gray-900">
                {movementsByType.full}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${(movementsByType.full / kpis.totalMovements) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">
                Half Moves (WH↔Site)
              </span>
              <span className="font-bold text-gray-900">
                {movementsByType.half}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{
                  width: `${(movementsByType.half / kpis.totalMovements) * 100}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">
                Zero Moves (WH→WH)
              </span>
              <span className="font-bold text-gray-900">
                {movementsByType.zero}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-500 h-2 rounded-full"
                style={{
                  width: `${(movementsByType.zero / kpis.totalMovements) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border-2 border-purple-600 transition-all duration-300 hover:shadow-xl shadow-lg flex flex-col items-center justify-center" style={{
              boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.05)"
            }}>
          <h3 className="text-lg font-bold text-purple-600 mb-4 text-center">
            Asset Status
          </h3>
          <div className="space-y-3 w-full">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 font-medium">
                  Active Utilization
                </span>
                <span className="font-bold text-gray-900">
                  {((kpis.activeCOWs / kpis.totalCOWs) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
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
                <span className="text-sm text-gray-600 font-medium">
                  Static Assets
                </span>
                <span className="font-bold text-gray-900">
                  {((kpis.staticCOWs / kpis.totalCOWs) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
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

        <div className="bg-white rounded-2xl p-6 border-2 border-purple-600 transition-all duration-300 hover:shadow-xl shadow-lg flex flex-col items-center justify-center" style={{
              boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.05)"
            }}>
          <h3 className="text-lg font-bold text-purple-600 mb-4 text-center">
            Coverage Summary
          </h3>
          <div className="space-y-2 text-sm w-full">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Total Regions Served
              </span>
              <span className="font-bold text-gray-900">
                4/4
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Avg Distance per Move
              </span>
              <span className="font-bold text-gray-900">
                {(kpis.totalDistanceKM / kpis.totalMovements).toFixed(0)} KM
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Data Span
              </span>
              <span className="font-bold text-gray-900">
                5 years
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Static COWs Modal */}
      {showStaticCowsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 p-6 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">
                Static COWs Details
              </h2>
              <button
                onClick={() => setShowStaticCowsModal(false)}
                className="text-white hover:bg-red-700 rounded-lg p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-x-auto overflow-y-auto p-6 flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">COW ID</TableHead>
                    <TableHead className="text-left">
                      Region
                    </TableHead>
                    <TableHead className="text-left">
                      EBU/Royal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staticCowsData.length > 0 ? (
                    staticCowsData.map((row) => (
                      <TableRow key={row.cow_id}>
                        <TableCell className="font-medium">
                          {row.cow_id}
                        </TableCell>
                        <TableCell>{row.region}</TableCell>
                        <TableCell>{row.eb_royal}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-gray-500"
                      >
                        No static COWs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 flex justify-end gap-3">
              <button
                onClick={() => setShowStaticCowsModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="flex-1 flex items-end px-6 pb-6">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Powered by ACES MSD
        </p>
      </div>
    </div>
  );
}
