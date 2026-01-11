# Error Fixes for Google Sheets Integration

## Errors Encountered

1. **"CSV_URLS is not defined"**
   - Cause: Cached version of old code on Netlify
   - Solution: Clear Netlify cache and redeploy

2. **"No data rows found in Google Sheet"**
   - Cause: CSV parsing logic was too strict about column count
   - Solution: Improved parsing with fallback column positions

## Changes Made to Fix

### 1. Enhanced CSV Parsing (`server/routes/data.ts`)

**Before:**
```typescript
// Old: Strict 20+ column requirement
if (cells.length < 20 || !cells[0]?.trim()) continue;
```

**After:**
```typescript
// New: More flexible parsing
if (cells.length === 0 || !cells[0]?.trim()) {
  skippedCount++;
  continue;
}

if (cells.length < 5) {
  console.warn(`Skipping row ${i}: too few columns (${cells.length})`);
  skippedCount++;
  continue;
}
```

**Benefits:**
- ✅ Works with CSV files that have fewer columns
- ✅ Better error messages for debugging
- ✅ Logs row skip reasons

### 2. Flexible Column Mapping

**Before:**
```typescript
if (isNewStructure) {
  // Map to exact columns 0-30
} else {
  // Map to old columns
}
```

**After:**
```typescript
// Try multiple column positions for each field
row = {
  cow_id: cells[0]?.trim() || "",
  last_deploy_date: cells[2]?.trim() || cells[11]?.trim() || "",
  // Fallback to alternate positions if primary is empty
  from_location: cells[16]?.trim() || cells[14]?.trim() || "",
  // etc.
};
```

**Benefits:**
- ✅ Works with different column arrangements
- ✅ Uses fallback positions if primary column is empty
- ✅ More resilient to CSV structure variations

### 3. Added Detailed Logging

**New diagnostic output:**
```
📊 CSV has 500 total lines
📋 Header row has 31 columns: COW_ID | Site_Label | ...
📊 First data row has 31 cells
🔍 Has from_location column: true, Has to_location column: true
✓ Parsed 450 valid rows (50 rows skipped)
📊 Processing complete:
   Total input rows: 450
   Valid movements: 445
   Skipped (invalid): 5
   Unique COWs: 425
   Unique locations: 89
```

**Benefits:**
- ✅ See exactly what's happening during parsing
- ✅ Identify column structure issues
- ✅ Track which rows are skipped and why

### 4. Better Error Messages

When no data is found:
```
❌ NO DATA ROWS FOUND:
   CSV received: 0 bytes
   CSV line count: 1
   First 200 chars: [shows CSV content]

📋 POSSIBLE CAUSES:
   1. CSV is empty or contains only headers
   2. Column structure doesn't match expected format
   3. All rows were filtered out as invalid
```

## Deployment Instructions

### Step 1: Clear Netlify Cache

1. Go to https://app.netlify.com
2. Select your site: **cow-analysis**
3. Click **Deploys** tab
4. Click **Clear cache and retry deploy** button
5. Wait for deployment to complete (1-3 minutes)

### Step 2: Verify Fixes

After deployment completes, test:

```
https://cow-analysis.netlify.app/api/data/diagnostic
```

**Expected response:** Both URLs should show `"success": true`

### Step 3: Check Dashboard

```
https://cow-analysis.netlify.app
```

**Expected:**
- Dashboard loads without errors
- All cards display data
- No "Unable to Load Dashboard Data" message

## If Still Getting Errors

### Still see "CSV_URLS is not defined"

1. The old code is still cached
2. Solution:
   - Go to Netlify **Deploys**
   - Click the most recent deploy
   - Click **Retry deploy**
   - Wait for new build to complete

### Still see "No data rows found"

1. CSV structure doesn't match expected format
2. Solution:
   - Visit `/api/data/diagnostic` endpoint
   - Check the CSV URL in response
   - Open the CSV URL in browser
   - Verify it contains actual data (not error page)
   - Check column count and sample data

### No data displaying in dashboard

1. Check browser console (F12) for error messages
2. Visit `/api/data/diagnostic` to verify connectivity
3. Check if CSV has at least 2 lines (header + data)
4. Verify CSV URL is accessible in browser

## Technical Details

### Changed Files

- ✅ `server/routes/data.ts` - Enhanced CSV parsing and logging
- ✅ No changes needed in netlify/functions/api.js (already uses correct URLs)
- ✅ No changes needed in client code

### Column Mapping Strategy

The new parser tries multiple positions for each column:

1. **Primary position**: Column index from new structure (0-30)
2. **Fallback position**: Column index from old structure
3. **Empty check**: Uses empty string if both positions are empty

Example:
```typescript
last_deploy_date: cells[2]?.trim() || cells[11]?.trim() || ""
                  ↑ Try index 2 first
                           ↑ Fallback to index 11
                                      ↑ Default to empty string
```

### Performance

- CSV parsing: ~20 seconds timeout
- Response caching: 5 minutes
- No change in performance profile

## Success Criteria

✅ No "CSV_URLS is not defined" errors  
✅ CSV data is fetched successfully  
✅ Data rows are parsed (no "No data rows found" error)  
✅ Dashboard displays movement data  
✅ All cards show data without errors  

## Next Steps

1. **Commit and push** these changes to git
2. **Wait for Netlify** to build and deploy (automatic on push)
3. **Clear cache** in Netlify UI if needed
4. **Test the dashboard** - should load without errors
5. **Check diagnostic** endpoint to verify both CSV URLs work

---

**If you have questions or encounter other errors, check:**
- `/api/data/diagnostic` - Shows which endpoints are working
- Browser console (F12) - Shows network errors
- Netlify build logs - Shows deployment issues
