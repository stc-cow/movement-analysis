import {
  DimCow,
  DimLocation,
  DimEvent,
  CowMovementsFact,
  EventType,
} from "@shared/models";

const VENDORS = [
  "Ericsson",
  "Nokia",
  "Huawei",
  "Samsung",
  "ZTE",
  "Cisco",
  "Qualcomm",
];
const REGIONS = ["WEST", "EAST", "CENTRAL", "SOUTH"] as const;
const EVENT_TYPES: EventType[] = [
  "Hajj",
  "Umrah",
  "Royal",
  "National Event",
  "Seasonal",
  "Normal Coverage",
];

export function generateMockCows(count: number): DimCow[] {
  const cows: DimCow[] = [];
  for (let i = 1; i <= count; i++) {
    cows.push({
      COW_ID: `COW-${String(i).padStart(4, "0")}`,
      Tower_Type: ["Macro", "Small Cell", "Micro Cell"][
        Math.floor(Math.random() * 3)
      ] as "Macro" | "Small Cell" | "Micro Cell",
      Tower_Height: Math.floor(Math.random() * 30) + 10,
      Network_2G: Math.random() > 0.3,
      Network_4G: Math.random() > 0.2,
      Network_5G: Math.random() > 0.7,
      Shelter_Type: Math.random() > 0.4 ? "Shelter" : "Outdoor",
      Vendor: VENDORS[Math.floor(Math.random() * VENDORS.length)],
      Installation_Date: new Date(
        2020 + Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1,
      )
        .toISOString()
        .split("T")[0],
    });
  }
  return cows;
}

export function generateMockLocations(): DimLocation[] {
  const locations: DimLocation[] = [
    // Warehouses
    {
      Location_ID: "WH-RYD-001",
      Location_Name: "Riyadh Central Warehouse",
      Sub_Location: "Industrial Zone",
      Latitude: 24.7136,
      Longitude: 46.6753,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-JED-001",
      Location_Name: "Jeddah Port Warehouse",
      Sub_Location: "Port Authority",
      Latitude: 21.5433,
      Longitude: 39.172,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-DHR-001",
      Location_Name: "Dammam Regional Warehouse",
      Sub_Location: "Eastern Province",
      Latitude: 26.4384,
      Longitude: 50.1972,
      Region: "EAST",
      Location_Type: "Warehouse",
      Owner: "ACES",
    },
    {
      Location_ID: "WH-ABS-001",
      Location_Name: "Abha Central Warehouse",
      Sub_Location: "Asir Province",
      Latitude: 18.2164,
      Longitude: 42.5053,
      Region: "SOUTH",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-HA-001",
      Location_Name: "Ha'il Distribution Center",
      Sub_Location: "North Central Region",
      Latitude: 27.3212,
      Longitude: 41.7269,
      Region: "NORTH",
      Location_Type: "Warehouse",
      Owner: "ACES",
    },

    // Sites - Mecca & Medina (Hajj/Umrah)
    {
      Location_ID: "SITE-MECCA-001",
      Location_Name: "Mecca Central Site",
      Sub_Location: "Hajj Terminal",
      Latitude: 21.4225,
      Longitude: 39.8262,
      Region: "WEST",
      Location_Type: "Site",
      Owner: "STC",
    },
    {
      Location_ID: "SITE-MEDINA-001",
      Location_Name: "Medina Prophet's Mosque Site",
      Sub_Location: "Holy Mosque Area",
      Latitude: 24.4672,
      Longitude: 39.6069,
      Region: "WEST",
      Location_Type: "Site",
      Owner: "STC",
    },

    // Royal Sites
    {
      Location_ID: "SITE-PALACE-RYD",
      Location_Name: "Royal Palace - Riyadh",
      Sub_Location: "Government District",
      Latitude: 24.6881,
      Longitude: 46.7219,
      Region: "CENTRAL",
      Location_Type: "Site",
      Owner: "STC",
    },
    {
      Location_ID: "SITE-PALACE-JED",
      Location_Name: "Royal Palace - Jeddah",
      Sub_Location: "Coastal District",
      Latitude: 21.6533,
      Longitude: 39.1835,
      Region: "WEST",
      Location_Type: "Site",
      Owner: "STC",
    },

    // National Events
    {
      Location_ID: "SITE-EXPO-RYD",
      Location_Name: "Saudi Expo 2030 Site",
      Sub_Location: "Exhibition Grounds",
      Latitude: 24.8277,
      Longitude: 46.6915,
      Region: "CENTRAL",
      Location_Type: "Site",
      Owner: "ACES",
    },
    {
      Location_ID: "SITE-GULF-JED",
      Location_Name: "Gulf Cup Stadium Site",
      Sub_Location: "Sports Complex",
      Latitude: 21.4569,
      Longitude: 39.1847,
      Region: "WEST",
      Location_Type: "Site",
      Owner: "STC",
    },

    // Regular Sites across regions
    {
      Location_ID: "SITE-KHOBAR",
      Location_Name: "Khobar Business District",
      Latitude: 26.1624,
      Longitude: 50.2046,
      Region: "EAST",
      Location_Type: "Site",
      Owner: "ACES",
    },
    {
      Location_ID: "SITE-BURAIDAH",
      Location_Name: "Buraidah City Center",
      Latitude: 26.3263,
      Longitude: 43.975,
      Region: "NORTH",
      Location_Type: "Site",
      Owner: "STC",
    },
    {
      Location_ID: "SITE-ABHA-DOWNTOWN",
      Location_Name: "Abha Downtown Site",
      Latitude: 18.2089,
      Longitude: 42.5086,
      Region: "SOUTH",
      Location_Type: "Site",
      Owner: "ACES",
    },
  ];
  return locations;
}

export function generateMockEvents(): DimEvent[] {
  return [
    {
      Event_ID: "EV-HAJJ-2023",
      Event_Type: "Hajj",
      Description: "Annual Hajj Season 2023",
      Start_Date: "2023-06-01",
      End_Date: "2023-07-15",
    },
    {
      Event_ID: "EV-HAJJ-2024",
      Event_Type: "Hajj",
      Description: "Annual Hajj Season 2024",
      Start_Date: "2024-05-20",
      End_Date: "2024-07-01",
    },
    {
      Event_ID: "EV-UMRAH-RAMADAN-2023",
      Event_Type: "Umrah",
      Description: "Ramadan Umrah Season 2023",
      Start_Date: "2023-03-22",
      End_Date: "2023-04-21",
    },
    {
      Event_ID: "EV-ROYAL-STATE-VISIT",
      Event_Type: "Royal",
      Description: "Royal State Visit Coverage",
      Start_Date: "2023-10-10",
      End_Date: "2023-10-15",
    },
    {
      Event_ID: "EV-NATIONAL-DAY-2023",
      Event_Type: "National Event",
      Description: "Saudi National Day Celebrations",
      Start_Date: "2023-09-20",
      End_Date: "2023-09-25",
    },
  ];
}

export function generateMockMovements(
  cowIds: string[],
  locationIds: string[],
  eventIds: string[],
  count: number,
): CowMovementsFact[] {
  const movements: CowMovementsFact[] = [];

  for (let i = 1; i <= count; i++) {
    const from = locationIds[Math.floor(Math.random() * locationIds.length)];
    const to = locationIds[Math.floor(Math.random() * locationIds.length)];

    if (from === to) continue;

    const movedDate = new Date(
      2019 + Math.floor(Math.random() * 5),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
      Math.floor(Math.random() * 24),
      Math.floor(Math.random() * 60),
    );

    const reachedDate = new Date(
      movedDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000,
    );

    const isRoyal = Math.random() > 0.95;
    const isEBU = Math.random() > 0.7;
    const eventId =
      Math.random() > 0.6
        ? eventIds[Math.floor(Math.random() * eventIds.length)]
        : undefined;

    movements.push({
      SN: i,
      COW_ID: cowIds[Math.floor(Math.random() * cowIds.length)],
      From_Location_ID: from,
      To_Location_ID: to,
      Moved_DateTime: movedDate.toISOString(),
      Reached_DateTime: reachedDate.toISOString(),
      Event_ID: eventId,
      Distance_KM: Math.floor(Math.random() * 1000) + 50,
      Is_Royal: isRoyal,
      Is_EBU: isEBU,
    });
  }

  return movements.sort(
    (a, b) =>
      new Date(a.Moved_DateTime).getTime() -
      new Date(b.Moved_DateTime).getTime(),
  );
}

export function generateMockDatabase() {
  const cows = generateMockCows(150);
  const locations = generateMockLocations();
  const events = generateMockEvents();
  const movements = generateMockMovements(
    cows.map((c) => c.COW_ID),
    locations.map((l) => l.Location_ID),
    events.map((e) => e.Event_ID),
    2500,
  );

  return { cows, locations, events, movements };
}
