import { useRef, useMemo, useEffect, useState } from "react";
import Highcharts from "highcharts";
import { normalizeRegionName } from "@/lib/saudiRegionMapping";

interface SaudiHighchartsMapProps {
  regionMetrics: Record<string, number>;
  maxMetric: number;
  title?: string;
  totalMovements?: number;
}

// Load Highcharts Maps and map data
const loadHighchartsMaps = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if maps module already loaded
    if ((window as any).Highcharts?.maps?.["countries/sa/sa-all"]) {
      resolve(true);
      return;
    }

    let loadedCount = 0;
    const checkBothLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        resolve(true);
      }
    };

    // Load maps module
    const mapsScript = document.createElement("script");
    mapsScript.src = "https://code.highcharts.com/maps/highmaps.js";
    mapsScript.onload = checkBothLoaded;
    mapsScript.onerror = () => {
      console.warn("Failed to load highmaps");
      checkBothLoaded();
    };
    document.head.appendChild(mapsScript);

    // Load Saudi Arabia map data
    const saScript = document.createElement("script");
    saScript.src = "https://code.highcharts.com/mapdata/countries/sa/sa-all.js";
    saScript.onload = checkBothLoaded;
    saScript.onerror = () => {
      console.warn("Failed to load SA map data");
      checkBothLoaded();
    };
    document.head.appendChild(saScript);
  });
};

export function SaudiHighchartsMap({
  regionMetrics,
  maxMetric,
  title = "Movements by Region",
  totalMovements = 0,
}: SaudiHighchartsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);

  // Load maps module on mount
  useEffect(() => {
    loadHighchartsMaps().then(() => {
      setMapsReady(true);
    });
  }, []);

  // Prepare choropleth data with hc-key format
  const chartData = useMemo(() => {
    return Object.entries(regionMetrics).map(([region, value]) => {
      const hcKey = normalizeRegionName(region);
      return {
        "hc-key": hcKey,
        value: value,
      };
    });
  }, [regionMetrics]);

  // Create map chart when ready
  useEffect(() => {
    if (!mapsReady || !containerRef.current || !chartData.length) return;

    try {
      // Destroy previous chart
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Create choropleth map using Highcharts.mapChart()
      chartRef.current = (window as any).Highcharts.mapChart(
        containerRef.current,
        {
          chart: {
            borderWidth: 0,
            spacingTop: 0,
            spacingBottom: 0,
            spacingLeft: 0,
            spacingRight: 0,
            backgroundColor: "transparent",
            height: "100%",
          },
          title: {
            text: title,
            style: {
              fontWeight: "700",
              fontSize: "14px",
            },
          },
          colorAxis: {
            min: 0,
            max: maxMetric || 1,
            minColor: "#efe6f6",
            maxColor: "#6a1b9a",
            type: "linear",
            tickInterval: Math.ceil((maxMetric || 1) / 5),
          },
          legend: {
            layout: "horizontal",
            align: "center",
            verticalAlign: "bottom",
            y: 10,
            floating: false,
            enabled: true,
          },
          tooltip: {
            useHTML: true,
            headerFormat: "",
            pointFormat:
              '<div style="background: rgba(255,255,255,0.95); padding: 8px; border-radius: 4px; border: 1px solid #999;">' +
              "<b>{point.name}</b><br/>Movements: {point.value}" +
              "</div>",
            backgroundColor: "transparent",
            borderColor: "transparent",
          },
          plotOptions: {
            map: {
              borderColor: "#ffffff",
              borderWidth: 1,
              states: {
                hover: {
                  color: "#9c27b0",
                  enabled: true,
                  brightness: 0.1,
                },
              },
              dataLabels: {
                enabled: true,
                format: "{point.name}",
                style: {
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#000",
                  textOutline: "none",
                },
                allowOverlap: true,
              },
            },
          },
          mapNavigation: {
            enabled: false,
          },
          series: [
            {
              type: "map",
              data: chartData,
              name: "Movements",
            },
          ],
          credits: {
            enabled: false,
          },
          exporting: {
            enabled: true,
            buttons: {
              contextButton: {
                menuItems: ["downloadPNG", "downloadSVG", "downloadPDF", "printChart"],
              },
            },
          },
        }
      );
    } catch (error) {
      console.error("Error creating choropleth map:", error);
    }

    return () => {
      // Don't destroy on unmount to prevent flashing
    };
  }, [mapsReady, chartData, maxMetric, title]);

  if (!mapsReady) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center min-h-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "350px",
          }}
        />
      </div>

      {/* KPI Display */}
      {totalMovements > 0 && (
        <div className="text-center py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Total Movements: {totalMovements}
          </p>
        </div>
      )}
    </div>
  );
}
