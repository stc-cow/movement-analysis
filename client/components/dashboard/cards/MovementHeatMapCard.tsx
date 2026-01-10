import { useMemo, useState, useEffect, useRef } from "react";
import { CowMovementsFact, DimLocation } from "@shared/models";
import Highcharts, { ensureHighchartsModules } from "@/lib/highcharts";
import HighchartsReact from "highcharts-react-official";
import { regionToHcKey } from "@/lib/saudiRegionMapping";

interface MovementHeatMapCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

interface MovementFlow {
  fromLoc: DimLocation;
  toLoc: DimLocation;
  count: number;
  movementIds: string[];
}

// Helper function to check if coordinates are within Saudi Arabia
function isWithinSaudiBounds(lat: number, lon: number): boolean {
  // Saudi Arabia bounds: South 16.4°, North 32.15°, West 34.4°, East 55.67°
  return lat >= 16.4 && lat <= 32.15 && lon >= 34.4 && lon <= 55.67;
}

// Cache for geo data to prevent re-fetching
let geoDataCache: any = null;
let geoDataPromise: Promise<any> | null = null;

export function MovementHeatMapCard({
  movements,
  locations,
}: MovementHeatMapCardProps) {
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

  // Create location map from all locations
  const locMap = useMemo(
    () => new Map(locations.map((l) => [l.Location_ID, l])),
    [locations],
  );

  // Aggregate movements by from-to location pairs
  const flowData = useMemo(() => {
    const flowsMap = new Map<string, MovementFlow>();

    movements.forEach((mov) => {
      const fromLoc = locMap.get(mov.From_Location_ID);
      const toLoc = locMap.get(mov.To_Location_ID);

      if (!fromLoc || !toLoc) return;

      const key = `${mov.From_Location_ID}|${mov.To_Location_ID}`;

      if (!flowsMap.has(key)) {
        flowsMap.set(key, {
          fromLoc,
          toLoc,
          count: 0,
          movementIds: [],
        });
      }

      const flow = flowsMap.get(key)!;
      flow.count++;
      flow.movementIds.push(mov.COW_ID);
    });

    return Array.from(flowsMap.values()).sort((a, b) => b.count - a.count);
  }, [movements, locMap]);

  // Get origin and destination location points
  const originDestinationData = useMemo(() => {
    const originMap = new Map<string, { lat: number; lon: number; count: number }>();
    const destinationMap = new Map<string, { lat: number; lon: number; count: number }>();

    flowData.forEach((flow) => {
      // Add origin
      const originKey = flow.fromLoc.Location_ID;
      if (!originMap.has(originKey)) {
        originMap.set(originKey, {
          lat: flow.fromLoc.Latitude,
          lon: flow.fromLoc.Longitude,
          count: 0,
        });
      }
      const origin = originMap.get(originKey)!;
      origin.count += flow.count;

      // Add destination
      const destKey = flow.toLoc.Location_ID;
      if (!destinationMap.has(destKey)) {
        destinationMap.set(destKey, {
          lat: flow.toLoc.Latitude,
          lon: flow.toLoc.Longitude,
          count: 0,
        });
      }
      const destination = destinationMap.get(destKey)!;
      destination.count += flow.count;
    });

    return {
      origins: Array.from(originMap.values()).filter((p) =>
        isWithinSaudiBounds(p.lat, p.lon),
      ),
      destinations: Array.from(destinationMap.values()).filter((p) =>
        isWithinSaudiBounds(p.lat, p.lon),
      ),
    };
  }, [flowData]);

  // Calculate max count for marker sizing
  const maxCount = useMemo(() => {
    const allCounts = [
      ...originDestinationData.origins.map((p) => p.count),
      ...originDestinationData.destinations.map((p) => p.count),
    ];
    return Math.max(...allCounts, 1);
  }, [originDestinationData]);

  // Total movements
  const totalMovements = useMemo(() => {
    const originTotal = originDestinationData.origins.reduce((sum, p) => sum + p.count, 0);
    const destTotal = originDestinationData.destinations.reduce((sum, p) => sum + p.count, 0);
    return Math.max(originTotal, destTotal);
  }, [originDestinationData]);

  // Highcharts options for movement heat map
  const options: Highcharts.Options = useMemo(() => {
    if (!saudiGeo) return {};

    // Convert origin points to Highcharts format
    const originPoints = originDestinationData.origins.map((p) => ({
      lon: p.lon,
      lat: p.lat,
      z: Math.sqrt(p.count) * 3, // Scale for marker size
      value: p.count,
    }));

    // Convert destination points to Highcharts format
    const destinationPoints = originDestinationData.destinations.map((p) => ({
      lon: p.lon,
      lat: p.lat,
      z: Math.sqrt(p.count) * 3, // Scale for marker size
      value: p.count,
    }));

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
          dataLabels: {
            enabled: false,
          },
          states: {
            hover: {
              brightness: 0.2,
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
          name: "Origin Locations",
          color: "#a855f7",
          data: originPoints,
          showInLegend: true,
          tooltip: {
            headerFormat: "",
            pointFormat: "<b>Origin</b><br/>Movements: <strong>{point.value:,.0f}</strong>",
          },
        } as any,
        {
          type: "mappoint",
          name: "Destination Locations",
          color: "#ec4899",
          data: destinationPoints,
          showInLegend: true,
          tooltip: {
            headerFormat: "",
            pointFormat: "<b>Destination</b><br/>Movements: <strong>{point.value:,.0f}</strong>",
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
            symbolFill: "#a855f7",
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
  }, [saudiGeo, originDestinationData, maxCount]);

  if (loading || !saudiGeo || !modulesReady) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-slate-800 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
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
          Movement Heat Map
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Heat intensity visualization of movement activity across Saudi Arabia
        </p>
      </div>

      <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-slate-700 shadow-lg relative">
        {originDestinationData.origins.length > 0 || originDestinationData.destinations.length > 0 ? (
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

            {/* Bottom Left: Location Counts */}
            <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Locations
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Origins: {originDestinationData.origins.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Destinations: {originDestinationData.destinations.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Right: Marker Size Scale */}
            <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-3 shadow-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Marker Size
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Low Activity
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Medium Activity
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-600"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    High Activity
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-lg text-gray-400">No movement data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
