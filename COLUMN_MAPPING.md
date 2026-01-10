# ✅ Google Sheet Column Mapping Specification

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Active Implementation

## Complete Column Mapping (A → AE)

| Column | Field Name | Type | Original Meaning | Usage |
|--------|-----------|------|-----------------|-------|
| A | `cow_id` | String | COWs ID | Primary key for movements/COWs |
| B | `site_label` | String | Site Label | Location/deployment label |
| C | `last_deploy_date` | Date | Last Deploying Date | Time-based analytics |
| D | `first_deploy_date` | Date | 1st Deploying Date | Time-based analytics |
| E | `ebu_royal_flag` | String | EBU / Royal | Classification flag |
| F | `shelter_type` | String | Shelter / Outdoor | Asset type |
| G | `tower_type` | String | Tower Type | Asset specification |
| H | `tower_system` | String | Tower System | Asset specification |
| I | `tower_height` | Float | Tower Height (m) | Asset specification |
| J | `network_technology` | String | 2G / 4G / LTE / 5G | Network capability |
| K | `vehicle_make` | String | Vehicle Make | Equipment info |
| L | `vehicle_plate_number` | String | Plate # | Equipment tracking |
| M | `moved_datetime` | DateTime | Moved Date / Time | Movement timeline |
| N | `moved_month_year` | String | Moved Month / Year | Movement timeline |
| O | `reached_datetime` | DateTime | Reached Date / Time | Movement timeline |
| P | `reached_month_year` | String | Reached Month / Year | Movement timeline |
| Q | `from_location` | String | From Location | Movement origin |
| R | `from_sub_location` | String | From Sub Location | Movement origin detail |
| S | `from_latitude` | Float | From Latitude | Map visualization |
| T | `from_longitude` | Float | From Longitude | Map visualization |
| U | `to_location` | String | To Location | Movement destination |
| V | `to_sub_location` | String | To Sub Location | Movement destination detail |
| W | `to_latitude` | Float | To Latitude | Map visualization |
| X | `to_longitude` | Float | To Longitude | Map visualization |
| Y | `distance_km` | Float | Distance (KM) | Movement KPI |
| Z | `movement_type` | String | Movement Type (Full/Half/Zero) | Movement classification |
| AA | `region_from` | String | Region From (WEST/EAST/CENTRAL/SOUTH) | Regional analytics |
| AB | `region_to` | String | Region To (WEST/EAST/CENTRAL/SOUTH) | Regional analytics |
| AC | `vendor` | String | Vendor (STC/ACES/Madaf/HOI) | Asset ownership |
| AD | `installation_status` | String | Installation Status | Asset status |
| AE | `remarks` | String | Remarks | Free-form notes |

## Why This Structure Works Well

### ✅ Developer-Friendly
- **Camel/snake-case safe** (no spaces, no symbols, no special characters)
- **Consistent naming** across frontend + backend
- **Easy to bind** to UI components and filters
- **Database-ready** for SQL/BigQuery/Power BI

### ✅ Dashboard-Ready
```
Map Components:
  from_latitude, from_longitude → Origin pin
  to_latitude, to_longitude → Destination pin

Movement KPIs:
  Count by movement_type (Full/Half/Zero)
  Sum by distance_km
  Count by region_from → region_to (transitions)

Filters:
  vendor (dropdown)
  installation_status (dropdown)
  network_technology (multi-select)
  from_sub_location / to_sub_location (location picker)
  ebu_royal_flag (toggle)

Timeline:
  moved_datetime (timeline slider)
  reached_datetime (timeline slider)
```

## Implementation Files

### Backend
- **`server/routes/data.ts`** - Parses CSV and maps columns A-AE to snake_case fields
- **`client/lib/dataImport.ts`** - Client-side CSV parsing with same mapping

### Frontend Components Using These Fields
- **ExecutiveOverviewCard.tsx** - Uses COW counts, movement types
- **SaudiMapCard.tsx** - Uses lat/long for mapping
- **RegionAnalysisCard.tsx** - Uses region_from/region_to for transitions
- **WarehouseIntelligenceCard.tsx** - Uses location names and movements
- **HeaderFilters.tsx** - Filters by vendor, region, etc.

## Data Type Validation

```typescript
// Movement Object (from parseCSVData)
{
  cow_id: string;                    // "COW-001"
  site_label: string;                // "Riyadh Central"
  ebu_royal_flag: string;            // "Royal" | "EBU" | ""
  shelter_type: string;              // "Shelter" | "Outdoor"
  tower_type: string;                // "Macro" | "Small Cell" | "Micro Cell"
  network_technology: string;        // "2G" | "4G" | "5G" | "LTE"
  moved_datetime: DateTime;          // ISO 8601 format
  reached_datetime: DateTime;        // ISO 8601 format
  from_location: string;             // Location name
  from_latitude: number;             // 24.7136
  from_longitude: number;            // 46.6753
  to_location: string;               // Location name
  to_latitude: number;               // 21.5433
  to_longitude: number;              // 39.172
  distance_km: number;               // 234.5
  movement_type: string;             // "Full" | "Half" | "Zero"
  region_from: string;               // "WEST" | "EAST" | "CENTRAL" | "SOUTH"
  region_to: string;                 // "WEST" | "EAST" | "CENTRAL" | "SOUTH"
  vendor: string;                    // "STC" | "ACES" | "Madaf" | "HOI"
  installation_status: string;       // "Active" | "Inactive" | etc.
}
```

## Google Sheet Export URL

```
https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=GID
```

**Current Configuration:**
- Sheet ID: `1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM`
- GID: `1539310010`
- Environment Variables: `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_GID`

## Future Integration Examples

### REST API Endpoint
```json
GET /api/data
Response:
{
  "movements": [
    {
      "cow_id": "COW-001",
      "from_location": "Riyadh WH",
      "to_location": "Jeddah Site",
      "distance_km": 942.5,
      ...
    }
  ],
  "cows": [...],
  "locations": [...]
}
```

### SQL Query Example
```sql
SELECT 
  cow_id,
  from_location,
  to_location,
  distance_km,
  region_from,
  region_to,
  movement_type,
  moved_datetime
FROM movements
WHERE movement_type = 'Full'
  AND distance_km > 100
  AND region_from != region_to
ORDER BY moved_datetime DESC;
```

### Power BI / Looker Integration
```
Dimensions:
  - vendor
  - movement_type
  - region_from
  - region_to
  - installation_status

Measures:
  - COUNT(cow_id)
  - SUM(distance_km)
  - AVG(distance_km)
  
Date Fields:
  - moved_datetime
  - reached_datetime
```

## Notes for Future Updates

1. **Always use snake_case** in new fields
2. **Validate coordinates** are within Saudi Arabia bounds
3. **Normalize regions** to standard 4 values: WEST, EAST, CENTRAL, SOUTH
4. **Vendors** should be limited to: STC, ACES, Madaf, HOI
5. **Movement types** must be: Full, Half, Zero
6. **Date formats** must be valid ISO 8601

## Support

For questions about the column mapping, refer to this document or contact the development team.
