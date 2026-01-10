// Dimension: Cow details
export interface DimCow {
  COW_ID: string;
  Tower_Type: "Macro" | "Small Cell" | "Micro Cell";
  Tower_Height: number; // in meters
  Network_2G: boolean;
  Network_4G: boolean;
  Network_5G: boolean;
  Shelter_Type: "Shelter" | "Outdoor";
  Vendor: string;
  Installation_Date: string; // ISO date
  Last_Deploy_Date?: string; // ISO date - Column C from Google Sheet
  First_Deploy_Date?: string; // ISO date - Column D from Google Sheet
  Remarks?: string; // Column AE from Google Sheet
}

// Dimension: Location details
export interface DimLocation {
  Location_ID: string;
  Location_Name: string;
  Sub_Location?: string;
  Latitude: number;
  Longitude: number;
  Region: "WEST" | "EAST" | "CENTRAL" | "SOUTH";
  Location_Type: "Site" | "Warehouse";
  Owner: "STC" | "ACES";
}

// Dimension: Event type (derived from rules)
export type EventType =
  | "Hajj"
  | "Umrah"
  | "Royal"
  | "National Event"
  | "Seasonal"
  | "Normal Coverage";

export interface DimEvent {
  Event_ID: string;
  Event_Type: EventType;
  Description: string;
  Start_Date: string; // ISO date
  End_Date: string; // ISO date
}

// Movement Classification
export type MovementType = "Full" | "Half" | "Zero";

// Fact Table: Cow Movements (Immutable, Append-only)
export interface CowMovementsFact {
  SN: number; // Serial Number
  COW_ID: string;
  From_Location_ID: string;
  To_Location_ID: string;
  Moved_DateTime: string; // ISO datetime
  Reached_DateTime: string; // ISO datetime
  Movement_Type?: MovementType;
  Event_ID?: string;
  Distance_KM?: number;
  Is_Royal?: boolean;
  Is_EBU?: boolean;
}

// Analytics: COW aggregated metrics
export interface COWMetrics {
  COW_ID: string;
  Total_Movements: number;
  Total_Distance_KM: number;
  Avg_Distance_Per_Move: number;
  Movement_Mix: {
    Full: number;
    Half: number;
    Zero: number;
  };
  Avg_Idle_Duration_Days: number;
  Is_Static: boolean;
  Last_Movement_Date?: string;
  Regions_Served: string[];
  Top_Event_Type?: EventType;
}

// Analytics: Warehouse insights
export interface WarehouseMetrics {
  Location_ID: string;
  Location_Name: string;
  Outgoing_Movements: number;
  Avg_Outgoing_Distance: number;
  Top_Regions_Served: Array<{ Region: string; Count: number }>;
  Incoming_Movements: number;
  Avg_Incoming_Distance: number;
  Idle_Accumulation_Days: number;
}

// Analytics: Region insights
export interface RegionMetrics {
  Region: "WEST" | "EAST" | "CENTRAL" | "SOUTH";
  Total_COWs_Deployed: number;
  Active_COWs: number;
  Static_COWs: number;
  Cross_Region_Movements: number;
  Total_Distance_KM: number;
  Avg_Deployment_Duration_Days: number;
}

// Aggregated Dashboard State
export interface DashboardData {
  movements: CowMovementsFact[];
  cows: DimCow[];
  locations: DimLocation[];
  events: DimEvent[];
  cowMetrics: COWMetrics[];
  warehouseMetrics: WarehouseMetrics[];
  regionMetrics: RegionMetrics[];
  kpis: {
    totalCOWs: number;
    totalMovements: number;
    totalDistanceKM: number;
    activeCOWs: number;
    staticCOWs: number;
    avgMovesPerCOW: number;
  };
}

// Filter state
export interface DashboardFilters {
  year?: number;
  region?: string;
  vendor?: string;
  movementType?: MovementType;
  eventType?: EventType;
}
