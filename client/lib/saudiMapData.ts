import { CowMovementsFact, DimLocation, DimCow } from "@shared/models";

export interface MapLine {
  from: [number, number]; // [lon, lat]
  to: [number, number];
  cowId: string;
  distance: number;
  movementType: string;
  vendor: string;
  month: string;
  date: string;
  fromRegion: string; // Origin region (from coordinates)
  toRegion: string; // Destination region (to coordinates)
  fromGovernorate?: string; // Origin governorate (Column AD)
  toGovernorate?: string; // Destination governorate (Column AD)
  toLocationId: string; // Destination location ID
  fromLocationId: string; // Origin location ID
  fromSubLocation?: string; // Column R: From Sub Location (Event Type)
  toSubLocation?: string; // Column V: To Sub Location (Event Type)
}

export interface TimelineMonth {
  month: string;
  year: number;
  movements: MapLine[];
  totalDistance: number;
  movementCounts: {
    Full: number;
    Half: number;
    Zero: number;
  };
  vendorCounts: Record<string, number>;
}

// Month label cache to avoid repeated toLocaleString calls
const monthLabelCache = new Map<string, string>();

function getMonthLabel(year: number, month: number): string {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  if (monthLabelCache.has(key)) {
    return monthLabelCache.get(key)!;
  }
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
  });
  monthLabelCache.set(key, label);
  return label;
}

export function generateTimelineMonths(
  movements: CowMovementsFact[],
  cows: DimCow[],
  locations: DimLocation[],
): TimelineMonth[] {
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));
  const cowMap = new Map(cows.map((c) => [c.COW_ID, c]));

  const monthsMap = new Map<string, TimelineMonth & { sortKey: number }>();

  movements.forEach((mov) => {
    const fromLoc = locMap.get(mov.From_Location_ID);
    const toLoc = locMap.get(mov.To_Location_ID);
    const cow = cowMap.get(mov.COW_ID);

    if (!fromLoc || !toLoc || !cow) return;

    const date = new Date(mov.Moved_DateTime);
    const year = date.getFullYear();
    const monthNum = date.getMonth() + 1;
    const monthKey = `${year}-${String(monthNum).padStart(2, "0")}`;
    const sortKey = year * 12 + monthNum; // More efficient than parsing dates again

    if (!monthsMap.has(monthKey)) {
      monthsMap.set(monthKey, {
        month: getMonthLabel(year, monthNum),
        year,
        movements: [],
        totalDistance: 0,
        movementCounts: { Full: 0, Half: 0, Zero: 0 },
        vendorCounts: {},
        sortKey,
      });
    }

    const timeline = monthsMap.get(monthKey)!;
    const mapLine: MapLine = {
      from: [fromLoc.Longitude, fromLoc.Latitude],
      to: [toLoc.Longitude, toLoc.Latitude],
      cowId: mov.COW_ID,
      distance: mov.Distance_KM || 0,
      movementType: mov.Movement_Type || "Zero",
      vendor: mov.Vendor || "Unknown",
      month: monthKey,
      date: mov.Moved_DateTime
        ? mov.Moved_DateTime.split("T")[0]
        : new Date().toISOString().split("T")[0],
      fromRegion: fromLoc.Region,
      toRegion: toLoc.Region,
      fromGovernorate: fromLoc.Governorate,
      toGovernorate: toLoc.Governorate,
      toLocationId: toLoc.Location_ID,
      fromLocationId: fromLoc.Location_ID,
      fromSubLocation: mov.From_Sub_Location, // Column R: Event Type
      toSubLocation: mov.To_Sub_Location, // Column V: Event Type
    };

    timeline.movements.push(mapLine);
    timeline.totalDistance += mapLine.distance;
    timeline.movementCounts[
      mapLine.movementType as keyof typeof timeline.movementCounts
    ]++;
    const vendorName = mov.Vendor || "Unknown";
    timeline.vendorCounts[vendorName] =
      (timeline.vendorCounts[vendorName] || 0) + 1;
  });

  // Sort by date using cached sort key (year*12 + month is more efficient than Date parsing)
  return Array.from(monthsMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...rest }) => rest); // Remove sortKey from result
}

export function getMapSeries(
  movements: MapLine[],
  colorMap: Record<string, string> = {},
) {
  const series = [
    {
      name: "Movements",
      type: "mapline" as const,
      data: movements.map((line) => ({
        point: {
          x: line.from[0],
          y: line.from[1],
        },
        pointEnd: {
          x: line.to[0],
          y: line.to[1],
        },
        custom: {
          cowId: line.cowId,
          distance: line.distance,
          movementType: line.movementType,
          vendor: line.vendor,
          date: line.date,
        },
      })),
      states: {
        hover: {
          lineWidth: 3,
        },
      },
      color: "#3b82f6",
    },
  ];

  return series;
}

export function getWarehouseMarkers(locations: DimLocation[]) {
  const warehouses = locations.filter((l) => l.Location_Type === "Warehouse");
  return {
    name: "Warehouses",
    type: "mappoint" as const,
    data: warehouses.map((wh) => ({
      name: wh.Location_Name,
      lat: wh.Latitude,
      lon: wh.Longitude,
      custom: {
        type: "warehouse",
        owner: wh.Owner,
      },
    })),
    marker: {
      symbol: "diamond",
      fillColor: "#8b7355",
      radius: 5,
    },
  };
}

export function getSiteMarkers(locations: DimLocation[]) {
  const sites = locations.filter((l) => l.Location_Type === "Site");
  return {
    name: "Sites",
    type: "mappoint" as const,
    data: sites.map((site) => ({
      name: site.Location_Name,
      lat: site.Latitude,
      lon: site.Longitude,
      custom: {
        type: "site",
        region: site.Region,
        owner: site.Owner,
      },
    })),
    marker: {
      symbol: "circle",
      fillColor: "#06b6d4",
      radius: 4,
    },
  };
}
