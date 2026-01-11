# Netlify Environment Variables Setup

## Problem

The Netlify deployment is returning **API 502 errors** because required environment variables are not configured.

## Required Environment Variables

### For Never Moved COWs Data

```
NEVER_MOVED_COW_CSV_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv
```

### For Main Dashboard Data (Optional but recommended)

```
GOOGLE_SHEET_ID=1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM
GOOGLE_SHEET_GID=1539310010
```

## How to Set Environment Variables on Netlify

### Option 1: Via Netlify UI (Easiest)

1. **Go to your Netlify site dashboard**
   - Visit: https://app.netlify.com
   - Select your site: `cow-analysis`

2. **Navigate to Settings**
   - Click: **Site Settings** (top menu bar)
   - Then: **Build & Deploy** → **Environment**

3. **Click "Edit Variables"**
   - Or the **+ Add variable** button

4. **Add Each Environment Variable**
   - Key: `NEVER_MOVED_COW_CSV_URL`
   - Value: `https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv`
   - Click **Save**

5. **Add Additional Variables (Optional)**
   - Key: `GOOGLE_SHEET_ID`
   - Value: `1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM`
   - Click **Save**

6. **Redeploy Your Site**
   - Go to **Deploys**
   - Click **Trigger deploy** → **Deploy site**
   - Wait for the deployment to complete

### Option 2: Via Netlify CLI

```bash
# Install Netlify CLI if you haven't already
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your site (if not already linked)
netlify link

# Set environment variables
netlify env:set NEVER_MOVED_COW_CSV_URL "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv"

netlify env:set GOOGLE_SHEET_ID "1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM"

netlify env:set GOOGLE_SHEET_GID "1539310010"

# Trigger a redeploy
netlify deploy --prod
```

### Option 3: Via netlify.toml (Advanced)

Add to `netlify.toml`:

```toml
[build.environment]
  NEVER_MOVED_COW_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1464106304&single=true&output=csv"
  GOOGLE_SHEET_ID = "1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM"
  GOOGLE_SHEET_GID = "1539310010"
```

Then push to git:

```bash
git add netlify.toml
git commit -m "Add environment variables to netlify.toml"
git push origin main
```

## Verification

### Step 1: Check Netlify Dashboard

- Go to: **Site Settings** → **Build & Deploy** → **Environment**
- Confirm all variables are listed

### Step 2: Test the API

After redeploy, visit:

```
https://cow-analysis.netlify.app/api/data/diagnostic
```

You should see:

```json
{
  "currentSheetId": "1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM",
  "currentGid": "1539310010",
  "urlsAttempted": [...],
  "recommendations": ["✓ Found working URL! Sheet is accessible."]
}
```

### Step 3: Check Dashboard

Visit: `https://cow-analysis.netlify.app`

- Should load without 502 errors
- Dashboard data should display
- No "Unable to Load Dashboard Data" message

## Troubleshooting

### Still Getting 502?

1. **Clear Browser Cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

2. **Check Netlify Logs**
   - Go to: **Site Settings** → **Build & Deploy** → **Deploy log**
   - Look for error messages starting with `[Function]`

3. **Verify Variable Names**
   - Make sure variable names match exactly:
     - `NEVER_MOVED_COW_CSV_URL` (not `NEVER_MOVED_CSV_URL`)
     - `GOOGLE_SHEET_ID` (not `GOOGLE_SHEET`)

4. **Wait for Deploy to Complete**
   - Netlify functions need time to rebuild
   - Wait 2-3 minutes before testing

### Environment Variables Not Taking Effect?

1. Netlify caches built functions
2. Clear cache:
   - Go to **Build & Deploy** → **Clear cache and deploy site**
3. Or trigger a new deploy:
   - Go to **Deploys** → **Trigger deploy** → **Deploy site**

## Variable Reference

| Variable                  | Value                                        | Required    | Notes                             |
| ------------------------- | -------------------------------------------- | ----------- | --------------------------------- |
| `NEVER_MOVED_COW_CSV_URL` | CSV export URL                               | ✅ Yes      | Published Google Sheet CSV export |
| `GOOGLE_SHEET_ID`         | 1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM | ⚠️ Optional | Used for movement data            |
| `GOOGLE_SHEET_GID`        | 1539310010                                   | ⚠️ Optional | Sheet tab ID (default is 0)       |

## Important Notes

⚠️ **Security**

- Never commit environment variables to git
- Use Netlify UI or CLI instead
- `.env` files are for development only

✅ **Best Practice**

- Use Option 1 (Netlify UI) for simplicity
- Use Option 2 (CLI) if you manage multiple sites
- Use Option 3 (netlify.toml) if you want version control

🔄 **After Setting Variables**

- New deployments automatically use the variables
- Existing deployments need a rebuild to use new variables
- Test the `/api/data/diagnostic` endpoint to verify

## Contact Support

If still having issues:

1. Visit `/api/data/diagnostic` for detailed error info
2. Check Netlify build logs
3. Verify CSV URL is accessible in browser
4. Contact Netlify support with deployment ID
