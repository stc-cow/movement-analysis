# Netlify Environment Variables Setup (Simplified)

## Overview

The COW Analytics dashboard now uses **published Google Sheets CSV exports** for simplified data integration. No complex API keys or sheet IDs required.

## ✅ Current Setup (Simplified)

**Two CSV URLs from a single published Google Sheet:**

1. **Movement-data** (Main Dashboard Data)
   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv
   ```

2. **Dashboard** (Never Moved COWs Data)
   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv
   ```

## Required Environment Variables

| Variable                  | Value                                        | Required    | Notes                                    |
| ------------------------- | -------------------------------------------- | ----------- | ---------------------------------------- |
| `MOVEMENT_DATA_CSV_URL`   | Published CSV URL (see above)                | ✅ Yes      | Main dashboard data (Movement-data)      |
| `NEVER_MOVED_COW_CSV_URL` | Published CSV URL (see above)                | ✅ Yes      | Never moved COWs data (Dashboard sheet)  |

## ✨ Benefits of This Setup

✅ **No API Keys** - Uses public CSV exports  
✅ **Simple** - Just copy-paste the CSV URL  
✅ **Reliable** - 5-minute in-memory cache prevents timeouts  
✅ **Fast** - ~20 second fetch timeout with retry logic  
✅ **Easy to Update** - Change the Google Sheet, redeploy  

## How to Set Environment Variables on Netlify

### Option 1: Via Netlify UI (Easiest) ⭐

1. **Go to your Netlify site dashboard**
   - Visit: https://app.netlify.com
   - Select your site: `cow-analysis`

2. **Navigate to Environment Settings**
   - Click: **Site Settings** (top menu bar)
   - Then: **Build & Deploy** → **Environment**

3. **Add Environment Variables**

   **Variable 1: MOVEMENT_DATA_CSV_URL**
   - Click **+ Add variable** (or **Edit variables**)
   - Key: `MOVEMENT_DATA_CSV_URL`
   - Value: 
     ```
     https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv
     ```
   - Click **Save**

   **Variable 2: NEVER_MOVED_COW_CSV_URL**
   - Click **+ Add variable**
   - Key: `NEVER_MOVED_COW_CSV_URL`
   - Value: 
     ```
     https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv
     ```
   - Click **Save**

4. **Trigger a Redeploy**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Wait for deployment to complete (usually 1-2 minutes)

5. **Verify the Deploy**
   - Once complete, visit your site: https://cow-analysis.netlify.app
   - Dashboard should load without errors

### Option 2: Via Netlify CLI

```bash
# Install Netlify CLI (if needed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your site (if not already linked)
netlify link

# Set the two required environment variables
netlify env:set MOVEMENT_DATA_CSV_URL "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv"

netlify env:set NEVER_MOVED_COW_CSV_URL "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv"

# Trigger a production deploy
netlify deploy --prod
```

### Option 3: Via netlify.toml (Version Control)

**Edit `netlify.toml`:**

```toml
[build.environment]
  MOVEMENT_DATA_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv"
  NEVER_MOVED_COW_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv"
```

**Then push to git:**

```bash
git add netlify.toml
git commit -m "Add simplified CSV URLs to netlify.toml"
git push origin main
```

## ✅ Verification

### Test the API Endpoint

After redeploy, visit the diagnostic endpoint:

```
https://cow-analysis.netlify.app/api/data/diagnostic
```

**Expected response:**

```json
{
  "urls": {
    "movement_data": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv",
    "never_moved_cows": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv"
  },
  "urlsAttempted": [
    {
      "endpoint": "movement_data",
      "status": 200,
      "success": true
    },
    {
      "endpoint": "never_moved_cows",
      "status": 200,
      "success": true
    }
  ],
  "recommendations": [
    "✓ Movement-data CSV is accessible and working.",
    "✓ Never-moved-cows CSV is accessible and working."
  ]
}
```

### Test the Dashboard

1. Visit: https://cow-analysis.netlify.app
2. Should load without 502 errors
3. Dashboard cards should display data
4. No "Unable to Load Dashboard Data" message

## 🔧 Troubleshooting

### Still Getting 502 or Blank Page?

1. **Verify Variables Are Set**
   - Go to: **Site Settings** → **Build & Deploy** → **Environment**
   - Confirm `MOVEMENT_DATA_CSV_URL` and `NEVER_MOVED_COW_CSV_URL` are listed

2. **Check the Diagnostic Endpoint**
   ```
   https://cow-analysis.netlify.app/api/data/diagnostic
   ```
   - Shows which URLs are working and which failed

3. **Clear Netlify Cache**
   - Go to: **Deploys** tab
   - Click **Clear cache and retry deploy**
   - Wait 2-3 minutes for rebuild

4. **Check CSV URLs Manually**
   - Open each CSV URL in a browser
   - Should download a CSV file (not an error page)
   - If you get permission denied, the sheet may not be published

5. **Verify Google Sheet is Published**
   - Open your Google Sheet
   - Click **Share**
   - Ensure "Published to web" is enabled
   - Copy the publish link
   - Append `&gid=SHEET_GID&single=true&output=csv` to export as CSV

### "Unable to Load Dashboard Data"

1. Check the browser console (F12 → Console tab)
2. Look for error messages
3. Visit `/api/data/diagnostic` to see which endpoint is failing
4. Verify the CSV URL is accessible

### Variables Not Taking Effect

1. **New builds use new variables automatically**
2. **Existing deployments need a rebuild:**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
3. **Or clear cache:**
   - Go to **Deploys** → **Clear cache and retry deploy**

## 🚀 Deployment Checklist

- [ ] Variables set in Netlify UI or netlify.toml
- [ ] Redeploy triggered or cache cleared
- [ ] Diagnostic endpoint returns 200 for both URLs
- [ ] Dashboard loads without errors
- [ ] Data displays in all cards

## 📝 Notes

**Changed from:**
- Complex Sheet ID + GID configuration
- Multiple fallback URLs
- SDK dependencies

**Now using:**
- Single published CSV export URLs
- Direct fetch with timeout protection
- 5-minute in-memory caching

**Why this is better:**
- Simpler setup (just URLs, no API keys)
- More reliable (published links are stable)
- Easier to debug (diagnostic endpoint shows status)
- Faster deploys (fewer dependencies)

## Need Help?

1. Check `/api/data/diagnostic` for detailed error information
2. Visit [Netlify Docs](https://docs.netlify.com/environment-variables/overview/) for environment variable help
3. Ensure CSV URL is accessible by opening it in a browser
4. Contact Netlify support if experiencing deployment issues
