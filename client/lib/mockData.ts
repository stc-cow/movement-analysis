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
    // Warehouses - Real Master Data
    {
      Location_ID: "WH-ALULA-001",
      Location_Name: "STC WH Al Ula",
      Sub_Location: "North West Region",
      Latitude: 26.613083,
      Longitude: 37.924500,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-DAMMAM-001",
      Location_Name: "ACES Dammam WH",
      Sub_Location: "Eastern Province",
      Latitude: 26.201540,
      Longitude: 49.947480,
      Region: "EAST",
      Location_Type: "Warehouse",
      Owner: "ACES",
    },
    {
      Location_ID: "WH-MAKKAH-001",
      Location_Name: "ACES Makkah WH",
      Sub_Location: "Holy City Region",
      Latitude: 21.603880,
      Longitude: 39.787548,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "ACES",
    },
    {
      Location_ID: "WH-MUZAHMIYA-001",
      Location_Name: "ACES Muzahmiya WH",
      Sub_Location: "Central Region",
      Latitude: 24.517040,
      Longitude: 46.267630,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "ACES",
    },
    {
      Location_ID: "WH-ALKHARAJ-001",
      Location_Name: "HOI Al Kharaj WH",
      Sub_Location: "Riyadh Metropolitan",
      Latitude: 24.21195,
      Longitude: 47.19680,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "HOI",
    },
    {
      Location_ID: "WH-HURAYMILA-001",
      Location_Name: "Madaf Huraymila WH",
      Sub_Location: "Central Province",
      Latitude: 25.12515,
      Longitude: 46.07275,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "Madaf",
    },
    {
      Location_ID: "WH-MADAF-001",
      Location_Name: "Madaf WH",
      Sub_Location: "Western Region",
      Latitude: 21.31598,
      Longitude: 39.89955,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "Madaf",
    },
    {
      Location_ID: "WH-ABHA-001",
      Location_Name: "STC Abha WH",
      Sub_Location: "Asir Province",
      Latitude: 18.293590,
      Longitude: 42.365550,
      Region: "SOUTH",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-ALBAHA-001",
      Location_Name: "STC Al Baha WH",
      Sub_Location: "South West Region",
      Latitude: 20.010380,
      Longitude: 41.466690,
      Region: "SOUTH",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-ALKHARAJ-002",
      Location_Name: "STC Al Kharaj WH",
      Sub_Location: "Riyadh East",
      Latitude: 24.118400,
      Longitude: 47.267387,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-ARAR-001",
      Location_Name: "STC ARAR WH",
      Sub_Location: "Northern Region",
      Latitude: 30.946900,
      Longitude: 41.009830,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-BURAIDAH-001",
      Location_Name: "STC BURAIDAH WH",
      Sub_Location: "Qassim Province",
      Latitude: 26.299753,
      Longitude: 44.009136,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-JEDDAH-001",
      Location_Name: "STC Jeddah WH",
      Sub_Location: "Red Sea Port",
      Latitude: 21.461080,
      Longitude: 39.209670,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-JIZAN-001",
      Location_Name: "STC Jizan WH",
      Sub_Location: "Southern Border",
      Latitude: 16.901520,
      Longitude: 42.555390,
      Region: "SOUTH",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-SAKAKA-001",
      Location_Name: "STC SAKAKA WH",
      Sub_Location: "Northern Province",
      Latitude: 30.00092,
      Longitude: 40.21377,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-SHARMA-001",
      Location_Name: "STC Sharma WH",
      Sub_Location: "Tabuk Region North",
      Latitude: 27.550410,
      Longitude: 35.535028,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-SHARMA-002",
      Location_Name: "STC Sharma WH",
      Sub_Location: "Tabuk Region South",
      Latitude: 28.065900,
      Longitude: 35.172800,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-TABOUK-001",
      Location_Name: "STC Tabouk WH",
      Sub_Location: "North West Province",
      Latitude: 28.392780,
      Longitude: 36.564120,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-UMLUJ-001",
      Location_Name: "STC Umluj WH",
      Sub_Location: "Coastal North West",
      Latitude: 25.031235,
      Longitude: 37.266064,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-RYD-EXIT18-001",
      Location_Name: "STC WH EXIT 18 Riyad",
      Sub_Location: "Riyadh Industrial",
      Latitude: 24.493750,
      Longitude: 46.911060,
      Region: "CENTRAL",
      Location_Type: "Warehouse",
      Owner: "STC",
    },
    {
      Location_ID: "WH-MADINA-001",
      Location_Name: "STC WH Madina",
      Sub_Location: "Holy City Area",
      Latitude: 24.420593,
      Longitude: 39.524922,
      Region: "WEST",
      Location_Type: "Warehouse",
      Owner: "STC",
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
      Region: "CENTRAL",
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

  // Separate warehouse and site locations
  const allLocations = locationIds;
  const warehouseIds = locationIds.filter((id) => id.includes("WH"));
  const siteIds = locationIds.filter((id) => !id.includes("WH"));

  let movementIndex = 0;

  for (let i = 1; i <= count; i++) {
    let from: string;
    let to: string;

    // Intelligent movement type generation to ensure proper distribution:
    // 30% WH->WH (Zero moves)
    // 40% WH->Site (Half moves)
    // 10% Site->WH (Half moves)
    // 20% Site->Site (Full moves)
    const rand = Math.random();

    if (rand < 0.3) {
      // WH->WH movements
      from = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
      to = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
    } else if (rand < 0.7) {
      // WH->Site movements
      from = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
      to = siteIds[Math.floor(Math.random() * siteIds.length)];
    } else if (rand < 0.8) {
      // Site->WH movements
      from = siteIds[Math.floor(Math.random() * siteIds.length)];
      to = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
    } else {
      // Site->Site movements
      from = siteIds[Math.floor(Math.random() * siteIds.length)];
      to = siteIds[Math.floor(Math.random() * siteIds.length)];
    }

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
      SN: movementIndex++,
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
