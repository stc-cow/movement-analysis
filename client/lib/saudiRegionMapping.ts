// Mapping of region/governorate names to Highcharts map region keys
// Supports both old region names (WEST, EAST, etc.) and new Column AD governorate names
export const regionToHcKey: Record<string, string> = {
  // ===== SIMPLE REGION NAMES (FROM CSV COLUMNS AA & AB) =====
  CENTRAL: "sa-ri",
  Central: "sa-ri",
  central: "sa-ri",
  WEST: "sa-mk",
  West: "sa-mk",
  west: "sa-mk",
  EAST: "sa-sh",
  East: "sa-sh",
  east: "sa-sh",
  SOUTH: "sa-as",
  South: "sa-as",
  south: "sa-as",
  NORTH: "sa-tb",
  North: "sa-tb",
  north: "sa-tb",

  // ===== COLUMN AD GOVERNORATE NAMES (PRIMARY) =====
  // Riyadh / Central
  "Ar Riyad": "sa-ri",
  Riyadh: "sa-ri",
  RIYADH: "sa-ri",
  "AR RIYAD": "sa-ri",

  // Makkah / Western
  Makkah: "sa-mk",
  MAKKAH: "sa-mk",
  Mecca: "sa-mk",
  MECCA: "sa-mk",
  Makka: "sa-mk",
  MAKKA: "sa-mk",

  // Medina / Al Madinah
  "Al Madinah": "sa-md",
  "AL MADINAH": "sa-md",
  Madinah: "sa-md",
  MADINAH: "sa-md",
  Medina: "sa-md",
  MEDINA: "sa-md",
  "Al Medina": "sa-md",
  "AL MEDINA": "sa-md",

  // Eastern / Ash Sharqiyah
  "Ash Sharqiyah": "sa-sh",
  "ASH SHARQIYAH": "sa-sh",
  Eastern: "sa-sh",
  EASTERN: "sa-sh",
  "Eastern Province": "sa-sh",
  "EASTERN PROVINCE": "sa-sh",
  "Al Sharqiyah": "sa-sh",
  "AL SHARQIYAH": "sa-sh",

  // Asir / Southern
  Asir: "sa-as",
  ASIR: "sa-as",
  Assir: "sa-as",
  ASSIR: "sa-as",

  // Tabuk / Northern
  Tabuk: "sa-tb",
  TABUK: "sa-tb",
  Tabouk: "sa-tb",
  TABOUK: "sa-tb",

  // Ha'il / Hail
  Hail: "sa-ha",
  HAIL: "sa-ha",
  "Ha'il": "sa-ha",
  "HA'IL": "sa-ha",
  "Ha'il Region": "sa-ha",
  "HA'IL REGION": "sa-ha",

  // Northern Border / Al Hudud ash Shamaliyah
  "Al Hudud ash Shamaliyah": "sa-nb",
  "AL HUDUD ASH SHAMALIYAH": "sa-nb",
  "Northern Border": "sa-nb",
  "NORTHERN BORDER": "sa-nb",
  "Northern Borders": "sa-nb",
  "NORTHERN BORDERS": "sa-nb",

  // Jizan / Jazan
  Jizan: "sa-jz",
  JIZAN: "sa-jz",
  Jazan: "sa-jz",
  JAZAN: "sa-jz",
  Jazzan: "sa-jz",
  JAZZAN: "sa-jz",

  // Najran
  Najran: "sa-nj",
  NAJRAN: "sa-nj",
  Najeran: "sa-nj",
  NAJERAN: "sa-nj",

  // Al Jawf
  "Al Jawf": "sa-jf",
  "AL JAWF": "sa-jf",
  "Al Jouf": "sa-jf",
  "AL JOUF": "sa-jf",

  // Al Qassim / Qassim
  "Al Quassim": "sa-qs",
  "AL QUASSIM": "sa-qs",
  Qassim: "sa-qs",
  QASSIM: "sa-qs",
  "Al Qassim": "sa-qs",
  "AL QASSIM": "sa-qs",
  Qasim: "sa-qs",
  QASIM: "sa-qs",

  // Al Bahah / Baha
  "Al Bahah": "sa-bh",
  "AL BAHAH": "sa-bh",
  "Al Baha": "sa-bh",
  "AL BAHA": "sa-bh",
  Bahah: "sa-bh",
  BAHAH: "sa-bh",
};

// Inverse mapping for display purposes (using official Column AD names)
export const hcKeyToRegionName: Record<string, string> = {
  "sa-ri": "Ar Riyad",
  "sa-mk": "Makkah",
  "sa-md": "Al Madinah",
  "sa-sh": "Ash Sharqiyah",
  "sa-as": "Asir",
  "sa-tb": "Tabuk",
  "sa-ha": "Hail",
  "sa-nb": "Al Hudud ash Shamaliyah",
  "sa-jz": "Jizan",
  "sa-nj": "Najran",
  "sa-jf": "Al Jawf",
  "sa-qs": "Al Quassim",
  "sa-bh": "Al Bahah",
};

// Map region/governorate names to hc-key format for Highcharts
export function normalizeRegionName(region: string): string {
  if (!region) return "sa-ri"; // Default to Riyadh if empty

  // Trim whitespace
  const trimmed = region.trim();

  // Try exact match first
  if (regionToHcKey[trimmed]) {
    return regionToHcKey[trimmed];
  }

  // Try case-insensitive exact match
  const uppercase = trimmed.toUpperCase();
  for (const [key, value] of Object.entries(regionToHcKey)) {
    if (key.toUpperCase() === uppercase) {
      return value;
    }
  }

  // Try partial matching for governorates (e.g., "Asir " -> "Asir")
  const normalized = trimmed.toLowerCase().replace(/\s+$/, ""); // Remove trailing spaces
  for (const [key, value] of Object.entries(regionToHcKey)) {
    if (key.toLowerCase().replace(/\s+$/, "") === normalized) {
      return value;
    }
  }

  console.warn(`[normalizeRegionName] No mapping found for: "${region}", defaulting to Riyadh`);
  return "sa-ri"; // Default to Riyadh if not found
}
