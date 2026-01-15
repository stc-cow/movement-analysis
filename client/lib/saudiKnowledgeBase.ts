// Saudi Arabia Comprehensive Knowledge Base
// Includes events, weather, cities, and mega projects

export interface SaudiEvent {
  name: string;
  type: "Religious" | "Seasonal" | "Cultural" | "Sports" | "Entertainment";
  season: string;
  months: number[];
  description: string;
  affectedRegions: string[];
  expectedVisitors?: string;
}

export interface SaudiCity {
  name: string;
  region: "WEST" | "EAST" | "CENTRAL" | "SOUTH" | "NORTH";
  population: string;
  description: string;
  majorProjects: string[];
  climate: string;
  notablePlaces: string[];
}

export interface WeatherPattern {
  region: string;
  season: string;
  months: number[];
  temperature: string;
  description: string;
}

export interface MegaProject {
  name: string;
  region: string;
  status: "Planning" | "Under Construction" | "Operational" | "Completed";
  targetCompletion?: string;
  description: string;
  investment: string;
  expectedImpact: string;
}

// Major Saudi Events
export const SAUDI_EVENTS: SaudiEvent[] = [
  {
    name: "Hajj",
    type: "Religious",
    season: "Islamic Calendar - Dhul-Hijjah",
    months: [7, 8, 9, 10, 11, 12], // Can occur in different months each year
    description:
      "The Islamic pilgrimage to Mecca, one of the Five Pillars of Islam. Millions of Muslims gather in Mecca and surrounding areas.",
    affectedRegions: ["WEST", "CENTRAL"],
    expectedVisitors: "1.5 - 2 Million+",
  },
  {
    name: "Umrah",
    type: "Religious",
    season: "Year-round",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description:
      "The minor Islamic pilgrimage to Mecca, can be performed anytime. More flexible than Hajj.",
    affectedRegions: ["WEST", "CENTRAL"],
    expectedVisitors: "500K - 1M monthly",
  },
  {
    name: "Riyadh Season",
    type: "Entertainment",
    season: "Autumn/Winter",
    months: [10, 11, 12, 1, 2, 3],
    description:
      "Major entertainment festival in Riyadh featuring concerts, theater, food, and family activities. Part of Saudi Vision 2030.",
    affectedRegions: ["CENTRAL"],
    expectedVisitors: "1M+ annually",
  },
  {
    name: "Janadriyah Festival",
    type: "Cultural",
    season: "February - March",
    months: [2, 3],
    description:
      "Traditional Saudi cultural festival celebrating Bedouin heritage, folklore, and national traditions.",
    affectedRegions: ["CENTRAL"],
    expectedVisitors: "500K+",
  },
  {
    name: "Formula 1 Saudi Grand Prix",
    type: "Sports",
    season: "December",
    months: [12],
    description:
      "International Formula 1 racing event held in Jeddah at the Corniche circuit. High-speed, prestigious motorsport event.",
    affectedRegions: ["WEST"],
    expectedVisitors: "300K+",
  },
  {
    name: "Saudi International Golf Championship",
    type: "Sports",
    season: "February",
    months: [2],
    description:
      "Professional golf tournament featuring top international golfers. Part of Saudi sports investment.",
    affectedRegions: ["CENTRAL", "WEST"],
    expectedVisitors: "100K+",
  },
  {
    name: "Jeddah Season",
    type: "Entertainment",
    season: "Summer - Fall",
    months: [9, 10, 11],
    description:
      "Entertainment and cultural festival in Jeddah featuring international artists, concerts, and events.",
    affectedRegions: ["WEST"],
    expectedVisitors: "500K+",
  },
  {
    name: "Saudi National Day",
    type: "Cultural",
    season: "September",
    months: [9],
    description:
      "Celebration of the founding of the modern Saudi state. Features parades, fireworks, and celebrations nationwide.",
    affectedRegions: ["WEST", "EAST", "CENTRAL", "SOUTH"],
    expectedVisitors: "Nationwide celebration",
  },
  {
    name: "Eid al-Fitr",
    type: "Religious",
    season: "Islamic Calendar - Shawwal",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description:
      "Three-day Islamic holiday marking the end of Ramadan. Family gatherings, prayers, and celebrations.",
    affectedRegions: ["WEST", "EAST", "CENTRAL", "SOUTH"],
    expectedVisitors: "Nationwide",
  },
  {
    name: "Eid al-Adha",
    type: "Religious",
    season: "Islamic Calendar - Dhul-Hijjah",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description:
      "Major Islamic holiday commemorating Prophet Abraham's willingness to sacrifice. Family gatherings and animal sacrifices.",
    affectedRegions: ["WEST", "EAST", "CENTRAL", "SOUTH"],
    expectedVisitors: "Nationwide",
  },
  {
    name: "Mohammed bin Salman Foundation Events",
    type: "Cultural",
    season: "Year-round",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    description:
      "Various cultural and educational events promoting Saudi arts, music, and entertainment.",
    affectedRegions: ["CENTRAL", "WEST"],
    expectedVisitors: "Varies",
  },
];

// Major Saudi Cities
export const SAUDI_CITIES: SaudiCity[] = [
  {
    name: "Riyadh",
    region: "CENTRAL",
    population: "6.9+ Million",
    description:
      "Capital of Saudi Arabia, major political and economic hub. Home to government offices, corporate headquarters, and major development projects.",
    majorProjects: ["Riyadh Season", "NEOM Hub", "PIF Headquarters"],
    climate: "Hot desert, extreme summer heat (40°C+), mild winters",
    notablePlaces: [
      "Kingdom Tower",
      "Al Faisaliah Tower",
      "Riyadh Season Park",
      "Al Diriyah UNESCO Site",
    ],
  },
  {
    name: "Jeddah",
    region: "WEST",
    population: "3.4+ Million",
    description:
      "Major port city on the Red Sea, gateway for Hajj and Umrah pilgrims. Historic old town with modern development.",
    majorProjects: [
      "NEOM Red Sea Project",
      "Jeddah Corniche Circuit",
      "Red Sea Downtown",
    ],
    climate: "Hot and humid, mild winters, influenced by sea breezes",
    notablePlaces: [
      "Jeddah Corniche",
      "Old Town (Balad)",
      "Al Noor Mosque",
      "Red Sea Mall",
    ],
  },
  {
    name: "Mecca",
    region: "WEST",
    population: "1.5+ Million",
    description:
      "Holiest city in Islam, center of Hajj and Umrah pilgrimages. Home to the Kaaba and Grand Mosque.",
    majorProjects: ["Grand Mosque Expansion", "Hajj Infrastructure"],
    climate: "Hot and dry, extreme summer heat",
    notablePlaces: [
      "Masjid al-Haram",
      "Mount Arafat",
      "Mina Valley",
      "Medain Saleh",
    ],
  },
  {
    name: "Medina",
    region: "WEST",
    population: "1.2+ Million",
    description:
      "Second holiest city in Islam, home to the Prophet's Mosque. Major pilgrimage destination.",
    majorProjects: ["Prophet's Mosque Expansion", "Pilgrimage Infrastructure"],
    climate: "Hot and dry, mild winters",
    notablePlaces: [
      "Masjid an-Nabawi",
      "Mount Uhud",
      "Quba Mosque",
      "Mount Salami",
    ],
  },
  {
    name: "Dammam",
    region: "EAST",
    population: "1.4+ Million",
    description:
      "Major port city and economic hub on the Persian Gulf. Oil industry center, connected to Khobar and Dhahran.",
    majorProjects: ["Saudi Aramco Headquarters", "King Abdulaziz Port"],
    climate: "Hot and humid, cooler in winter with occasional rain",
    notablePlaces: [
      "Corniche Beach",
      "King Fahd Park",
      "Floating Bridge",
      "Half Moon Bay",
    ],
  },
  {
    name: "Khobar",
    region: "EAST",
    population: "500K+",
    description:
      "Modern city adjacent to Dammam, popular for expat communities. Commercial and residential hub.",
    majorProjects: ["Business Parks", "Commercial Centers"],
    climate: "Hot and humid, Persian Gulf influenced",
    notablePlaces: [
      "Khobar Corniche",
      "Marina Boulevard",
      "Commercial District",
    ],
  },
  {
    name: "Dhahran",
    region: "EAST",
    population: "200K+",
    description:
      "Planned city, home to Saudi Aramco headquarters. Modern infrastructure and green spaces.",
    majorProjects: ["Saudi Aramco Operations", "Research Centers"],
    climate: "Hot and humid, Persian Gulf influenced",
    notablePlaces: [
      "King Fahd University",
      "Saudi Aramco Campus",
      "Beach Park",
    ],
  },
  {
    name: "Abha",
    region: "SOUTH",
    population: "500K+",
    description:
      "Capital of Asir region, cool mountain city famous for tourism and agriculture. Scenic landscapes.",
    majorProjects: ["Asir Tourism Development", "Mountain Parks"],
    climate: "Temperate, cooler than other regions, receives more rainfall",
    notablePlaces: [
      "Abha Souk",
      "Asir National Park",
      "Shada Mountain",
      "Al Habala Village",
    ],
  },
  {
    name: "Tabuk",
    region: "NORTH",
    population: "700K+",
    description:
      "Northern gateway city to Jordan and Israel. Strategic location with historical significance.",
    majorProjects: ["Northern Border Development", "Industrial Zones"],
    climate: "Hot in summer, cold in winter, some rainfall",
    notablePlaces: [
      "Tabuk Castle",
      "Gulf of Aqaba",
      "Wadi Rum Desert Views",
      "Archaeological Sites",
    ],
  },
  {
    name: "Al Khobar (Eastern Region Hub)",
    region: "EAST",
    population: "Varies",
    description: "Commercial and industrial hub in Eastern Province.",
    majorProjects: ["Port Facilities", "Industrial Parks"],
    climate: "Hot and humid",
    notablePlaces: ["Waterfront Areas", "Business Districts"],
  },
];

// Weather Patterns by Region
export const WEATHER_PATTERNS: WeatherPattern[] = [
  {
    region: "CENTRAL (Riyadh)",
    season: "Summer",
    months: [6, 7, 8, 9],
    temperature: "40-50°C (104-122°F)",
    description:
      "Extremely hot, dry conditions. Peak AC usage. Dust storms possible. Outdoor activities limited.",
  },
  {
    region: "CENTRAL (Riyadh)",
    season: "Winter",
    months: [12, 1, 2],
    temperature: "10-20°C (50-68°F)",
    description:
      "Mild and pleasant. Best time for outdoor activities and tourism. Clear skies.",
  },
  {
    region: "WEST (Jeddah, Mecca)",
    season: "Summer",
    months: [6, 7, 8, 9],
    temperature: "35-40°C (95-104°F), High humidity",
    description:
      "Hot and humid due to proximity to Red Sea. Feels hotter than actual temperature. High water usage.",
  },
  {
    region: "WEST (Jeddah, Mecca)",
    season: "Winter",
    months: [12, 1, 2],
    temperature: "18-25°C (64-77°F)",
    description:
      "Comfortable and pleasant. Sea breezes provide relief. Ideal weather for pilgrimage.",
  },
  {
    region: "EAST (Dammam, Khobar)",
    season: "Summer",
    months: [6, 7, 8, 9],
    temperature: "35-43°C (95-109°F), High humidity",
    description:
      "Hot and humid due to Persian Gulf. Frequent dust storms. Energy-intensive cooling needs.",
  },
  {
    region: "EAST (Dammam, Khobar)",
    season: "Winter",
    months: [12, 1, 2],
    temperature: "12-22°C (54-72°F)",
    description:
      "Cool and pleasant. Occasional rain possible. Good for outdoor activities.",
  },
  {
    region: "SOUTH (Abha, Asir)",
    season: "Summer",
    months: [6, 7, 8, 9],
    temperature: "20-30°C (68-86°F)",
    description:
      "Cool compared to other regions due to elevation. Green landscapes. Highest rainfall in Saudi.",
  },
  {
    region: "SOUTH (Abha, Asir)",
    season: "Winter",
    months: [12, 1, 2],
    temperature: "5-15°C (41-59°F)",
    description:
      "Cold and foggy. Occasional snow on highest peaks. Lush vegetation. Popular tourist season.",
  },
];

// Major Mega Projects
export const MEGA_PROJECTS: MegaProject[] = [
  {
    name: "NEOM",
    region: "NORTH-WEST",
    status: "Under Construction",
    targetCompletion: "2030+",
    description:
      "Mega-city project featuring AI integration, renewable energy, and futuristic design. The Line is the flagship project.",
    investment: "$500 Billion+",
    expectedImpact:
      "Transform Saudi Arabia into global tech hub. Create 380K+ jobs. 1.6M population planned.",
  },
  {
    name: "The Line (NEOM)",
    region: "NORTH-WEST",
    status: "Under Construction",
    targetCompletion: "2030+",
    description:
      "176 km linear city with zero cars, zero emissions. Vertical urban design focused on AI and sustainability.",
    investment: "$500 Billion",
    expectedImpact:
      "Revolutionary urban living. AI-powered infrastructure. Carbon-neutral operations.",
  },
  {
    name: "Riyadh Season",
    region: "CENTRAL",
    status: "Operational",
    description:
      "Annual entertainment festival with world-class events, concerts, theater, and family activities.",
    investment: "$2+ Billion",
    expectedImpact:
      "Boost tourism and entertainment. 1M+ annual visitors. Global recognition.",
  },
  {
    name: "Red Sea Project (NEOM)",
    region: "WEST",
    status: "Under Construction",
    targetCompletion: "2026+",
    description:
      "Luxury tourism destination featuring pristine beaches, islands, resorts, and diving experiences.",
    investment: "$500+ Million",
    expectedImpact:
      "World-class tourism destination. Preserve marine ecosystems. Create 70K+ jobs.",
  },
  {
    name: "Qiddiya Entertainment City",
    region: "CENTRAL",
    status: "Under Construction",
    targetCompletion: "2025+",
    description:
      "Massive entertainment hub featuring theme parks, sports facilities, and cultural venues near Riyadh.",
    investment: "$24 Billion",
    expectedImpact:
      "Major tourism and entertainment destination. Create 100K+ jobs. Global attraction.",
  },
  {
    name: "Al Diriyah UNESCO Site",
    region: "CENTRAL",
    status: "Under Construction",
    targetCompletion: "Ongoing",
    description:
      "Restoration and development of historic Saudi capital. Museums, galleries, and cultural spaces.",
    investment: "$15+ Billion",
    expectedImpact:
      "Preserve Saudi heritage. Cultural tourism destination. Economic growth for region.",
  },
  {
    name: "King Salman Energy Park (SPARK)",
    region: "EAST",
    status: "Operational",
    description:
      "Energy sector industrial hub featuring petrochemical plants and industrial facilities.",
    investment: "$10+ Billion",
    expectedImpact:
      "Industrial diversification. Create 50K+ jobs. Economic growth in Eastern Province.",
  },
  {
    name: "Saudi Aramco Ras Tanura Refinery Expansion",
    region: "EAST",
    status: "Operational",
    description:
      "Expansion of one of the world's largest refineries. Increased production capacity.",
    investment: "$3+ Billion",
    expectedImpact:
      "Increased oil processing capacity. Create 20K+ jobs. Global energy supply.",
  },
  {
    name: "Jeddah Corniche Circuit (F1)",
    region: "WEST",
    status: "Operational",
    description:
      "World's fastest street circuit for Formula 1 racing. High-speed motorsport venue.",
    investment: "$500+ Million",
    expectedImpact:
      "Host international F1 events. Global sporting destination. Tourism boost.",
  },
  {
    name: "Golden Triangle Project",
    region: "CENTRAL",
    status: "Under Construction",
    targetCompletion: "2025+",
    description:
      "Luxury development in Riyadh featuring office towers, hotels, residences, and cultural spaces.",
    investment: "$20+ Billion",
    expectedImpact:
      "Create world-class business district. Economic hub. Attract global investments.",
  },
  {
    name: "Saudi Railway Expansion",
    region: "CENTRAL",
    status: "Operational",
    description:
      "High-speed rail connecting major cities. Enhancing transportation infrastructure.",
    investment: "$20+ Billion",
    expectedImpact:
      "Connect Riyadh to Mecca, Medina, and Jeddah. Reduce travel time. Improve pilgrim transport.",
  },
];

// Export all knowledge base
export const SAUDI_KNOWLEDGE_BASE = {
  events: SAUDI_EVENTS,
  cities: SAUDI_CITIES,
  weather: WEATHER_PATTERNS,
  projects: MEGA_PROJECTS,
};

// Helper functions to search knowledge base
export const searchEvents = (query: string): SaudiEvent[] => {
  const lower = query.toLowerCase();
  return SAUDI_EVENTS.filter(
    (event) =>
      event.name.toLowerCase().includes(lower) ||
      event.description.toLowerCase().includes(lower) ||
      event.type.toLowerCase().includes(lower),
  );
};

export const searchCities = (query: string): SaudiCity[] => {
  const lower = query.toLowerCase();
  return SAUDI_CITIES.filter(
    (city) =>
      city.name.toLowerCase().includes(lower) ||
      city.description.toLowerCase().includes(lower),
  );
};

export const searchProjects = (query: string): MegaProject[] => {
  const lower = query.toLowerCase();
  return MEGA_PROJECTS.filter(
    (project) =>
      project.name.toLowerCase().includes(lower) ||
      project.description.toLowerCase().includes(lower),
  );
};

export const getEventsByMonth = (month: number): SaudiEvent[] => {
  return SAUDI_EVENTS.filter((event) => event.months.includes(month));
};

export const getWeatherByRegion = (region: string): WeatherPattern[] => {
  return WEATHER_PATTERNS.filter((weather) =>
    weather.region.toUpperCase().includes(region.toUpperCase()),
  );
};
