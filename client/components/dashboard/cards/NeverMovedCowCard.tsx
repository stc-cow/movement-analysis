import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { NeverMovedCow } from "@shared/models";
import { NeverMovedCowMap } from "./NeverMovedCowMap";

interface NeverMovedCowCardProps {
  neverMovedCows: NeverMovedCow[];
}

export function NeverMovedCowCard({ neverMovedCows }: NeverMovedCowCardProps) {
  const [selectedStatus, setSelectedStatus] = useState<
    "ALL" | "ON-AIR" | "OFF-AIR"
  >("ALL");
  const [selectedCow, setSelectedCow] = useState<NeverMovedCow | null>(null);

  const stats = useMemo(() => {
    const onAir = neverMovedCows.filter((c) => c.Status === "ON-AIR");
    const offAir = neverMovedCows.filter((c) => c.Status === "OFF-AIR");
    const avgDaysOnAir =
      onAir.length > 0
        ? Math.round(
            onAir.reduce((sum, c) => sum + (c.Days_On_Air || 0), 0) /
              onAir.length,
          )
        : 0;

    return {
      total: neverMovedCows.length,
      onAir: onAir.length,
      offAir: offAir.length,
      avgDaysOnAir,
      onAirPercentage:
        neverMovedCows.length > 0
          ? Math.round((onAir.length / neverMovedCows.length) * 100)
          : 0,
    };
  }, [neverMovedCows]);

  const filteredCows = useMemo(() => {
    if (selectedStatus === "ALL") return neverMovedCows;
    return neverMovedCows.filter((c) => c.Status === selectedStatus);
  }, [neverMovedCows, selectedStatus]);

  const recentlyDeployed = useMemo(() => {
    const seenIds = new Set<string>();
    return [...neverMovedCows]
      .sort((a, b) => {
        const dateA = new Date(a.Last_Deploy_Date).getTime();
        const dateB = new Date(b.Last_Deploy_Date).getTime();
        return dateB - dateA;
      })
      .filter((cow) => {
        if (seenIds.has(cow.COW_ID)) {
          return false;
        }
        seenIds.add(cow.COW_ID);
        return true;
      })
      .slice(0, 5);
  }, [neverMovedCows]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Left Panel: Analysis */}
      <div className="flex flex-col gap-4 overflow-y-auto">
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle>Never Moved COWs Overview</CardTitle>
            <CardDescription>
              Static COWs that never moved from deployment location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* KPI Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Total COWs</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">ON-AIR %</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.onAirPercentage}%
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  ON-AIR Count
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.onAir}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  OFF-AIR Count
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.offAir}
                </p>
              </div>
            </div>

            {/* Average Days On Air */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700">
                Avg Days On-Air (Active COWs)
              </p>
              <p className="text-4xl font-bold text-blue-600 mt-2">
                {stats.avgDaysOnAir}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                days since last deployment
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Filter Tabs */}
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-lg">COWs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={selectedStatus}
              onValueChange={(val) =>
                setSelectedStatus(val as "ALL" | "ON-AIR" | "OFF-AIR")
              }
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ALL">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="ON-AIR" className="text-green-600">
                  ON-AIR ({stats.onAir})
                </TabsTrigger>
                <TabsTrigger value="OFF-AIR" className="text-red-600">
                  OFF-AIR ({stats.offAir})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ALL" className="mt-4">
                <div className="text-sm text-gray-600">
                  Showing {filteredCows.length} COWs
                </div>
              </TabsContent>
              <TabsContent value="ON-AIR" className="mt-4">
                <div className="text-sm text-green-600 font-medium">
                  {stats.onAir} COWs currently ON-AIR
                </div>
              </TabsContent>
              <TabsContent value="OFF-AIR" className="mt-4">
                <div className="text-sm text-red-600 font-medium">
                  {stats.offAir} COWs currently OFF-AIR
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recently Deployed */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Recently Deployed COWs</CardTitle>
            <CardDescription>Last 5 deployments by date</CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-64">
            <div className="space-y-3">
              {recentlyDeployed.length > 0 ? (
                recentlyDeployed.map((cow) => (
                  <div
                    key={cow.COW_ID}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">
                          {cow.COW_ID}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {cow.Location}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cow.Region}, {cow.District}, {cow.City}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <Badge
                          variant={
                            cow.Status === "ON-AIR" ? "default" : "secondary"
                          }
                          className={
                            cow.Status === "ON-AIR"
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }
                        >
                          {cow.Status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-2">
                          {cow.Days_On_Air} days
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No recently deployed COWs
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Map */}
      <div className="flex flex-col rounded-lg overflow-hidden border bg-white">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Location Map</h3>
          <p className="text-xs text-gray-600 mt-1">
            Click on a COW marker to view full details ({filteredCows.length} COWs)
          </p>
        </div>
        <NeverMovedCowMap cows={filteredCows} onCowSelected={setSelectedCow} />
      </div>

      {/* Full Details Modal - Rendered as Portal to appear above map */}
      {selectedCow &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 2147483647 }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 p-6 flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">{selectedCow.COW_ID}</h2>
                <button
                  onClick={() => setSelectedCow(null)}
                  className="text-white hover:bg-blue-700 rounded-lg p-2 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* Status Badge */}
                <div>
                  <Badge
                    className={
                      selectedCow.Status === "ON-AIR"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }
                  >
                    {selectedCow.Status}
                  </Badge>
                </div>

                {/* Main Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Location
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.Location}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Region
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.Region}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        District
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.District}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        City
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.City}
                      </p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Vendor
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.Vendor}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        1st Deploy Date
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {new Date(selectedCow.First_Deploy_Date).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Last Deploy Date
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {new Date(selectedCow.Last_Deploy_Date).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Days On-Air
                      </label>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {selectedCow.Days_On_Air} days
                      </p>
                    </div>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block mb-2">
                    GPS Coordinates
                  </label>
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {selectedCow.Latitude.toFixed(4)}, {selectedCow.Longitude.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedCow(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
