import { useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { regionCenters, getIntensityColor } from "@/lib/saudiGeoData";

interface SaudiHighchartsMapProps {
  regionMetrics: Record<string, number>;
  maxMetric: number;
  title?: string;
}

export function SaudiHighchartsMap({
  regionMetrics,
  maxMetric,
  title = "Movements by Region",
}: SaudiHighchartsMapProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const options: Highcharts.Options = {
    chart: {
      type: "scatter" as const,
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
    xAxis: {
      type: "linear" as const,
      visible: false,
      min: 35,
      max: 52,
    },
    yAxis: {
      visible: false,
      min: 16,
      max: 30,
    },
    plotOptions: {
      scatter: {
        marker: {
          lineWidth: 2,
          lineColor: "#333",
          fillOpacity: 0.8,
        },
        dataLabels: {
          enabled: true,
          format: "{point.name}",
          style: {
            fontSize: "11px",
            fontWeight: "bold" as const,
            color: "#333",
            textShadow: "1px 1px 2px rgba(255,255,255,0.8)",
          },
          allowOverlap: true,
        },
        states: {
          hover: {
            marker: {
              lineWidth: 3,
              lineColor: "#000",
            },
          },
        },
      },
    },
    series: [
      {
        type: "scatter",
        name: "Regions",
        data: Object.entries(regionCenters).map(([region, coords]) => {
          const metric = regionMetrics[region] || 0;
          const intensity = maxMetric > 0 ? metric / maxMetric : 0;
          const color = getIntensityColor(intensity);

          return {
            name: region,
            x: coords.lon,
            y: coords.lat,
            value: metric,
            color,
            marker: {
              fillColor: color,
              radius: 6 + Math.pow(intensity, 0.5) * 10, // Scale radius based on intensity
            },
          } as any;
        }),
        tooltip: {
          headerFormat: "",
          pointFormat: "<b>{point.name}</b><br/>Movements: {point.value}",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderColor: "#999",
          borderRadius: 4,
          padding: 8,
        },
      },
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
