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
    const fromLoc = locMap.get(mov.From_Location_ID);
    const toLoc = locMap.get(mov.To_Location_ID);

    // Use the original Movement_Type from Google Sheet if available
    // Otherwise, classify based on location types
    const movementType = mov.Movement_Type || classifyMovement(mov, locMap);

    const distance =
      fromLoc && toLoc
        ? calculateDistance(
            fromLoc.Latitude,
            fromLoc.Longitude,
            toLoc.Latitude,
            toLoc.Longitude,
          )
        : 0;

    return {
      ...mov,
      Movement_Type: movementType,
      Distance_KM: distance,
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
      cowMovements.length > 0
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
