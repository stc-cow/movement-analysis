# Google Sheet Integration Setup

## ❌ Current Problem

The dashboard is trying to load data from a Google Sheet but getting **HTTP 404 errors**.

### Why It's Failing

The Sheet ID currently being used:
```
2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz
```

This is a **Published Link Sharing ID**, not a standard **Google Sheet ID**. Google Sheets CSV export doesn't work with published link IDs.

## ✅ How to Fix

### Step 1: Get the Correct Sheet ID

1. **Open your Google Sheet** in Google Sheets (edit mode)
   - Go to: https://docs.google.com/spreadsheets/d/...
   
2. **Copy the Sheet ID from the URL bar**
   - The URL format is: `https://docs.google.com/spreadsheets/d/**SHEET_ID_HERE**/edit`
   - Copy the long alphanumeric string between `/d/` and `/edit`
   - Example: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`

### Step 2: Update the Configuration

**Option A: Update the code** (quick fix)
```bash
# Open: server/routes/data.ts
# Find this line:
const ACTUAL_SHEET_ID = process.env.GOOGLE_SHEET_ID || "2PACX-...";

# Replace with your actual Sheet ID:
const ACTUAL_SHEET_ID = process.env.GOOGLE_SHEET_ID || "YOUR_ACTUAL_SHEET_ID_HERE";
```

**Option B: Use environment variable** (recommended for production)
```bash
# Set the environment variable:
export GOOGLE_SHEET_ID="YOUR_ACTUAL_SHEET_ID_HERE"
export GOOGLE_SHEET_GID="1539310010"

# Or add to .env file:
GOOGLE_SHEET_ID=YOUR_ACTUAL_SHEET_ID_HERE
GOOGLE_SHEET_GID=1539310010
```

### Step 3: Verify the Sheet is Accessible

1. Test that you can access the sheet via CSV export:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=1539310010
   ```
   
2. If you see CSV data in the browser, it's working!
3. If you get 404, check:
   - Is the URL exactly correct?
   - Can you edit the sheet (not just view it)?
   - Are you logged into Google?

### Step 4: Test the Diagnostic Endpoint

Once you've updated the Sheet ID, visit:
```
http://localhost:8080/api/data/diagnostic
```

This will show you:
- Current Sheet ID being used
- All URLs being attempted
- Which ones are working
- Recommendations for fixing

## 📊 Expected Data Format

The Google Sheet should have these columns (A-AC):

| Column | Field | Example |
|--------|-------|---------|
| A | COWs ID | COW-0001 |
| B | Site Label | Riyadh Central |
| C | EBU/Royal | Royal / EBU / Normal |
| K | Moved Date/Time | 2024-01-15 10:30 |
| M | Reached Date/Time | 2024-01-16 14:45 |
| O | From Location | Riyadh Warehouse |
| Q, R | From Latitude, Longitude | 24.7136, 46.6753 |
| S | To Location | Jeddah Port |
| U, V | To Latitude, Longitude | 21.5433, 39.172 |
| W | Distance | 900 |
| X | Movement Type | Full / Half / Zero |
| Y, Z | Region from/to | Riyadh / Makkah |
| AA | Vendor | STC / ACES |

## 🔧 Troubleshooting

### Still Getting 404?

1. **Check the actual Sheet ID:**
   - Open the sheet: https://docs.google.com/spreadsheets/d/YOUR_ID/edit
   - Can you see the data?
   - If not, you have the wrong ID

2. **Check sheet permissions:**
   - The sheet must be accessible (at minimum viewable)
   - For best results, use your own sheet

3. **Alternative: Use a different sheet**
   - Create a new test Google Sheet
   - Copy your data into it
   - Use its Sheet ID

### Dashboard Shows "Unable to Load Dashboard Data"?

- The Sheet ID is wrong or the sheet is not accessible
- Check the error message on the dashboard
- Visit `/api/data/diagnostic` to see detailed info

## 📝 Notes

- The `GID` (1539310010) is the sheet tab ID
- If you have multiple tabs, each has a different GID
- The default tab usually has GID = 0
- You can find the GID in the URL when viewing a specific tab

## Support

If you need help:
1. Visit `/api/data/diagnostic` for detailed diagnostics
2. Check the browser console for error messages
3. Check the server logs (terminal running dev server)
