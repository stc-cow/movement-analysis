import { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import { regionToHcKey } from "@/lib/saudiRegionMapping";

// Import the Maps module factory
import HighchartsMaps from "highcharts/modules/map";

// Register the Maps module
HighchartsMaps(Highcharts);

// Import and register exporting modules
import HighchartsExporting from "highcharts/modules/exporting";
import HighchartsExportingData from "highcharts/modules/export-data";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
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
        console.log("Map data loaded successfully:", data);
        setMapData(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load map data:", error);
        setLoading(false);
      }
    };

    loadMapData();
  }, []);

  // Create the map when data is ready
  useEffect(() => {
    if (!mapData || !containerRef.current) {
      return;
    }

    try {
      // Prepare chart data from regionMetrics
      const chartData: any[] = Object.entries(regionMetrics)
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

      console.log("Creating map with chart data:", chartData);
      console.log("Map data available:", !!mapData);

      const chartOptions: any = {
        chart: {
          map: mapData,
          backgroundColor: "transparent",
          borderWidth: 0,
          type: "map",
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
          minColor: "#efe6f6",
          maxColor: "#6a1b9a",
          stops: [
            [0, "#efe6f6"],
            [0.25, "#d8b4fe"],
            [0.5, "#b39ddb"],
            [0.75, "#9c27b0"],
            [1, "#6a1b9a"],
          ],
        },
        legend: {
          layout: "horizontal",
          align: "center",
          verticalAlign: "bottom",
          enabled: true,
        },
        plotOptions: {
          map: {
            dataLabels: {
              enabled: true,
              format: "{point.name}",
              style: {
                fontSize: "10px",
                fontWeight: "600",
                color: "#374151",
                textOutline: "1px 1px white",
              },
            },
            borderColor: "#d1d5db",
            borderWidth: 1,
            nullColor: "#f3f4f6",
          },
        },
        series: [
          {
            type: "map",
            name: "Movements",
            data: chartData,
            joinBy: ["hc-key", "hc-key"],
            tooltip: {
              headerFormat: "",
              pointFormat:
                "<b>{point.name}</b><br/>Movements: {point.value:,.0f}",
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
              ],
            },
          },
        },
        credits: {
          enabled: false,
        },
      };

      // Destroy existing chart if any
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Create the map chart using the standard chart method
      // This works because we registered the map module
      chartRef.current = Highcharts.chart(containerRef.current, chartOptions);
      console.log("Map chart created successfully");
    } catch (error) {
      console.error("Error creating map chart:", error);
    }

    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
          chartRef.current = null;
        } catch (e) {
          console.error("Error destroying chart:", e);
        }
      }
    };
  }, [mapData, regionMetrics, maxMetric]);

  if (loading) {
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

  if (!mapData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Failed to load map data
        </p>
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
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* KPI Display */}
      {totalMovements > 0 && (
        <div className="text-center py-3 mt-4 px-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Total Movements:{" "}
            <span className="text-purple-600 dark:text-purple-400">
              {totalMovements}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
