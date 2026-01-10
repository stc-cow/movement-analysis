import { useEffect, useMemo, useState, useRef } from "react";
import Highcharts, { ensureHighchartsModules } from "@/lib/highcharts";
import HighchartsReact from "highcharts-react-official";
import { DimLocation } from "@shared/models";

interface WarehouseLocationMapProps {
  warehouses: DimLocation[];
  selectedRegion?: string;
}

// Cache for geo data to prevent re-fetching
let geoDataCache: any = null;
let geoDataPromise: Promise<any> | null = null;

export function WarehouseLocationMap({
  warehouses,
  selectedRegion,
}: WarehouseLocationMapProps) {
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

  // Load Saudi geo data
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

  // Filter warehouses by region if selected
  const filteredWarehouses = useMemo(() => {
    if (!selectedRegion) return warehouses;
    return warehouses.filter((w) => w.Region === selectedRegion);
  }, [warehouses, selectedRegion]);

  // Transform warehouse locations to points for the map
  const warehousePoints = useMemo(() => {
    return filteredWarehouses.map((wh) => ({
      lat: wh.Latitude,
      lon: wh.Longitude,
      name: wh.Location_Name,
      owner: wh.Owner,
      region: wh.Region,
      color: getOwnerColor(wh.Owner),
    }));
  }, [filteredWarehouses]);

  // Memoize chart options to prevent unnecessary re-renders
  const options = useMemo(
    () => ({
      chart: {
        map: saudiGeo,
        backgroundColor: "transparent",
        height: 500,
        borderRadius: 12,
      },
      title: {
        text: null,
      },
      mapNavigation: {
        enabled: true,
        buttonOptions: {
          verticalAlign: "bottom",
        },
      },
      colorAxis: {
        min: 0,
        max: 100,
        stops: [
          [0, "#f3f4f6"],
          [1, "#e5e7eb"],
        ],
        labels: {
          enabled: false,
        },
      },
      series: [
        {
          name: "Saudi Arabia",
          data: [],
          states: {
            hover: {
              color: "#dbeafe",
            },
          },
        },
        {
          type: "mappoint",
          name: "Warehouses",
          colorByPoint: true,
          data: warehousePoints,
          dataLabels: {
            enabled: true,
            format: "<span style=\"font-size:11px;font-weight:bold\">{point.name}</span>",
            style: {
              textOutline: "1px white",
              color: "#1f2937",
            },
          },
          marker: {
            radius: 8,
            states: {
              hover: {
                radius: 10,
              },
            },
          },
          tooltip: {
            headerFormat: "<b>{point.name}</b><br/>",
            pointFormat: "Owner: {point.owner}<br/>Region: {point.region}<br/>Lat: {point.lat:.4f}<br/>Lon: {point.lon:.4f}",
          },
        },
      ],
      credits: {
        enabled: false,
      },
    }),
    [saudiGeo, warehousePoints],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Loading warehouse map...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {saudiGeo && (
        <HighchartsReact
          highcharts={Highcharts}
          options={options}
          immutable={false}
          ref={chartRef}
        />
      )}
    </div>
  );
}

function getOwnerColor(owner: string): string {
  const colors: Record<string, string> = {
    STC: "#3A0CA3",
    ACES: "#5F2EEA",
    Madaf: "#06B6D4",
    HOI: "#F97316",
  };
  return colors[owner] || "#6366F1";
}
