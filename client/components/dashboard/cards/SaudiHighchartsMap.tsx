import { useEffect, useMemo, useState, useRef } from "react";
import Highcharts, { ensureHighchartsModules } from "@/lib/highcharts";
import HighchartsReact from "highcharts-react-official";
import { regionToHcKey } from "@/lib/saudiRegionMapping";

interface SaudiHighchartsMapProps {
  regionMetrics: Record<string, number>;
  maxMetric: number;
  title?: string;
}

// Cache for geo data to prevent re-fetching
let geoDataCache: any = null;
let geoDataPromise: Promise<any> | null = null;

export function SaudiHighchartsMap({
  regionMetrics,
  maxMetric,
  title = "Movements by Region",
}: SaudiHighchartsMapProps) {
  const [saudiGeo, setSaudiGeo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modulesReady, setModulesReady] = useState(false);
  const geoDataRef = useRef<any>(null);

  // Ensure Highcharts modules are initialized
  useEffect(() => {
    ensureHighchartsModules().then(() => {
      setModulesReady(true);
    });
  }, []);

  // Load Saudi geo data from Highcharts CDN with caching to prevent flashing
  useEffect(() => {
    if (!modulesReady) {
      return; // Wait for modules to be ready
    }

    const loadGeoData = async () => {
      try {
        // Use cached data if available
        if (geoDataCache) {
          setSaudiGeo(geoDataCache);
          setLoading(false);
          return;
        }

        // Use existing promise if already loading
        if (geoDataPromise) {
          const data = await geoDataPromise;
          setSaudiGeo(data);
          setLoading(false);
          return;
        }

        // Create new fetch promise
        geoDataPromise = fetch(
          "https://code.highcharts.com/mapdata/countries/sa/sa-all.geo.json",
        ).then(async (response) => {
          if (!response.ok) throw new Error("Failed to fetch geo data");
          const data = await response.json();
          geoDataCache = data;
          return data;
        });

        const data = await geoDataPromise;
        geoDataRef.current = data;
        setSaudiGeo(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load Saudi geo data:", error);
        setLoading(false);
      }
    };

    loadGeoData();
  }, [modulesReady]);

  // Transform region metrics to Highcharts data format: [["sa-ri", 320], ["sa-mk", 180], ...]
  const chartData = useMemo(() => {
    return Object.entries(regionMetrics)
      .map(([regionName, value]) => {
        const hcKey = regionToHcKey[regionName];
        if (!hcKey) {
          console.warn(`No mapping found for region: ${regionName}`);
          return null;
        }
        return [hcKey, value] as [string, number];
      })
      .filter((item) => item !== null) as [string, number][];
  }, [regionMetrics]);

  const options: Highcharts.Options = useMemo(
    () => ({
      chart: {
        map: saudiGeo,
        backgroundColor: "transparent",
        borderWidth: 0,
        spacingTop: 0,
        spacingBottom: 0,
        spacingLeft: 0,
        spacingRight: 0,
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
        max: maxMetric > 0 ? maxMetric : 1,
        type: "linear",
        minColor: "#efe6f6",
        maxColor: "#6a1b9a",
        stops: [
          [0, "#efe6f6"],
          [0.25, "#d8b4fe"],
          [0.5, "#b39ddb"],
          [0.75, "#9c27b0"],
          [1, "#6a1b9a"],
        ],
        labels: {
          format: "{value}",
        },
      },
      legend: {
        layout: "horizontal",
        align: "center",
        verticalAlign: "bottom",
        enabled: true,
        margin: 10,
        symbolWidth: 12,
      },
      plotOptions: {
        map: {
          dataLabels: {
            enabled: true,
            format: "{point.properties.name}",
            style: {
              fontSize: "11px",
              fontWeight: "600",
              color: "#1f2937",
              textOutline: "1px 1px white",
              textShadow: "none",
            },
          },
          states: {
            hover: {
              brightness: 0.1,
              borderColor: "#ffffff",
              borderWidth: 2,
              shadow: true,
            },
          },
          borderColor: "#e5e7eb",
          borderWidth: 1,
          nullColor: "#f3f4f6",
          animation: {
            duration: 300,
          },
        },
      },
      series: [
        {
          type: "map",
          name: "Movements",
          data: chartData,
          joinBy: ["hc-key", 0],
          tooltip: {
            headerFormat: "",
            pointFormat:
              "<b>{point.properties.name}</b><br/>Movements: <strong>{point.value:,.0f}</strong>",
          },
          states: {
            hover: {
              brightness: 0.1,
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
            symbolFill: "#6a1b9a",
          },
        },
        csv: {
          dateFormat: "%Y-%m-%d",
        },
      },
      credits: {
        enabled: false,
      },
    }),
    [saudiGeo, maxMetric, chartData],
  );

  if (loading || !saudiGeo || !modulesReady) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-lg">
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
    <div className="w-full h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>≡</span> {title}
      </h3>

      {/* Map Container */}
      <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-slate-700">
        <HighchartsReact
          highcharts={Highcharts}
          constructorType="mapChart"
          options={options}
          containerProps={{
            style: { width: "100%", height: "100%" },
          }}
          immutable={false}
        />
      </div>
    </div>
  );
}
