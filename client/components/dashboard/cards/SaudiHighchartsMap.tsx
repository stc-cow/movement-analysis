import { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { regionToHcKey } from "@/lib/saudiRegionMapping";

// Import and register the Maps module
import HighchartsMaps from "highcharts/modules/map";
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportingData from "highcharts/modules/export-data";

// Register modules
HighchartsMaps(Highcharts);
HighchartsExporting(Highcharts);
HighchartsExportingData(Highcharts);

interface SaudiHighchartsMapProps {
  regionMetrics: Record<string, number>;
  maxMetric: number;
  title?: string;
  totalMovements?: number;
}

export function SaudiHighchartsMap({
  regionMetrics,
  maxMetric,
  title = "Movements by Region",
  totalMovements = 0,
}: SaudiHighchartsMapProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load the Saudi Arabia map data
  useEffect(() => {
    const loadMapData = async () => {
      try {
        const response = await fetch(
          "https://code.highcharts.com/mapdata/countries/sa/sa-all.json"
        );
        if (!response.ok) throw new Error("Failed to fetch map data");
        const data = await response.json();
        setMapData(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load map data:", error);
        setLoading(false);
      }
    };

    loadMapData();
  }, []);

  // Prepare chart data from regionMetrics
  const chartData = Object.entries(regionMetrics)
    .map(([regionName, value]) => {
      const hcKey = regionToHcKey[regionName];
      if (!hcKey) {
        console.warn(`No mapping found for region: ${regionName}`);
        return null;
      }
      return {
        "hc-key": hcKey,
        value: value,
        name: regionName,
      };
    })
    .filter((item) => item !== null);

  const options: Highcharts.Options = {
    chart: {
      map: mapData || undefined,
      backgroundColor: "transparent",
      borderWidth: 0,
      style: {
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      },
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
      floating: false,
      enabled: true,
      symbolWidth: 12,
      itemDistance: 10,
    },
    plotOptions: {
      map: {
        dataLabels: {
          enabled: true,
          format: "{point.name}",
          style: {
            fontSize: "11px",
            fontWeight: "600",
            color: "#374151",
            textOutline: "1px 1px white",
            textShadow: "none",
          },
        },
        states: {
          hover: {
            brightness: 0.1,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        },
        borderColor: "#e5e7eb",
        borderWidth: 0.5,
        nullColor: "#f3f4f6",
      },
    },
    series: [
      {
        type: "map",
        name: "Movements",
        data: chartData as any,
        joinBy: ["hc-key", "hc-key"],
        states: {
          hover: {
            brightness: 0.1,
          },
        },
        tooltip: {
          headerFormat: "",
          pointFormat:
            "<b>{point.name}</b><br/>Movements: <strong>{point.value}</strong>",
        },
      },
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
  };

  if (loading || !mapData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading map...
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
          options={options}
          ref={chartRef}
          containerProps={{ style: { width: "100%", height: "100%" } }}
          immutable={false}
        />
      </div>

      {/* KPI Display */}
      {totalMovements > 0 && (
        <div className="text-center py-3 mt-4 px-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Total Movements: <span className="text-purple-600 dark:text-purple-400">{totalMovements}</span>
          </p>
        </div>
      )}
    </div>
  );
}
