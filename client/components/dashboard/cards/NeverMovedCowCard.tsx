import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NeverMovedCow } from "@shared/models";
import { NeverMovedCowMap } from "./NeverMovedCowMap";

interface NeverMovedCowCardProps {
  neverMovedCows: NeverMovedCow[];
}

export function NeverMovedCowCard({ neverMovedCows }: NeverMovedCowCardProps) {
  const [selectedStatus, setSelectedStatus] = useState<
    "ALL" | "ON-AIR" | "OFF-AIR"
  >("ALL");

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
            Click on a COW to view its details ({filteredCows.length} COWs)
          </p>
        </div>
        <NeverMovedCowMap cows={filteredCows} />
      </div>

      {/* Details Panel - Shows selected COW info from map click */}
      {selectedStatus === "ALL" && filteredCows.length > 0 && (
        <div className="rounded-lg overflow-hidden border bg-white">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">COW Details Table</h3>
            <p className="text-xs text-gray-600 mt-1">
              All {filteredCows.length} COWs information
            </p>
          </div>
          <div className="overflow-auto max-h-96">
            <Table className="text-sm">
              <TableHeader className="sticky top-0 bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">COW ID</TableHead>
                  <TableHead className="font-semibold">1st Deploy</TableHead>
                  <TableHead className="font-semibold">Last Deploy</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">Region</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCows.map((cow) => (
                  <TableRow key={cow.COW_ID} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-blue-600">
                      {cow.COW_ID}
                    </TableCell>
                    <TableCell className="text-xs">
                      {cow.First_Deploy_Date
                        ? new Date(cow.First_Deploy_Date).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {cow.Last_Deploy_Date
                        ? new Date(cow.Last_Deploy_Date).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-xs">{cow.Vendor || "N/A"}</TableCell>
                    <TableCell className="text-xs">{cow.Region}</TableCell>
                    <TableCell className="text-xs truncate max-w-xs">
                      {cow.Location}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          cow.Status === "ON-AIR"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-red-600 hover:bg-red-700"
                        }
                      >
                        {cow.Status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
