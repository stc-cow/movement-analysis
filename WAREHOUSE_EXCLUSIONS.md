# Warehouse Exclusions Configuration ✅

## Purpose

Exclude specific locations from the **Warehouse Intelligence Card** analysis that are not actual warehouses or are marked as repeaters/non-warehouse items.

---

## Excluded Warehouses

### Current Exclusions

| Location Name | Reason | Notes |
|---|---|---|
| **Bajda** | Repeater for CWH036 | Not a primary warehouse, used as repeater/secondary equipment |

---

## Configuration

### File
**`client/components/dashboard/cards/WarehouseIntelligenceCard.tsx`**

### Code
```typescript
// Warehouses to exclude from analysis (repeaters, non-warehouse locations, etc.)
const excludedWarehouses = new Set([
  "Bajda", // Repeater for CWH036
]);

// Filter to include both warehouse types and locations with "WH" in their name
// Exclude specific warehouses marked as repeaters or non-warehouse items
const warehouses = useMemo(
  () =>
    locations.filter(
      (l) =>
        (l.Location_Type === "Warehouse" ||
          l.Location_Name.toUpperCase().includes("WH")) &&
        !excludedWarehouses.has(l.Location_Name),
    ),
  [locations],
);
```

---

## How It Works

### Filtering Logic

1. **First Filter**: Identify locations that are warehouses
   ```
   (Location_Type === "Warehouse" OR Location_Name contains "WH")
   ```

2. **Second Filter**: Exclude from exclusion list
   ```
   AND NOT in excludedWarehouses Set
   ```

### Result
Only locations that are:
- ✅ Actual warehouses (by type or name)
- ✅ NOT in the exclusion list

Are shown in the warehouse analysis.

---

## Adding More Exclusions

To exclude additional locations, add them to the `excludedWarehouses` set:

### Example: Exclude Multiple Locations
```typescript
const excludedWarehouses = new Set([
  "Bajda",        // Repeater for CWH036
  "TestWarehouse", // Temporary test location
  "Demo WH",       // Demo/training warehouse
  "Old Riyadh WH", // Legacy/decommissioned warehouse
]);
```

### Important Notes
- **Case-Sensitive**: "Bajda" ≠ "bajda" (matches exact name)
- **Whitespace Matters**: "Bajda " ≠ "Bajda" (with trailing space)
- **No Regex**: Use exact string matching only
- **Comment Each Entry**: Explain why each exclusion exists

---

## Impact on Dashboard

### Warehouse Intelligence Card
- **Charts**: Top Dispatch/Receiving charts exclude Bajda
- **Table**: Warehouse Analytics table excludes Bajda
- **Metrics**: Calculations don't include Bajda movements
- **Filters**: Region filters unaffected

### Other Dashboard Cards
- **Executive Overview**: No impact (doesn't use this filter)
- **Saudi Map**: Still shows all locations (different component)
- **Region Analysis**: No impact (uses different data source)

---

## Data Flow

### Before Filtering (Raw Google Sheet)
```
Locations:
- stc Sharma WH → Warehouse ✓
- ACES Makkah WH → Warehouse ✓
- Bajda → Repeater/Non-Warehouse ✓
- Riyadh Site → Site location ✗
```

### After Filtering (Warehouse Analysis)
```
Filtered Locations:
- stc Sharma WH → SHOW ✓
- ACES Makkah WH → SHOW ✓
- Bajda → EXCLUDED ✗ (in exclusion list)
- Riyadh Site → EXCLUDED ✗ (not a warehouse)
```

### Results in UI
```
Warehouses shown: 18 (minus Bajda)
Charts display: Only valid warehouses
Table displays: Only valid warehouses
```

---

## Testing the Change

### Verify Exclusion Works
1. Open Warehouse Intelligence Card
2. Look for "Top Dispatch Warehouses" chart
3. Confirm "Bajda" does NOT appear
4. Look at "Warehouse Analytics Table"
5. Confirm "Bajda" does NOT appear in table

### Check Region Filters
1. Select "All" region
2. Count warehouses shown (should not include Bajda)
3. Select each region (WEST/EAST/CENTRAL/SOUTH)
4. Confirm Bajda never appears

---

## Maintenance

### When to Add Exclusions
- ✏️ Location is a repeater or secondary equipment
- ✏️ Location is marked as non-warehouse
- ✏️ Location is temporary/test/demo
- ✏️ Location is decommissioned/legacy
- ✏️ Location should not appear in warehouse metrics

### When NOT to Add Exclusions
- ❌ Location is still active warehouse
- ❌ Location is occasionally used
- ❌ Location might be re-activated
- ❌ Filtering by region would suffice

---

## Current Exclusions Detail

### Bajda

**Type**: Repeater equipment  
**Primary Use**: Secondary/backup for CWH036  
**Status**: Non-warehouse location  
**Why Exclude**: Should not be included in warehouse dispatch/receiving analysis  

**Alternatives if needed**:
- View in "Saudi Map" card (shows all locations)
- View in "Executive Overview" (different analytics)
- Add specific filter in other dashboard cards

---

## Related Features

### Region Filtering
Still available and works independently:
- Select region → Shows warehouses in that region
- Region filter respects exclusions

### Warehouse Analytics
Shows detailed metrics for non-excluded warehouses:
- Outgoing/Incoming movements
- Average distances
- Idle days
- Region information

---

## Future Enhancements

If many exclusions are needed:
1. **Move to server-side**: Add `is_warehouse_for_analysis` flag in Google Sheet
2. **Add configuration file**: Create `warehouse-config.json` with exclusion rules
3. **Add UI toggle**: Let users show/hide excluded items
4. **Add roles**: Different exclusions per user role

---

## Deployment

✅ **Built**: Successfully compiled  
✅ **Deployed**: Pushed to `docs/` folder  
✅ **Live**: GitHub Pages serving updated version  

---

## Summary

**What Changed**: Added Bajda to warehouse exclusion list  
**Where**: `client/components/dashboard/cards/WarehouseIntelligenceCard.tsx`  
**Impact**: Bajda no longer appears in warehouse analysis charts/tables  
**How to Add More**: Add to `excludedWarehouses` Set with comment  

✅ Configuration is clean, maintainable, and easy to expand!
