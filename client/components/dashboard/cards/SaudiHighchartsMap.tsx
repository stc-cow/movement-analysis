import { useRef, useMemo, useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { getIntensityColor } from "@/lib/saudiGeoData";
import { normalizeRegionName } from "@/lib/saudiRegionMapping";

interface SaudiHighchartsMapProps {
  regionMetrics: Record<string, number>;
  maxMetric: number;
  title?: string;
}

// Register map module if available
declare global {
  interface Window {
    Highcharts: any;
  }
}

export function SaudiHighchartsMap({
  regionMetrics,
  maxMetric,
  title = "Movements by Region",
}: SaudiHighchartsMapProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Load map data dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://code.highcharts.com/mapdata/countries/sa/sa-all.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Prepare data for map chart using region hc-keys
  const chartData = useMemo(() => {
    return Object.entries(regionMetrics).map(([region, value]) => {
      const hcKey = normalizeRegionName(region);
      return {
        "hc-key": hcKey,
        value: value,
      };
    });
  }, [regionMetrics]);

  // Get min and max values for color scaling
  const minValue = 0;
  const maxValue = maxMetric || 1;

  const options: Highcharts.Options = {
    chart: {
      type: "map",
      styledMode: false,
      spacingTop: 0,
      spacingBottom: 0,
      spacingLeft: 0,
      spacingRight: 0,
      borderWidth: 0,
      backgroundColor: "transparent",
    },
    title: undefined,
    subtitle: undefined,
    legend: {
      enabled: false,
    },
    colorAxis: {
      min: minValue,
      max: maxValue,
      minColor: "#f3e8ff",
      maxColor: "#7030a0",
      type: "linear",
      tickInterval: Math.ceil(maxValue / 5) || 1,
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
        },
      },
    },
    series: [
      {
        type: "map",
        name: "Movements by Region",
        data: chartData as any,
      } as any,
    ],
    credits: {
      enabled: false,
    },
    exporting: {
      enabled: false,
    },
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>≡</span> {title}
      </h3>
      <div className="flex-1 flex items-center justify-center min-h-0">
        <HighchartsReact
          ref={chartRef}
          highcharts={Highcharts}
          options={options}
          containerProps={{ style: { width: "100%", height: "100%" } }}
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
