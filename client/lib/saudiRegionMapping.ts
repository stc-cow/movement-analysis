// Mapping of region names to Highcharts map region keys
export const regionToHcKey: Record<string, string> = {
  // Riyadh / Central
  Riyadh: "sa-ri",
  RIYADH: "sa-ri",
  "Ar Riyad": "sa-ri",
  "AR RIYAD": "sa-ri",

  // Makkah / Western
  Makkah: "sa-mk",
  MAKKAH: "sa-mk",
  Mecca: "sa-mk",
  MECCA: "sa-mk",
  Makka: "sa-mk",
  MAKKA: "sa-mk",

  // Medina
  Madinah: "sa-md",
  MADINAH: "sa-md",
  Medina: "sa-md",
  MEDINA: "sa-md",
  "Al Medina": "sa-md",
  "AL MEDINA": "sa-md",

  // Eastern / Sharqiyah
  Eastern: "sa-sh",
  EASTERN: "sa-sh",
  "Eastern Province": "sa-sh",
  "EASTERN PROVINCE": "sa-sh",
  "Ash Sharqiyah": "sa-sh",
  "ASH SHARQIYAH": "sa-sh",
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

  // Ha'il
  "Ha'il": "sa-ha",
  "HA'IL": "sa-ha",
  Hail: "sa-ha",
  HAIL: "sa-ha",
  "Ha'il Region": "sa-ha",
  "HA'IL REGION": "sa-ha",

  // Northern Border
  "Northern Border": "sa-nb",
  "NORTHERN BORDER": "sa-nb",
  "Northern Borders": "sa-nb",
  "NORTHERN BORDERS": "sa-nb",

  // Jazan / Jizan
  Jazan: "sa-jz",
  JAZAN: "sa-jz",
  Jizan: "sa-jz",
  JIZAN: "sa-jz",
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

  // Qassim
  Qassim: "sa-qs",
  QASSIM: "sa-qs",
  "Al Qassim": "sa-qs",
  "AL QASSIM": "sa-qs",
  Qasim: "sa-qs",
  QASIM: "sa-qs",
};

// Inverse mapping for display purposes
export const hcKeyToRegionName: Record<string, string> = {
  "sa-ri": "Riyadh",
  "sa-mk": "Makkah",
  "sa-md": "Madinah",
  "sa-sh": "Eastern Province",
  "sa-as": "Asir",
  "sa-tb": "Tabuk",
  "sa-ha": "Ha'il",
  "sa-nb": "Northern Border",
  "sa-jz": "Jazan",
  "sa-nj": "Najran",
  "sa-jf": "Al Jawf",
  "sa-qs": "Qassim",
};

// Map region/governorate names to hc-key format for Highcharts
export function normalizeRegionName(region: string): string {
  // Trim whitespace and try to find exact match first
  const trimmed = region?.trim() || "";
  if (regionToHcKey[trimmed]) {
    return regionToHcKey[trimmed];
  }

  // Try case-insensitive match if exact match failed
  const uppercase = trimmed.toUpperCase();
  for (const [key, value] of Object.entries(regionToHcKey)) {
    if (key.toUpperCase() === uppercase) {
      return value;
    }
  }

  return "sa-ri"; // Default to Riyadh if not found
}
