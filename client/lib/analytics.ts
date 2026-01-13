import {
  CowMovementsFact,
  DimCow,
  DimLocation,
  DimEvent,
  MovementType,
  COWMetrics,
  WarehouseMetrics,
  RegionMetrics,
  DashboardFilters,
  EventType,
} from "@shared/models";

// Warehouse Hub Time Analytics
export interface WarehouseHubTimeData {
  cowId: string;
  warehouseName: string;
  stayDays: number;
  arrivalDate: string;
  departureDate: string;
}

export interface OffAirStay {
  cowId: string;
  fromLocation: string;
  toWarehouse: string;
  idleStartDate: string;
  idleEndDate: string;
  idleDays: number;
  offAirStatus: "Yes";
}

export interface COWStayDays {
  cowId: string;
  totalStayDays: number;
}

export interface WarehouseAvgStay {
  warehouseName: string;
  avgStayDays: number;
  totalStayDays: number;
  stayCount: number;
}

export interface WarehouseTotalStay {
  warehouseName: string;
  totalStayDays: number;
}

// Movement Classification Rule Engine
export function classifyMovement(
  movement: CowMovementsFact,
  locations: Map<string, DimLocation>,
): MovementType {
  const fromLoc = locations.get(movement.From_Location_ID);
  const toLoc = locations.get(movement.To_Location_ID);

  if (!fromLoc || !toLoc) return "Zero";

  const fromIsWarehouse = fromLoc.Location_Type === "Warehouse";
  const toIsWarehouse = toLoc.Location_Type === "Warehouse";

  // Rule: From=Site AND To=Site → Full
  if (!fromIsWarehouse && !toIsWarehouse) return "Full";

  // Rule: From=WH AND To=Site OR reverse → Half
  if (
    (fromIsWarehouse && !toIsWarehouse) ||
    (!fromIsWarehouse && toIsWarehouse)
  )
    return "Half";

  // Rule: From=WH AND To=WH → Zero
  if (fromIsWarehouse && toIsWarehouse) return "Zero";

  return "Zero";
}

// Calculate distance between two coordinates (simplified Haversine)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Enrich movements with classification and distance
export function enrichMovements(
  movements: CowMovementsFact[],
  locations: DimLocation[],
): CowMovementsFact[] {
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));

  return movements.map((mov) => {
    // Use the original Movement_Type from Google Sheet if available
    // Otherwise, classify based on location types
    const movementType = mov.Movement_Type || classifyMovement(mov, locMap);

    // IMPORTANT: Always use the Distance_KM from Column Y (Google Sheet) as the source of truth
    // This is the value that matches the user's expected sum
    // Do NOT recalculate from coordinates - use API value directly
    return {
      ...mov,
      Movement_Type: movementType,
      // Keep the Distance_KM from the API exactly as-is
    };
  });
}

// Calculate COW metrics
export function calculateCowMetrics(
  cowId: string,
  movements: CowMovementsFact[],
  locations: DimLocation[],
): COWMetrics {
  const cowMovements = movements.filter((m) => m.COW_ID === cowId);
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));

  const totalMovements = cowMovements.length;
  const totalDistance = cowMovements.reduce(
    (sum, m) => sum + (m.Distance_KM || 0),
    0,
  );
  const avgDistance = totalMovements > 0 ? totalDistance / totalMovements : 0;

  const movementMix = {
    Full: cowMovements.filter((m) => m.Movement_Type === "Full").length,
    Half: cowMovements.filter((m) => m.Movement_Type === "Half").length,
    Zero: cowMovements.filter((m) => m.Movement_Type === "Zero").length,
  };

  // Calculate idle duration (days between movements)
  const idleDurations: number[] = [];
  for (let i = 1; i < cowMovements.length; i++) {
    const prev = new Date(cowMovements[i - 1].Reached_DateTime).getTime();
    const curr = new Date(cowMovements[i].Moved_DateTime).getTime();
    const idleDays = (curr - prev) / (1000 * 60 * 60 * 24);
    if (idleDays > 0) idleDurations.push(idleDays);
  }

  const avgIdleDuration =
    idleDurations.length > 0
      ? idleDurations.reduce((a, b) => a + b, 0) / idleDurations.length
      : 0;

  // Static COW: Only 1 movement over 5 years
  const isStatic = totalMovements <= 1;

  const regionsServed = Array.from(
    new Set(
      cowMovements
        .map((m) => locMap.get(m.To_Location_ID)?.Region)
        .filter(Boolean),
    ),
  ) as string[];

  const topEventType = (cowMovements.find((m) => m.Event_ID)?.Event_ID ||
    undefined) as EventType | undefined;

  return {
    COW_ID: cowId,
    Total_Movements: totalMovements,
    Total_Distance_KM: Math.round(totalDistance * 100) / 100,
    Avg_Distance_Per_Move: Math.round(avgDistance * 100) / 100,
    Movement_Mix: movementMix,
    Avg_Idle_Duration_Days: Math.round(avgIdleDuration * 100) / 100,
    Is_Static: isStatic,
    Last_Movement_Date:
      cowMovements.length > 0 &&
      cowMovements[cowMovements.length - 1].Reached_DateTime
        ? cowMovements[cowMovements.length - 1].Reached_DateTime.split("T")[0]
        : undefined,
    Regions_Served: regionsServed,
    Top_Event_Type: topEventType,
  };
}

// Calculate warehouse metrics
export function calculateWarehouseMetrics(
  locationId: string,
  movements: CowMovementsFact[],
  locations: DimLocation[],
): WarehouseMetrics | null {
  const location = locations.find((l) => l.Location_ID === locationId);

  // Check if it's a warehouse - either by type or if the name contains "WH"
  const isWarehouse =
    location &&
    (location.Location_Type === "Warehouse" ||
      location.Location_Name.toUpperCase().includes("WH"));

  if (!location || !isWarehouse) return null;

  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));
  const outgoing = movements.filter((m) => m.From_Location_ID === locationId);
  const incoming = movements.filter((m) => m.To_Location_ID === locationId);

  const outgoingDistance = outgoing.reduce(
    (sum, m) => sum + (m.Distance_KM || 0),
    0,
  );
  const incomingDistance = incoming.reduce(
    (sum, m) => sum + (m.Distance_KM || 0),
    0,
  );

  const topRegionsServed = Array.from(
    outgoing.reduce((acc, m) => {
      const toLoc = locMap.get(m.To_Location_ID);
      if (toLoc) {
        const region = toLoc.Region;
        acc.set(region, (acc.get(region) || 0) + 1);
      }
      return acc;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([region, count]) => ({ Region: region, Count: count }));

  // Idle accumulation (time spent in warehouse)
  let idleAccumulation = 0;
  const warehouseStays: Array<{ from: number; to: number }> = [];

  incoming.forEach((incomingMov) => {
    const outgoingMov = outgoing.find(
      (m) =>
        m.COW_ID === incomingMov.COW_ID &&
        new Date(m.Moved_DateTime) > new Date(incomingMov.Reached_DateTime),
    );

    if (outgoingMov) {
      const stay =
        (new Date(outgoingMov.Moved_DateTime).getTime() -
          new Date(incomingMov.Reached_DateTime).getTime()) /
        (1000 * 60 * 60 * 24);
      warehouseStays.push({
        from: new Date(incomingMov.Reached_DateTime).getTime(),
        to: new Date(outgoingMov.Moved_DateTime).getTime(),
      });
      idleAccumulation += stay;
    }
  });

  return {
    Location_ID: locationId,
    Location_Name: location.Location_Name,
    Outgoing_Movements: outgoing.length,
    Avg_Outgoing_Distance:
      outgoing.length > 0
        ? Math.round((outgoingDistance / outgoing.length) * 100) / 100
        : 0,
    Top_Regions_Served: topRegionsServed,
    Incoming_Movements: incoming.length,
    Avg_Incoming_Distance:
      incoming.length > 0
        ? Math.round((incomingDistance / incoming.length) * 100) / 100
        : 0,
    Idle_Accumulation_Days: Math.round(idleAccumulation * 100) / 100,
  };
}

// Calculate region metrics
export function calculateRegionMetrics(
  region: string,
  cows: DimCow[],
  locations: DimLocation[],
  movements: CowMovementsFact[],
  cowMetrics: COWMetrics[],
): RegionMetrics {
  const regionLocations = locations.filter((l) => l.Region === region);
  const regionMovements = movements.filter(
    (m) =>
      regionLocations.some((l) => l.Location_ID === m.To_Location_ID) ||
      regionLocations.some((l) => l.Location_ID === m.From_Location_ID),
  );

  const cowsDeployedInRegion = Array.from(
    new Set(
      regionMovements
        .filter(
          (m) =>
            locations.find((l) => l.Location_ID === m.To_Location_ID)
              ?.Region === region,
        )
        .map((m) => m.COW_ID),
    ),
  );

  const activeCOWs = cowsDeployedInRegion.filter(
    (cowId) => !cowMetrics.find((m) => m.COW_ID === cowId)?.Is_Static,
  ).length;

  const staticCOWs = cowsDeployedInRegion.filter(
    (cowId) => cowMetrics.find((m) => m.COW_ID === cowId)?.Is_Static,
  ).length;

  const crossRegionMovements = regionMovements.filter((m) => {
    const fromLoc = locations.find((l) => l.Location_ID === m.From_Location_ID);
    const toLoc = locations.find((l) => l.Location_ID === m.To_Location_ID);
    return fromLoc?.Region !== toLoc?.Region;
  }).length;

  const totalDistance = regionMovements.reduce(
    (sum, m) => sum + (m.Distance_KM || 0),
    0,
  );

  // Average deployment duration per region
  const deploymentDurations: number[] = [];
  regionMovements.forEach((mov) => {
    if (mov.Movement_Type === "Full") {
      const duration =
        (new Date(mov.Reached_DateTime).getTime() -
          new Date(mov.Moved_DateTime).getTime()) /
        (1000 * 60 * 60 * 24);
      deploymentDurations.push(duration);
    }
  });

  const avgDeploymentDuration =
    deploymentDurations.length > 0
      ? deploymentDurations.reduce((a, b) => a + b, 0) /
        deploymentDurations.length
      : 0;

  return {
    Region: region as any,
    Total_COWs_Deployed: cowsDeployedInRegion.length,
    Active_COWs: activeCOWs,
    Static_COWs: staticCOWs,
    Cross_Region_Movements: crossRegionMovements,
    Total_Distance_KM: Math.round(totalDistance * 100) / 100,
    Avg_Deployment_Duration_Days: Math.round(avgDeploymentDuration * 100) / 100,
  };
}

// Filter movements based on dashboard filters
export function filterMovements(
  movements: CowMovementsFact[],
  filters: DashboardFilters,
  locations: DimLocation[],
  cows?: DimCow[],
): CowMovementsFact[] {
  return movements.filter((mov) => {
    // Filter by year
    if (filters.year) {
      const movYear = new Date(mov.Moved_DateTime).getFullYear();
      if (movYear !== filters.year) return false;
    }

    // Filter by region
    if (filters.region) {
      const toLoc = locations.find((l) => l.Location_ID === mov.To_Location_ID);
      if (toLoc?.Region !== filters.region) return false;
    }

    // Filter by vendor
    if (filters.vendor && cows) {
      const cow = cows.find((c) => c.COW_ID === mov.COW_ID);
      if (cow?.Vendor !== filters.vendor) return false;
    }

    // Filter by movement type
    if (filters.movementType && mov.Movement_Type !== filters.movementType)
      return false;

    // Filter by event type
    if (filters.eventType && mov.Event_ID) {
      // Would need event lookup, simplified for now
      return true;
    }

    return true;
  });
}

// Calculate all KPIs
export function calculateKPIs(
  movements: CowMovementsFact[],
  cows: DimCow[],
  locations: DimLocation[],
  cowMetrics: COWMetrics[],
) {
  const totalCOWs = cows.length;
  const totalMovements = movements.length;
  const totalDistanceKM =
    Math.round(
      movements.reduce((sum, m) => sum + (m.Distance_KM || 0), 0) * 100,
    ) / 100;

  const activeCOWs = cowMetrics.filter((m) => !m.Is_Static).length;
  const staticCOWs = cowMetrics.filter((m) => m.Is_Static).length;
  const avgMovesPerCOW =
    totalCOWs > 0 ? Math.round((totalMovements / totalCOWs) * 100) / 100 : 0;

  return {
    totalCOWs,
    totalMovements,
    totalDistanceKM,
    activeCOWs,
    staticCOWs,
    avgMovesPerCOW,
  };
}

// Calculate warehouse hub time - stay duration at each warehouse
export function calculateWarehouseHubTime(
  movements: CowMovementsFact[],
  locations: DimLocation[],
): WarehouseHubTimeData[] {
  const hubTimes: WarehouseHubTimeData[] = [];
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));

  // Group movements by COW ID
  const movementsByCow = new Map<string, CowMovementsFact[]>();
  movements.forEach((mov) => {
    if (!movementsByCow.has(mov.COW_ID)) {
      movementsByCow.set(mov.COW_ID, []);
    }
    movementsByCow.get(mov.COW_ID)!.push(mov);
  });

  // For each COW, sort by Moved_DateTime and calculate stay durations
  movementsByCow.forEach((cowMovements, cowId) => {
    // Sort by Moved_DateTime to get chronological order
    const sorted = [...cowMovements].sort(
      (a, b) =>
        new Date(a.Moved_DateTime).getTime() -
        new Date(b.Moved_DateTime).getTime(),
    );

    // Calculate stay duration for each movement (except the last)
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentMovement = sorted[i];
      const nextMovement = sorted[i + 1];

      // The warehouse where COW stayed is the To_Location of current movement
      const warehouseId = currentMovement.To_Location_ID;
      const warehouse = locMap.get(warehouseId);

      if (warehouse) {
        // Calculate stay duration: from Reached_DateTime to next Moved_DateTime
        const arrivalTime = new Date(
          currentMovement.Reached_DateTime,
        ).getTime();
        const departureTime = new Date(nextMovement.Moved_DateTime).getTime();
        const stayDays = (departureTime - arrivalTime) / (1000 * 60 * 60 * 24);

        // Only record positive stays
        if (stayDays > 0) {
          hubTimes.push({
            cowId,
            warehouseName: warehouse.Location_Name,
            stayDays: Math.round(stayDays * 100) / 100,
            arrivalDate: currentMovement.Reached_DateTime
              ? currentMovement.Reached_DateTime.split("T")[0]
              : "",
            departureDate: nextMovement.Moved_DateTime
              ? nextMovement.Moved_DateTime.split("T")[0]
              : "",
          });
        }
      }
    }
  });

  return hubTimes;
}

// Get top COWs by total stay days
export function getTopCowsByStayDays(
  hubTimes: WarehouseHubTimeData[],
  limit: number = 10,
): COWStayDays[] {
  const cowTotals = new Map<string, number>();

  hubTimes.forEach((ht) => {
    cowTotals.set(ht.cowId, (cowTotals.get(ht.cowId) || 0) + ht.stayDays);
  });

  return Array.from(cowTotals.entries())
    .map(([cowId, totalStayDays]) => ({
      cowId,
      totalStayDays: Math.round(totalStayDays * 100) / 100,
    }))
    .sort((a, b) => b.totalStayDays - a.totalStayDays)
    .slice(0, limit);
}

// Get average stay days per warehouse
export function getAverageStayPerWarehouse(
  hubTimes: WarehouseHubTimeData[],
): WarehouseAvgStay[] {
  const warehouseStats = new Map<
    string,
    { totalStayDays: number; stayCount: number }
  >();

  hubTimes.forEach((ht) => {
    if (!warehouseStats.has(ht.warehouseName)) {
      warehouseStats.set(ht.warehouseName, {
        totalStayDays: 0,
        stayCount: 0,
      });
    }

    const stats = warehouseStats.get(ht.warehouseName)!;
    stats.totalStayDays += ht.stayDays;
    stats.stayCount += 1;
  });

  return Array.from(warehouseStats.entries())
    .map(([warehouseName, stats]) => ({
      warehouseName,
      avgStayDays:
        Math.round((stats.totalStayDays / stats.stayCount) * 100) / 100,
      totalStayDays: Math.round(stats.totalStayDays * 100) / 100,
      stayCount: stats.stayCount,
    }))
    .sort((a, b) => b.avgStayDays - a.avgStayDays);
}

// Get warehouses with highest total stay days
export function getWarehousesHighestTotalStay(
  hubTimes: WarehouseHubTimeData[],
  limit: number = 10,
): WarehouseTotalStay[] {
  const warehouseTotals = new Map<string, number>();

  hubTimes.forEach((ht) => {
    warehouseTotals.set(
      ht.warehouseName,
      (warehouseTotals.get(ht.warehouseName) || 0) + ht.stayDays,
    );
  });

  return Array.from(warehouseTotals.entries())
    .map(([warehouseName, totalStayDays]) => ({
      warehouseName,
      totalStayDays: Math.round(totalStayDays * 100) / 100,
    }))
    .sort((a, b) => b.totalStayDays - a.totalStayDays)
    .slice(0, limit);
}

// ============================================================================
// OFF-AIR WAREHOUSE AGING ANALYTICS (HARD DELETE + REBUILD)
// ============================================================================
// This section implements the "Off-Air Warehouse Aging" dashboard.
// ABSOLUTE RULES:
// 1. Only include movements where Column Z = "Half" OR "Zero"
// 2. Calculate idle time between consecutive movements
// 3. Count idle time ONLY when:
//    - COW is off-air (Column Z = Half or Zero)
//    - To Location (Column U) is a warehouse
// 4. Bucket by months (0-3, 4-6, 7-9, 10-12, >12)
// ============================================================================

export interface OffAirAgingBucket {
  bucket:
    | "0-3 Months"
    | "4-6 Months"
    | "7-9 Months"
    | "10-12 Months"
    | "More than 12 Months";
  count: number; // Count of unique COW IDs
}

export interface OffAirAgingTableRow {
  cowId: string;
  totalMovementTimes: number;
  avgOffAirIdleDays: number;
  topOffAirWarehouse: string;
}

export interface OffAirStayDetails {
  fromLocation: string;
  toWarehouse: string;
  idleStartDate: string;
  idleEndDate: string;
  idleDays: number;
}

// Calculate OFF-AIR warehouse aging (STRICT: Column Z = Half/Zero only)
export function calculateOffAirWarehouseAging(
  movements: CowMovementsFact[],
  locations: DimLocation[],
): {
  buckets: OffAirAgingBucket[];
  tableData: OffAirAgingTableRow[];
  cowAgingMap: Map<string, number>; // cowId -> total idle months
  bucketCows: Map<string, string[]>; // bucket name -> array of cow IDs
} {
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));

  // STEP 1: Filter ONLY rows where Column Z = "Half" OR "Zero"
  const offAirMovements = movements.filter(
    (mov) => mov.Movement_Type === "Half" || mov.Movement_Type === "Zero",
  );

  // STEP 2: Group movements by COW ID and sort by Moved_DateTime
  const movementsByCow = new Map<string, CowMovementsFact[]>();
  offAirMovements.forEach((mov) => {
    if (!movementsByCow.has(mov.COW_ID)) {
      movementsByCow.set(mov.COW_ID, []);
    }
    movementsByCow.get(mov.COW_ID)!.push(mov);
  });

  // Sort each COW's movements by Moved_DateTime
  movementsByCow.forEach((movements) => {
    movements.sort(
      (a, b) =>
        new Date(a.Moved_DateTime).getTime() -
        new Date(b.Moved_DateTime).getTime(),
    );
  });

  // STEP 3: Calculate idle days per COW
  const cowIdleTotals = new Map<string, number>(); // cowId -> total idle days
  const cowMovementCounts = new Map<string, number>(); // cowId -> movement count
  const cowWarehouseBreakdown = new Map<string, Map<string, number>>(); // cowId -> (warehouse -> idle days)
  const cowStayDetails = new Map<string, OffAirStayDetails[]>(); // cowId -> stay details

  movementsByCow.forEach((movements, cowId) => {
    let totalIdleDays = 0;
    const warehouseMap = new Map<string, number>();
    const stayDetails: OffAirStayDetails[] = [];

    // Calculate idle time between consecutive movements
    for (let i = 0; i < movements.length - 1; i++) {
      const currentMov = movements[i];
      const nextMov = movements[i + 1];

      // Get the warehouse (To_Location of current movement)
      const warehouse = locMap.get(currentMov.To_Location_ID);

      // CRITICAL: Only count idle time if To Location is a warehouse
      if (!warehouse) continue;

      // Verify it's actually a warehouse
      const isWarehouse =
        warehouse.Location_Type === "Warehouse" ||
        warehouse.Location_Name.toUpperCase().includes("WH");

      if (!isWarehouse) continue;

      // Calculate idle days: Reached_DateTime of current to Moved_DateTime of next
      const idleStart = new Date(currentMov.Reached_DateTime).getTime();
      const idleEnd = new Date(nextMov.Moved_DateTime).getTime();
      const idleDays = (idleEnd - idleStart) / (1000 * 60 * 60 * 24);

      if (idleDays > 0) {
        totalIdleDays += idleDays;

        // Track warehouse breakdown
        warehouseMap.set(
          warehouse.Location_Name,
          (warehouseMap.get(warehouse.Location_Name) || 0) + idleDays,
        );

        // Store stay details
        stayDetails.push({
          fromLocation: currentMov.From_Sub_Location || "Unknown",
          toWarehouse: warehouse.Location_Name,
          idleStartDate: currentMov.Reached_DateTime
            ? currentMov.Reached_DateTime.split("T")[0]
            : "",
          idleEndDate: nextMov.Moved_DateTime
            ? nextMov.Moved_DateTime.split("T")[0]
            : "",
          idleDays: Math.round(idleDays * 100) / 100,
        });
      }
    }

    // Store results
    if (totalIdleDays > 0) {
      cowIdleTotals.set(cowId, totalIdleDays);
      cowMovementCounts.set(cowId, movements.length);
      cowWarehouseBreakdown.set(cowId, warehouseMap);
      cowStayDetails.set(cowId, stayDetails);
    }
  });

  // STEP 4: Create aging buckets (convert days to months: ÷ 30)
  const bucketCounts = new Map<
    | "0-3 Months"
    | "4-6 Months"
    | "7-9 Months"
    | "10-12 Months"
    | "More than 12 Months",
    Set<string>
  >();
  bucketCounts.set("0-3 Months", new Set());
  bucketCounts.set("4-6 Months", new Set());
  bucketCounts.set("7-9 Months", new Set());
  bucketCounts.set("10-12 Months", new Set());
  bucketCounts.set("More than 12 Months", new Set());

  const cowAgingMap = new Map<string, number>();

  cowIdleTotals.forEach((idleDays, cowId) => {
    const months = idleDays / 30;
    cowAgingMap.set(cowId, months);

    // Assign to bucket
    if (months <= 3) {
      bucketCounts.get("0-3 Months")!.add(cowId);
    } else if (months <= 6) {
      bucketCounts.get("4-6 Months")!.add(cowId);
    } else if (months <= 9) {
      bucketCounts.get("7-9 Months")!.add(cowId);
    } else if (months <= 12) {
      bucketCounts.get("10-12 Months")!.add(cowId);
    } else {
      bucketCounts.get("More than 12 Months")!.add(cowId);
    }
  });

  // STEP 5: Build bucket array for chart
  const buckets: OffAirAgingBucket[] = [
    {
      bucket: "0-3 Months",
      count: bucketCounts.get("0-3 Months")!.size,
    },
    {
      bucket: "4-6 Months",
      count: bucketCounts.get("4-6 Months")!.size,
    },
    {
      bucket: "7-9 Months",
      count: bucketCounts.get("7-9 Months")!.size,
    },
    {
      bucket: "10-12 Months",
      count: bucketCounts.get("10-12 Months")!.size,
    },
    {
      bucket: "More than 12 Months",
      count: bucketCounts.get("More than 12 Months")!.size,
    },
  ];

  // STEP 6: Build table data
  const tableData: OffAirAgingTableRow[] = Array.from(cowIdleTotals.entries())
    .map(([cowId, totalIdleDays]) => {
      const movements = movementsByCow.get(cowId) || [];
      const avgIdleDays =
        movements.length > 1
          ? Math.round((totalIdleDays / (movements.length - 1)) * 100) / 100
          : 0;

      // Find top warehouse
      const warehouseMap = cowWarehouseBreakdown.get(cowId) || new Map();
      let topWarehouse = "N/A";
      let maxDays = 0;
      warehouseMap.forEach((days, warehouse) => {
        if (days > maxDays) {
          maxDays = days;
          topWarehouse = warehouse;
        }
      });

      return {
        cowId,
        totalMovementTimes: movements.length,
        avgOffAirIdleDays: avgIdleDays,
        topOffAirWarehouse: topWarehouse,
      };
    })
    .sort((a, b) => b.avgOffAirIdleDays - a.avgOffAirIdleDays);

  // Convert Sets to Arrays for easier use
  const bucketCowsMap = new Map<string, string[]>();
  bucketCounts.forEach((cowSet, bucketName) => {
    bucketCowsMap.set(bucketName, Array.from(cowSet).sort());
  });

  return {
    buckets,
    tableData,
    cowAgingMap,
    bucketCows: bucketCowsMap,
  };
}

// Get detailed stay information for a specific COW
export function getCOWOffAirAgingDetails(
  cowId: string,
  movements: CowMovementsFact[],
  locations: DimLocation[],
): {
  totalMovements: number;
  totalOffAirIdleDays: number;
  avgOffAirIdleDays: number;
  topOffAirWarehouse: string;
  stays: OffAirStayDetails[];
} {
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));

  // Filter movements for this COW where Column Z = Half/Zero
  const cowOffAirMovements = movements
    .filter(
      (m) =>
        m.COW_ID === cowId &&
        (m.Movement_Type === "Half" || m.Movement_Type === "Zero"),
    )
    .sort(
      (a, b) =>
        new Date(a.Moved_DateTime).getTime() -
        new Date(b.Moved_DateTime).getTime(),
    );

  let totalIdleDays = 0;
  const warehouseMap = new Map<string, number>();
  const stays: OffAirStayDetails[] = [];

  // Calculate idle days
  for (let i = 0; i < cowOffAirMovements.length - 1; i++) {
    const currentMov = cowOffAirMovements[i];
    const nextMov = cowOffAirMovements[i + 1];

    const warehouse = locMap.get(currentMov.To_Location_ID);
    if (!warehouse) continue;

    const isWarehouse =
      warehouse.Location_Type === "Warehouse" ||
      warehouse.Location_Name.toUpperCase().includes("WH");
    if (!isWarehouse) continue;

    const idleStart = new Date(currentMov.Reached_DateTime).getTime();
    const idleEnd = new Date(nextMov.Moved_DateTime).getTime();
    const idleDays = (idleEnd - idleStart) / (1000 * 60 * 60 * 24);

    if (idleDays > 0) {
      totalIdleDays += idleDays;
      warehouseMap.set(
        warehouse.Location_Name,
        (warehouseMap.get(warehouse.Location_Name) || 0) + idleDays,
      );

      stays.push({
        fromLocation: currentMov.From_Sub_Location || "Unknown",
        toWarehouse: warehouse.Location_Name,
        idleStartDate: currentMov.Reached_DateTime
          ? currentMov.Reached_DateTime.split("T")[0]
          : "",
        idleEndDate: nextMov.Moved_DateTime
          ? nextMov.Moved_DateTime.split("T")[0]
          : "",
        idleDays: Math.round(idleDays * 100) / 100,
      });
    }
  }

  // Find top warehouse
  let topWarehouse = "N/A";
  let maxDays = 0;
  warehouseMap.forEach((days, warehouse) => {
    if (days > maxDays) {
      maxDays = days;
      topWarehouse = warehouse;
    }
  });

  const avgIdleDays =
    cowOffAirMovements.length > 1
      ? Math.round((totalIdleDays / (cowOffAirMovements.length - 1)) * 100) /
        100
      : 0;

  return {
    totalMovements: cowOffAirMovements.length,
    totalOffAirIdleDays: Math.round(totalIdleDays * 100) / 100,
    avgOffAirIdleDays: avgIdleDays,
    topOffAirWarehouse: topWarehouse,
    stays,
  };
}

// Top Events Movement Analytics
export interface TopEventData {
  eventName: string;
  movementCount: number;
  percentage: number;
}

export function calculateTopEvents(
  movements: CowMovementsFact[],
): TopEventData[] {
  // Map from normalized key -> { canonicalName, count }
  const eventMap = new Map<string, { canonicalName: string; count: number }>();

  // Filter and aggregate events
  movements.forEach((mov) => {
    const event = mov.Top_Event || mov.To_Sub_Location;
    if (!event) return;

    // Normalize: trim, lowercase for comparison
    const trimmedEvent = event.trim();
    const normalizedKey = trimmedEvent.toLowerCase();

    // Exclude WH, Others, #N/A, and blank entries
    if (
      normalizedKey === "wh" ||
      normalizedKey === "others" ||
      normalizedKey === "other" ||
      normalizedKey === "#n/a" ||
      normalizedKey === ""
    ) {
      return;
    }

    // Get or create entry
    if (!eventMap.has(normalizedKey)) {
      eventMap.set(normalizedKey, {
        canonicalName: trimmedEvent, // Store first occurrence with original casing
        count: 0,
      });
    }

    // Increment count
    const entry = eventMap.get(normalizedKey)!;
    entry.count += 1;
  });

  // Calculate total for percentage
  const totalMovements = Array.from(eventMap.values()).reduce(
    (sum, entry) => sum + entry.count,
    0,
  );

  // Convert to array and sort by count descending
  const eventData: TopEventData[] = Array.from(eventMap.entries())
    .map(([, { canonicalName, count }]) => ({
      eventName: canonicalName,
      movementCount: count,
      percentage:
        totalMovements > 0
          ? Math.round((count / totalMovements) * 10000) / 100
          : 0,
    }))
    .sort((a, b) => b.movementCount - a.movementCount)
    .slice(0, 10); // Keep top 10 only

  return eventData;
}

// Calculate total movements across all events (excluding WH, Others, #N/A, blanks)
export function calculateAllEventsTotalMovements(
  movements: CowMovementsFact[],
): number {
  let totalCount = 0;

  movements.forEach((mov) => {
    const event = mov.Top_Event || mov.To_Sub_Location;
    if (!event) return;

    // Normalize: trim, lowercase for comparison
    const trimmedEvent = event.trim();
    const normalizedKey = trimmedEvent.toLowerCase();

    // Exclude WH, Others, #N/A, and blank entries
    if (
      normalizedKey === "wh" ||
      normalizedKey === "others" ||
      normalizedKey === "other" ||
      normalizedKey === "#n/a" ||
      normalizedKey === ""
    ) {
      return;
    }

    // Count this movement
    totalCount += 1;
  });

  return totalCount;
}
