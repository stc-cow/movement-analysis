# CSV Data Debug Guide

## Quick Check: Is the CSV URL Correct?

### Step 1: Test the CSV URL in Browser

Open this URL directly in your browser:

```
https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv
```

**Expected:** The browser should download a CSV file (or show the CSV data)

**If you get an error:** The CSV URL is not accessible

---

## Checking the Diagnostic Endpoint

Visit this endpoint to see detailed parsing information:

```
https://cow-analysis.netlify.app/api/data/diagnostic
```

This shows:
- ✓ Which CSV URLs are accessible
- ✓ Any errors connecting to Google Sheets
- ✓ HTTP status codes
- ✓ Network issues

---

## Understanding the CSV Structure

The dashboard expects columns in this order:

```
A=COW_ID,  B=Site Label,  C=Last Deploy Date,  D=First Deploy Date, E=EBU/Royal,
F=Shelter, G=Tower Type,  H=Tower System,     I=Tower Height,      J=Network,
K=Vehicle, L=Plate #,     M=Moved DateTime,   N=Moved Month/Year,   O=Reached DateTime,
P=Reached Month/Year,     Q=From Location,    R=From Sub Location,  S=From Latitude,
T=From Longitude,         U=To Location,      V=To Sub Location,    W=To Latitude,
X=To Longitude,           Y=Distance KM,      Z=Movement Type,      AA=Region From,
AB=Region To,             AC=Vendor,          AD=Installation Status, AE=Remarks
```

**Critical Columns** (must have data):
- **A (COW_ID)** - The COW identifier
- **Q (From Location)** - Where the COW moved FROM
- **U (To Location)** - Where the COW moved TO

---

## Common Issues

### Issue 1: "No movement data found"

**Possible Causes:**
1. The CSV URL is empty or returns an error page
2. The CSV only contains headers, no data rows
3. The required columns (A, Q, U) are empty or have different names
4. The data is in a different sheet (wrong GID)

**How to Fix:**
1. Check the CSV URL in browser (see above)
2. Count the columns - should be at least 21 columns (A-U)
3. Verify columns have data (not just headers)
4. Check if you're using the correct GID number

### Issue 2: "isNewStructure is not defined"

**Cause:** Old code version cached on Netlify

**How to Fix:**
1. Go to Netlify Deploys
2. Click "Clear cache and retry deploy"
3. Wait for deployment to complete
4. Refresh browser

### Issue 3: "TypeError: Failed to fetch"

**Cause:** Frontend cannot reach the API endpoint

**How to Fix:**
1. Check browser console (F12) for detailed error
2. Try visiting `/api/data/diagnostic` to check API status
3. Verify Netlify site is not in "paused" state
4. Check network tab to see actual HTTP requests

---

## Finding the Correct GID

If your Google Sheet has multiple sheets:

1. **Open the Sheet in Edit Mode** (not published view)
2. **Look at the URL** - the GID is at the end after `/sheets/`
3. **Example:** `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit#gid=1464106304`
   - In this example, `1464106304` is the GID

### Different Sheets = Different GIDs

- **Movement-data sheet:** might have GID `1464106304`
- **Dashboard sheet:** might have a different GID like `1539310010`

You need TWO URLs:
```
MOVEMENT_DATA_CSV_URL=https://docs.google.com/spreadsheets/d/e/.../pub?gid=[GID1]&single=true&output=csv
NEVER_MOVED_COW_CSV_URL=https://docs.google.com/spreadsheets/d/e/.../pub?gid=[GID2]&single=true&output=csv
```

---

## Verify Your CSV Has Data

### In Google Sheets:

1. Open the Sheet
2. Go to the tab (sheet) you want to export
3. Check that columns A-U have data
4. At minimum, rows should have:
   - A: COW ID
   - Q: From Location
   - U: To Location

### Using Terminal/Command Line:

```bash
# Download the CSV and check it
curl -o data.csv "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv"

# View first few lines
head -5 data.csv

# Count lines
wc -l data.csv
```

---

## What the Server Logs Show

When the API tries to fetch the CSV, you'll see logs like:

```
📥 Fetching Movement-data from published CSV...
✓ Successfully fetched CSV data (5234 bytes)
📊 CSV has 500 total lines
📋 Header row has 31 columns: COW_ID | Site Label | ...
📍 Column detection:
  hasHeaderRow: true
  fromLocationIdx: 16
  toLocationIdx: 20
  cowIdIdx: 0
✓ Parsed 450 valid rows (50 rows skipped)
📊 Processing complete:
   Total input rows: 450
   Valid movements: 445
   Unique COWs: 425
   Unique locations: 89
```

**If you see "0 valid rows" instead of 450:**
- The column mapping is wrong
- The CSV structure doesn't match expectations
- You might have the wrong GID

---

## Next Steps

1. **Verify CSV URL** - Open it in browser, should download CSV file
2. **Check Netlify logs** - See what the server is actually receiving
3. **Verify column structure** - Make sure A, Q, U have data
4. **Check GID numbers** - If you have multiple sheets, verify you have the right GID
5. **Clear cache and redeploy** - If still seeing old errors

---

## Contact or Debug

If the CSV downloads but dashboard still doesn't work:

1. Share the **first 2 rows** of your CSV (header + 1 data row)
2. Tell us **which columns** have COW ID, From Location, To Location
3. Confirm the **GID number** for each sheet
4. Check the **Netlify function logs** to see parsing errors

This will help identify the exact column mapping needed.
