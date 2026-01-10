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

  // Filter locations to only include those within Saudi Arabia
  const validLocations = useMemo(() => {
    return locations.filter(
      (loc) => isWithinSaudiBounds(loc.Latitude, loc.Longitude),
    );
  }, [locations]);

  const locMap = useMemo(
    () => new Map(validLocations.map((l) => [l.Location_ID, l])),
    [validLocations],
  );

  // Aggregate movements by from-to location pairs (only valid locations)
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
  }, [movements, locMap, validLocations]);

  // Calculate heat map data by destination region
  const regionHeatData = useMemo(() => {
    const regionCounts: Record<string, number> = {};

    // Aggregate movements by destination region
    flowData.forEach((flow) => {
      const regionName = flow.toLoc.Region;
      regionCounts[regionName] = (regionCounts[regionName] || 0) + flow.count;
    });

    // Convert region names to hc-keys and create data points
    return Object.entries(regionCounts)
      .map(([regionName, count]) => {
        const hcKey = regionToHcKey[regionName];
        if (!hcKey) return null;
        return [hcKey, count] as [string, number];
      })
      .filter((item) => item !== null) as [string, number][];
  }, [flowData]);

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(...regionHeatData.map((d) => d[1]), 1);
  }, [regionHeatData]);

  // Total movements
  const totalMovements = useMemo(() => {
    return regionHeatData.reduce((sum, d) => sum + d[1], 0);
  }, [regionHeatData]);


  // Highcharts options for movement heat map
  const options: Highcharts.Options = useMemo(() => {
    if (!saudiGeo) return {};

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
      colorAxis: {
        min: 0,
        max: maxCount > 0 ? maxCount : 1,
        type: "linear",
        minColor: "#fef3c7",
        maxColor: "#dc2626",
        stops: [
          [0, "#fef3c7"],
          [0.25, "#fcd34d"],
          [0.5, "#f59e0b"],
          [0.75, "#f97316"],
          [1, "#dc2626"],
        ],
        labels: {
          format: "{value}",
        },
        animation: false,
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        series: {
          animation: false,
        },
        map: {
          dataLabels: {
            enabled: false,
            format: "",
          },
          borderColor: "#e5e7eb",
          borderWidth: 0,
          nullColor: "#f3f4f6",
          states: {
            hover: {
              brightness: 0,
              borderColor: "#e5e7eb",
            },
          },
        },
        mapline: {
          lineWidth: 2,
          states: {
            hover: {
              brightness: 0.1,
              lineWidth: 3,
            },
          },
        },
      },
      series: [
        {
          type: "map",
          name: "Movement Heat",
          data: regionHeatData,
          joinBy: ["hc-key", 0],
          showInLegend: false,
          tooltip: {
            headerFormat: "",
            pointFormat: "<b>{point.properties.name}</b><br/>Movements: <strong>{point.value:,.0f}</strong>",
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
            symbolFill: "#ef4444",
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
  }, [saudiGeo]);

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
        {flowData.length > 0 ? (
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

            {/* Bottom Left: Total Movements */}
            <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Route Movements
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {flowData.reduce((sum, f) => sum + f.count, 0)}
              </p>
            </div>

            {/* Bottom Right: Color Gradient Scale */}
            <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-3 shadow-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Activity Intensity
              </p>
              <div className="w-40">
                {/* Color gradient bar */}
                <div className="h-5 rounded overflow-hidden border border-gray-300 dark:border-gray-600 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-600"></div>
                {/* Scale labels */}
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <p className="text-lg">No movement data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
