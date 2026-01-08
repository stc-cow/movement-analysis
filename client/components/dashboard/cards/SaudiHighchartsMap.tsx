import { useRef, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { getIntensityColor } from "@/lib/saudiGeoData";
import { regionCenters } from "@/lib/saudiGeoData";

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

  // Prepare data for bubble chart (geographic representation)
  const chartData = useMemo(() => {
    return Object.entries(regionCenters).map(([region, coords]) => {
      const metric = regionMetrics[region] || 0;
      const intensity = maxMetric > 0 ? metric / maxMetric : 0;

      return {
        name: region,
        x: coords.lon,
        y: coords.lat,
        z: Math.max(metric * 5, 20), // Size for visualization
        value: metric,
        intensity,
        color: getIntensityColor(intensity),
      };
    });
  }, [regionMetrics, maxMetric]);

  const options: Highcharts.Options = {
    chart: {
      type: "bubble",
      styledMode: false,
      spacingTop: 10,
      spacingBottom: 10,
      spacingLeft: 10,
      spacingRight: 10,
      borderWidth: 0,
      backgroundColor: "transparent",
    },
    title: undefined,
    subtitle: undefined,
    legend: {
      enabled: false,
    },
    xAxis: {
      type: "linear",
      visible: false,
      min: 35,
      max: 52,
      tickInterval: 5,
    },
    yAxis: {
      visible: false,
      min: 16,
      max: 30,
      tickInterval: 5,
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
      bubble: {
        minSize: "10%",
        maxSize: "25%",
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
        states: {
          hover: {
            enabled: true,
            halo: {
              size: 5,
              attributes: {
                fill: "rgba(168, 85, 247, 0.2)",
              },
            },
          },
        },
      },
    },
    series: [
      {
        type: "bubble",
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
