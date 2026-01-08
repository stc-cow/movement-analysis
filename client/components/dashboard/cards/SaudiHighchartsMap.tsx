import { useRef, useMemo, useEffect, useState } from "react";
import Highcharts from "highcharts";
import { getIntensityColor } from "@/lib/saudiGeoData";
import { normalizeRegionName } from "@/lib/saudiRegionMapping";

interface SaudiHighchartsMapProps {
  regionMetrics: Record<string, number>;
  maxMetric: number;
  title?: string;
}

// Load highmaps and map data
const loadHighchartsMaps = (): Promise<void> => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (
      window.Highcharts &&
      (window.Highcharts as any).maps
    ) {
      resolve();
      return;
    }

    // Load highmaps script
    const highchartsScript = document.createElement("script");
    highchartsScript.src = "https://code.highcharts.com/maps/highmaps.js";
    highchartsScript.onload = () => {
      // Load Saudi Arabia map data
      const mapScript = document.createElement("script");
      mapScript.src =
        "https://code.highcharts.com/mapdata/countries/sa/sa-all.js";
      mapScript.onload = () => {
        resolve();
      };
      mapScript.onerror = () => {
        console.error("Failed to load Saudi Arabia map data");
        resolve(); // Still resolve to avoid hanging
      };
      document.head.appendChild(mapScript);
    };
    highchartsScript.onerror = () => {
      console.error("Failed to load highmaps");
      resolve(); // Still resolve to avoid hanging
    };
    document.head.appendChild(highchartsScript);
  });
};

export function SaudiHighchartsMap({
  regionMetrics,
  maxMetric,
  title = "Movements by Region",
}: SaudiHighchartsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Load maps library once
  useEffect(() => {
    loadHighchartsMaps().then(() => {
      setIsReady(true);
    });
  }, []);

  // Prepare data for map chart
  const chartData = useMemo(() => {
    return Object.entries(regionMetrics).map(([region, value]) => {
      const hcKey = normalizeRegionName(region);
      return {
        "hc-key": hcKey,
        value: value,
      };
    });
  }, [regionMetrics]);

  // Render map when ready
  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const minValue = 0;
    const maxValue = maxMetric || 1;

    try {
      // Destroy previous chart if exists
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // Create map chart
      chartRef.current = (Highcharts as any).mapChart(containerRef.current, {
        chart: {
          borderWidth: 0,
          spacing: [0, 0, 0, 0],
        },
        title: undefined,
        subtitle: undefined,
        colorAxis: {
          min: minValue,
          max: maxValue,
          minColor: "#f3e8ff",
          maxColor: "#7030a0",
          type: "linear",
          tickInterval: Math.max(1, Math.ceil(maxValue / 5)),
        },
        legend: {
          enabled: false,
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
            states: {
              hover: {
                color: "#a855f7",
                enabled: true,
              },
            },
            dataLabels: {
              enabled: true,
              format: "{point.name}",
              style: {
                fontSize: "11px",
                fontWeight: "bold",
                color: "#1f2937",
                textShadow: "1px 1px 2px rgba(255,255,255,0.9)",
              },
              allowOverlap: true,
            },
          },
        },
        series: [
          {
            type: "map",
            name: "Movements by Region",
            data: chartData,
            mapData: (window as any).Highcharts?.maps?.[
              "countries/sa/sa-all"
            ],
          } as any,
        ],
        credits: {
          enabled: false,
        },
        exporting: {
          enabled: false,
        },
      } as any);
    } catch (error) {
      console.error("Error creating map chart:", error);
    }

    return () => {
      // Don't destroy on unmount, let the parent handle cleanup if needed
    };
  }, [isReady, chartData, maxMetric]);

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>≡</span> {title}
      </h3>
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "300px",
          }}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 justify-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">Low</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
              <div
                key={intensity}
                className="w-4 h-4"
                style={{ backgroundColor: getIntensityColor(intensity) }}
                title={`${Math.round(intensity * 100)}%`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">High</span>
        </div>
      </div>
    </div>
  );
}
