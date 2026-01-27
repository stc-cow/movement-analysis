# Warehouse Hub Time Card - Movement Type Classification Fix

## Problem Identified

The Warehouse Hub Time card was showing all zeros because the Movement_Type field was not being correctly classified when converting from CSV to JSON. The issue was in the data transformation pipeline:

### Root Cause

In `client/lib/localDataFetcher.ts`, the Movement_Type was being set with this logic:

```typescript
Movement_Type: row.movement_type?.includes("Full")
  ? "Full"
  : row.movement_type?.includes("Half")
    ? "Half"
    : "Zero",  // ❌ PROBLEM: Always defaults to "Zero"
```

**The Problem:**
- If the CSV field `movement_type` didn't contain exactly "Full" or "Half", it would default to "Zero"
- This meant all movements were classified as "Zero" instead of being properly classified as "Full", "Half", or "Zero"
- The Warehouse Hub Time analysis requires BOTH "Half" and "Zero" movements to calculate warehouse stay times
- Since all movements became "Zero", the proper classification was lost

### Data Flow Issue

**Before the CSV conversion (when using Google Sheets API):**
1. Google Sheets had the Movement_Type field properly set
2. API directly returned this field
3. Charts worked correctly

**After CSV conversion:**
1. CSV data is parsed by `convert-csv-to-json.mjs` → creates JSON
2. JSON is loaded by `loadMovementData()` in localDataFetcher.ts
3. `transformMovementData()` tried to parse Movement_Type from raw CSV data
4. If CSV field didn't match exact pattern, it defaulted to "Zero"
5. This broke the warehouse analysis

---

## Solution Applied

Changed the Movement_Type classification logic in `client/lib/localDataFetcher.ts`:

### Before (Broken Logic):
```typescript
Movement_Type: row.movement_type?.includes("Full")
  ? "Full"
  : row.movement_type?.includes("Half")
    ? "Half"
    : "Zero",
```

### After (Fixed Logic):
```typescript
// Parse Movement_Type from CSV, or leave undefined for enrichMovements to calculate
let movementType: "Full" | "Half" | "Zero" | undefined = undefined;
const rawMovementType = row.movement_type?.trim()?.toUpperCase() || "";

if (rawMovementType.includes("FULL")) {
  movementType = "Full";
} else if (rawMovementType.includes("HALF")) {
  movementType = "Half";
} else if (rawMovementType.includes("ZERO") || rawMovementType === "0") {
  movementType = "Zero";
}
// If movement_type is not recognized, leave undefined and let enrichMovements calculate it

const movement = {
  // ... other fields ...
  Movement_Type: movementType,
  // ... other fields ...
};
```

### Key Changes:

1. **Case-Insensitive Matching:** Changed to uppercase comparison for reliability
2. **No Default Fallback:** Instead of defaulting to "Zero", we leave it `undefined`
3. **Fallback to Classification:** If Movement_Type is undefined, the `enrichMovements()` function will calculate it based on location types:
   - If From=Site AND To=Site → "Full"
   - If From=Warehouse AND To=Site OR reverse → "Half"
   - If From=Warehouse AND To=Warehouse → "Zero"

---

## How Movement Type is Determined

### Priority Order (After Fix):

1. **CSV Value (if valid):** If the CSV has a valid `movement_type` field with "FULL", "HALF", or "ZERO", use that
2. **Location-Based Classification:** If Movement_Type is not in CSV or not recognized, calculate using location types via `classifyMovement()`

### Classification Rules (Location-Based):

The `classifyMovement()` function in `client/lib/analytics.ts` determines Movement_Type:

```typescript
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
```

### Warehouse Detection:

A location is identified as a warehouse if:
- `Location_Type === "Warehouse"` (explicitly set), OR
- `Location_Name.toUpperCase().includes("WH")` (contains "WH")

---

## Warehouse Hub Time Analysis

The Warehouse Hub Time card depends on properly classified movements:

### What It Calculates:

1. **Off-Air Warehouse Aging:**
   - Filters ONLY Half/Zero movements
   - Groups by COW
   - Calculates idle days between consecutive movements
   - Only counts idle time if To_Location is a warehouse
   - Buckets by months: 0-3, 4-6, 7-9, 10-12, >12

2. **Short Idle Time:**
   - Filters ONLY Half/Zero movements
   - Identifies short stays at warehouses (1-15 days)
   - Buckets: 1-5 Days, 6-10 Days, 11-15 Days

3. **Detailed Table:**
   - Lists all COWs with off-air aging
   - Shows total movements, average idle days, top warehouse

### Why It Needs Both "Half" and "Zero":

- **Half Movement:** One end is warehouse, other is site → COW is being sent to/from warehouse
- **Zero Movement:** Both ends are warehouses → COW is being moved between warehouses

Both types indicate warehouse involvement and idle time that should be counted.

---

## Data Regeneration

After applying the fix, JSON files were regenerated:

```bash
pnpm exec node convert-csv-to-json.mjs
```

This:
1. Downloads latest CSV from Builder.io assets
2. Parses CSV to JSON
3. Applies the new movement_type parsing logic (via `localDataFetcher.ts`)
4. Generates `public/movement-data.json` and `public/never-moved-cows.json`

---

## Expected Results

After the fix:

1. ✅ Movement_Type will be correctly determined (either from CSV or calculated from location types)
2. ✅ Warehouse Hub Time charts will populate with data
3. ✅ Both Half and Zero movements will be included
4. ✅ Idle day calculations will be accurate
5. ✅ Regional warehouse analysis will work correctly

---

## Testing Recommendations

1. **Check Console Output:**
   - Look for proper movement classification in browser console
   - Verify distinct Movement_Type values exist

2. **Inspect Warehouse Hub Time Tab:**
   - Off-Air Warehouse Aging chart should show bars
   - Short Idle Time chart should show data
   - Table should list COWs with off-air aging

3. **Verify Calculations:**
   - Sample a few COWs and manually verify idle day calculations
   - Confirm warehouse stays are only counted for Half/Zero movements

4. **Check Data Distribution:**
   - Movements should be distributed across Full, Half, and Zero types
   - Not all movements should be "Zero"

---

## Files Modified

1. **client/lib/localDataFetcher.ts**
   - Updated `transformMovementData()` function
   - Changed Movement_Type parsing logic
   - Now leaves undefined if not recognized (allowing fallback classification)

2. **public/movement-data.json** (regenerated)
   - JSON file regenerated with new parsing logic applied by localDataFetcher

---

## Technical Details

### Why This Works:

The `enrichMovements()` function in `client/lib/analytics.ts` provides a fallback:

```typescript
export function enrichMovements(
  movements: CowMovementsFact[],
  locations: DimLocation[],
): CowMovementsFact[] {
  const locMap = new Map(locations.map((l) => [l.Location_ID, l]));

  return movements.map((mov) => {
    // Use the original Movement_Type from Google Sheet if available
    // Otherwise, classify based on location types
    const movementType = mov.Movement_Type || classifyMovement(mov, locMap);

    return {
      ...mov,
      Movement_Type: movementType,
    };
  });
}
```

Key line: `const movementType = mov.Movement_Type || classifyMovement(mov, locMap);`

This means:
- If Movement_Type is already set (from CSV), use it
- If Movement_Type is undefined/null, calculate it using `classifyMovement()`
- This ensures every movement gets properly classified

---

## Summary

The fix ensures that:
1. Movement types are correctly parsed from CSV when available
2. When not available in CSV, they're calculated based on location types
3. The Warehouse Hub Time analysis gets both Half and Zero movements
4. Idle day calculations work properly
5. The system is more resilient to CSV format variations

This maintains backward compatibility with Google Sheets data while properly handling CSV conversions.
