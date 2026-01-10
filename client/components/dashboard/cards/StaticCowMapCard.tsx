import { useMemo, useState, useEffect, useRef } from "react";
import { CowMovementsFact, DimCow, DimLocation } from "@shared/models";
import Highcharts, { ensureHighchartsModules } from "@/lib/highcharts";
import HighchartsReact from "highcharts-react-official";

interface StaticCowMapCardProps {
  movements: CowMovementsFact[];
  cows: DimCow[];
  locations: DimLocation[];
}

interface CowPosition {
  cowId: string;
  latitude: number;
  longitude: number;
  movementCount: number;
  isOnAir: boolean;
  currentLocation: string;
  remarks: string;
}

// Helper function to check if coordinates are within Saudi Arabia
function isWithinSaudiBounds(lat: number, lon: number): boolean {
  // Saudi Arabia bounds: South 16.4°, North 32.15°, West 34.4°, East 55.67°
  return lat >= 16.4 && lat <= 32.15 && lon >= 34.4 && lon <= 55.67;
}

// Cache for geo data to prevent re-fetching
let geoDataCache: any = null;
let geoDataPromise: Promise<any> | null = null;

export function StaticCowMapCard({
  movements,
  cows,
  locations,
}: StaticCowMapCardProps) {
  const [saudiGeo, setSaudiGeo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modulesReady, setModulesReady] = useState(false);
  const chartRef = useRef<any>(null);

  // Ensure Highcharts modules are initialized
  useEffect(() => {
    ensureHighchartsModules().then(() => {
      setModulesReady(true);
    });
  }, []);

  // Load Saudi geo data from Highcharts CDN with caching
  useEffect(() => {
    if (!modulesReady) return;

    const loadGeoData = async () => {
      try {
        if (geoDataCache) {
          setSaudiGeo(geoDataCache);
          setLoading(false);
          return;
        }

        if (geoDataPromise) {
          const data = await geoDataPromise;
          setSaudiGeo(data);
          setLoading(false);
          return;
        }

        geoDataPromise = fetch(
          "https://code.highcharts.com/mapdata/countries/sa/sa-all.geo.json",
        ).then(async (response) => {
          if (!response.ok) throw new Error("Failed to fetch geo data");
          const data = await response.json();
          geoDataCache = data;
          return data;
        });

        const data = await geoDataPromise;
        setSaudiGeo(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load Saudi geo data:", error);
        setLoading(false);
      }
    };

    loadGeoData();
  }, [modulesReady]);

  // Create location map for quick lookup
  const locMap = useMemo(
    () => new Map(locations.map((l) => [l.Location_ID, l])),
    [locations],
  );

  // Create COW map for quick lookup
  const cowMap = useMemo(
    () => new Map(cows.map((c) => [c.COW_ID, c])),
    [cows],
  );

  // Calculate COW positions and movement counts
  const cowPositions = useMemo(() => {
    const cowMovementMap = new Map<
      string,
      { movements: CowMovementsFact[]; cow: DimCow | undefined }
    >();

    // Group movements by COW_ID
    movements.forEach((mov) => {
      if (!cowMovementMap.has(mov.COW_ID)) {
        cowMovementMap.set(mov.COW_ID, {
          movements: [],
          cow: cowMap.get(mov.COW_ID),
        });
      }
      cowMovementMap.get(mov.COW_ID)!.movements.push(mov);
    });

    // Build COW positions
    const positions: CowPosition[] = [];

    cowMovementMap.forEach((data, cowId) => {
      const { movements: cowMovements, cow } = data;
      const cowData = cowMap.get(cowId);

      // Sort by datetime to get the last movement
      const sortedMovements = [...cowMovements].sort(
        (a, b) =>
          new Date(b.Moved_DateTime).getTime() -
          new Date(a.Moved_DateTime).getTime(),
      );

      const lastMovement = sortedMovements[0];
      if (!lastMovement) return;

      // Get destination location from last movement
      const destLoc = locMap.get(lastMovement.To_Location_ID);
      if (!destLoc) return;

      // Validate coordinates are proper numbers
      if (
        typeof destLoc.Latitude !== "number" ||
        typeof destLoc.Longitude !== "number" ||
        !isFinite(destLoc.Latitude) ||
        !isFinite(destLoc.Longitude)
      ) {
        return;
      }

      // Check if on-air from remarks field
      const remarks = cowData?.Remarks || "";
      const isOnAir = remarks.toLowerCase().includes("on-air") ||
        remarks.toLowerCase().includes("on air") ||
        remarks.toLowerCase().includes("onair");

      positions.push({
        cowId,
        latitude: destLoc.Latitude,
        longitude: destLoc.Longitude,
        movementCount: cowMovements.length,
        isOnAir,
        currentLocation: destLoc.Location_Name,
        remarks,
      });
    });

    // Filter to valid coordinates within Saudi Arabia
    return positions.filter((p) => isWithinSaudiBounds(p.latitude, p.longitude));
  }, [movements, cowMap, locMap]);

  // Separate COWs by status
  const { onAirCows, inactiveCows } = useMemo(() => {
    return {
      onAirCows: cowPositions.filter((p) => p.isOnAir),
      inactiveCows: cowPositions.filter((p) => !p.isOnAir),
    };
  }, [cowPositions]);

  // Highcharts options for static COW map
  const options: Highcharts.Options = useMemo(() => {
    if (!saudiGeo) return {};

    // Convert ON-AIR points to Highcharts format
    const onAirPoints = onAirCows.map((p) => ({
      lon: p.longitude,
      lat: p.latitude,
      value: p.movementCount,
      name: p.cowId,
      location: p.currentLocation,
      status: "On-Air",
    }));

    // Convert INACTIVE points to Highcharts format
    const inactivePoints = inactiveCows.map((p) => ({
      lon: p.longitude,
      lat: p.latitude,
      value: p.movementCount,
      name: p.cowId,
      location: p.currentLocation,
      status: "Inactive",
    }));

    console.log("ON-AIR COWs:", onAirPoints.length);
    console.log("INACTIVE COWs:", inactivePoints.length);

    return {
      chart: {
        map: saudiGeo,
        backgroundColor: "transparent",
        borderWidth: 0,
        spacingTop: 0,
        spacingBottom: 0,
        spacingLeft: 0,
        spacingRight: 0,
        animation: false,
      },
      title: {
        text: null,
      },
      subtitle: {
        text: null,
      },
      mapNavigation: {
        enabled: false,
      },
      legend: {
        enabled: true,
        layout: "vertical",
        align: "right",
        verticalAlign: "top",
        y: 70,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        borderRadius: 8,
      },
      plotOptions: {
        series: {
          animation: false,
        },
        map: {
          dataLabels: {
            enabled: false,
          },
          borderColor: "#e5e7eb",
          borderWidth: 1,
          nullColor: "#f0f0f0",
          states: {
            hover: {
              brightness: 0.1,
              borderColor: "#e5e7eb",
            },
          },
        },
        mappoint: {
          marker: {
            radius: 6,
            lineWidth: 2,
            lineColor: "#ffffff",
          },
          dataLabels: {
            enabled: false,
          },
          states: {
            hover: {
              marker: {
                radius: 8,
                lineWidth: 2,
              },
            },
          },
        },
      },
      series: [
        {
          type: "map",
          name: "Base Map",
          data: [],
          showInLegend: false,
          borderColor: "#e5e7eb",
          borderWidth: 1,
          nullColor: "#f0f0f0",
        } as any,
        {
          type: "mappoint",
          name: "ON-AIR COWs",
          color: "#22c55e",
          data: onAirPoints,
          showInLegend: true,
          tooltip: {
            headerFormat: "",
            pointFormatter: function () {
              const point = this as any;
              let tooltip = `<b>COW: ${point.name}</b><br/>`;
              tooltip += `Status: <strong style="color: #22c55e;">●</strong> ${point.status}<br/>`;
              tooltip += `Current Location: <strong>${point.location}</strong><br/>`;
              tooltip += `Movements: <strong>${point.value?.toLocaleString() || 0}</strong>`;
              return tooltip;
            },
          },
        } as any,
        {
          type: "mappoint",
          name: "Inactive COWs",
          color: "#ef4444",
          data: inactivePoints,
          showInLegend: true,
          tooltip: {
            headerFormat: "",
            pointFormatter: function () {
              const point = this as any;
              let tooltip = `<b>COW: ${point.name}</b><br/>`;
              tooltip += `Status: <strong style="color: #ef4444;">●</strong> ${point.status}<br/>`;
              tooltip += `Current Location: <strong>${point.location}</strong><br/>`;
              tooltip += `Movements: <strong>${point.value?.toLocaleString() || 0}</strong>`;
              return tooltip;
            },
          },
        } as any,
      ],
      exporting: {
        buttons: {
          contextButton: {
            menuItems: [
              "downloadPNG",
              "downloadJPEG",
              "downloadPDF",
              "downloadSVG",
              "separator",
              "viewFullscreen",
            ],
            symbolFill: "#6366f1",
          },
        },
        csv: {
          dateFormat: "%Y-%m-%d",
        },
      },
      credits: {
        enabled: false,
      },
    } as Highcharts.Options;
  }, [saudiGeo, onAirCows, inactiveCows]);

  if (loading || !saudiGeo || !modulesReady) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-slate-800 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {!modulesReady ? "Loading Highcharts..." : "Loading map..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-slate-800 p-6">
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Static COWs Map
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Current deployment locations with ON-AIR status and movement frequency
        </p>
      </div>

      <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-slate-700 shadow-lg relative">
        {cowPositions.length > 0 ? (
          <>
            <HighchartsReact
              highcharts={Highcharts}
              constructorType="mapChart"
              options={options}
              onLoad={(chart) => {
                chartRef.current = chart;
              }}
              containerProps={{
                style: { width: "100%", height: "100%" },
              }}
              immutable={false}
            />

            {/* Bottom Left: COW Count Summary */}
            <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                COW Summary
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    ON-AIR: {onAirCows.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Inactive: {inactiveCows.length}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Total: <strong>{cowPositions.length}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Right: Stats */}
            <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-3 shadow-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Movement Statistics
              </p>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  Avg. Movements:{" "}
                  <strong>
                    {(
                      cowPositions.reduce((sum, c) => sum + c.movementCount, 0) /
                      cowPositions.length
                    ).toFixed(1)}
                  </strong>
                </div>
                <div>
                  Max Movements:{" "}
                  <strong>
                    {Math.max(...cowPositions.map((c) => c.movementCount), 0)}
                  </strong>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-lg text-gray-400">
              No COW data available with valid coordinates
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
