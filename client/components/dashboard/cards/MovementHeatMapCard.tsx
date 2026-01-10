import { useMemo, useState } from "react";
import { CowMovementsFact, DimLocation } from "@shared/models";
import Highcharts from "@/lib/highcharts";
import HighchartsReact from "highcharts-react-official";

interface MovementHeatMapCardProps {
  movements: CowMovementsFact[];
  locations: DimLocation[];
}

interface HeatMapPoint {
  x: number; // from_longitude (S column)
  y: number; // from_latitude (T column)
  z: number; // to_longitude (W column)
  w: number; // to_latitude (X column)
  value: number; // movement count
  color?: string;
  fromLocation: string;
  toLocation: string;
  movementCount: number;
}

export function MovementHeatMapCard({
  movements,
  locations,
}: MovementHeatMapCardProps) {
  const locMap = useMemo(
    () => new Map(locations.map((l) => [l.Location_ID, l])),
    [locations],
  );

  // Transform movements into heat map data points
  const heatMapData = useMemo(() => {
    const pointsMap = new Map<string, HeatMapPoint>();

    movements.forEach((mov) => {
      const fromLoc = locMap.get(mov.From_Location_ID);
      const toLoc = locMap.get(mov.To_Location_ID);

      if (!fromLoc || !toLoc) return;

      // Create unique key for origin-destination pair
      const key = `${fromLoc.Location_ID}|${toLoc.Location_ID}`;

      if (!pointsMap.has(key)) {
        pointsMap.set(key, {
          x: fromLoc.Longitude,
          y: fromLoc.Latitude,
          z: toLoc.Longitude,
          w: toLoc.Latitude,
          value: 0,
          fromLocation: fromLoc.Location_Name,
          toLocation: toLoc.Location_Name,
          movementCount: 0,
        });
      }

      const point = pointsMap.get(key)!;
      point.movementCount++;
      point.value = point.movementCount;
    });

    return Array.from(pointsMap.values());
  }, [movements, locMap]);

  // Calculate max movement count for color scaling
  const maxValue = useMemo(() => {
    return Math.max(...heatMapData.map((p) => p.value), 1);
  }, [heatMapData]);

  // Create color map based on movement intensity
  const coloredData = useMemo(() => {
    const colorScale = [
      "#efe6f6", // light purple
      "#e8d5f2",
      "#d8b4fe",
      "#c7a3f9",
      "#b39ddb",
      "#a186d4",
      "#9c27b0",
      "#8b1fa6",
      "#7b1b99",
      "#6a1b9a", // dark purple
    ];

    return heatMapData.map((point) => {
      const intensity = Math.min(point.value / maxValue, 1);
      const colorIndex = Math.floor(intensity * (colorScale.length - 1));
      return {
        ...point,
        color: colorScale[colorIndex],
      };
    });
  }, [heatMapData, maxValue]);

  // Highcharts options for bubble/scatter heat map
  const options: Highcharts.Options = useMemo(() => {
    return {
      chart: {
        type: "bubble",
        backgroundColor: "transparent",
        spacingTop: 20,
        spacingBottom: 20,
        spacingLeft: 40,
        spacingRight: 40,
      },
      title: {
        text: null,
      },
      subtitle: {
        text: null,
      },
      xAxis: {
        title: {
          text: "From Longitude (Column S)",
          style: {
            fontSize: "12px",
            fontWeight: "600",
            color: "#374151",
          },
        },
        labels: {
          format: "{value:.2f}",
          style: {
            fontSize: "10px",
            color: "#6b7280",
          },
        },
        gridLineWidth: 1,
        gridLineColor: "#e5e7eb",
      },
      yAxis: {
        title: {
          text: "From Latitude (Column T)",
          style: {
            fontSize: "12px",
            fontWeight: "600",
            color: "#374151",
          },
        },
        labels: {
          format: "{value:.2f}",
          style: {
            fontSize: "10px",
            color: "#6b7280",
          },
        },
        gridLineWidth: 1,
        gridLineColor: "#e5e7eb",
      },
      legend: {
        enabled: true,
        align: "bottom",
        verticalAlign: "bottom",
        layout: "horizontal",
        margin: 10,
      },
      plotOptions: {
        bubble: {
          minSize: "8%",
          maxSize: "20%",
          zMin: 0,
          colorByPoint: false,
          states: {
            hover: {
              brightness: 0.1,
              borderColor: "#ffffff",
              borderWidth: 2,
              shadow: true,
            },
          },
          dataLabels: {
            enabled: false,
          },
        },
      },
      tooltip: {
        headerFormat: "",
        pointFormat: "<b>{point.fromLocation} → {point.toLocation}</b><br/>Movements: <strong>{point.movementCount}</strong><br/>From: ({point.x:.3f}°, {point.y:.3f}°)<br/>To: ({point.z:.3f}°, {point.w:.3f}°)",
        style: {
          fontSize: "12px",
        },
      },
      series: [
        {
          type: "bubble",
          name: "Movements",
          data: coloredData.map((point) => ({
            x: point.x,
            y: point.y,
            z: Math.sqrt(point.value) * 10, // Size based on movement count
            value: point.value,
            color: point.color,
            fromLocation: point.fromLocation,
            toLocation: point.toLocation,
            movementCount: point.movementCount,
          })) as any,
          colorByPoint: true,
        } as any,
      ],
      credits: {
        enabled: false,
      },
    };
  }, [coloredData]);

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-slate-800 dark:via-slate-800/50 dark:to-slate-800 p-6">
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Movement Heat Map
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Origin coordinates (S, T) vs Destination coordinates (W, X) - Bubble size indicates movement frequency
        </p>
      </div>

      <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-slate-700 shadow-lg">
        {coloredData.length > 0 ? (
          <HighchartsReact
            highcharts={Highcharts}
            options={options}
            containerProps={{
              style: { width: "100%", height: "100%" },
            }}
            immutable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <p className="text-lg">No movement data available</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 mt-6 p-4 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-2">
              Data Mapping:
            </p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>X-Axis:</strong> From Longitude (Column S)
              </li>
              <li>
                <strong>Y-Axis:</strong> From Latitude (Column T)
              </li>
              <li>
                <strong>Bubble Size:</strong> Number of movements
              </li>
              <li>
                <strong>Bubble Color:</strong> Heat intensity
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-2">
              Destination Info (Tooltip):
            </p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>To Longitude:</strong> Column W
              </li>
              <li>
                <strong>To Latitude:</strong> Column X
              </li>
              <li>
                <strong>Movement Count:</strong> Total movements for pair
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
