# Quick Start - GitHub Pages + Google Sheets

## ✅ What's Done

- ✅ React Dashboard built for GitHub Pages
- ✅ Client-side CSV fetcher created
- ✅ Google Sheets URLs configured
- ✅ GitHub Actions workflow ready
- ✅ No backend needed

## 📋 Pre-Deployment Checklist

### 1. Google Sheets Published to Web

For EACH sheet tab:

**Movement Data Sheet**:
- [ ] Open your Google Sheet
- [ ] File → Share → Publish to web
- [ ] Select **"Movement Data"** tab
- [ ] Click **Publish**

**Never-Moved-COWs Sheet**:
- [ ] File → Share → Publish to web
- [ ] Select **"Never-Moved-COWs"** tab
- [ ] Click **Publish**

**Verify URLs work**:
```bash
curl -I "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1539310010&single=true&output=csv"
# Should return HTTP 200 or 307 (redirect)
```

### 2. GitHub Pages Enabled

- [ ] Repo → Settings → Pages
- [ ] Source: Deploy from a branch
- [ ] Branch: `main`
- [ ] Folder: `/docs`
- [ ] Click Save

### 3. Ready to Deploy

- [ ] All code pushed to `main` branch
- [ ] GitHub Actions workflow exists (`.github/workflows/jekyll-gh-pages.yml`)

## 🚀 Deploy (One Command)

```bash
git push origin main
```

That's it! GitHub Actions will automatically:
1. Build the React app
2. Deploy to `/docs` folder
3. Publish to GitHub Pages

## ⏱️ What Happens Next

1. **Push to main** (0 seconds)
2. **GitHub Actions starts** (~10 seconds)
3. **Build & deploy** (~1-2 minutes)
4. **Live on GitHub Pages** ✅

Check progress: Go to repo → **Actions** tab

## 🌐 Access Your Dashboard

After deployment:

```
https://stc-cow.github.io/cmms-2Fanalysis/
```

## 🔍 Verify It Works

Open the dashboard and check **Console (F12)**:

```
Expected log messages:
📊 Loading dashboard data from Google Sheets (client-side)...
✓ Loaded 2535 movements, 428 cows
✅ Loaded 118 Never Moved COWs
```

If you see these messages → ✅ **Success!**

## ❌ Troubleshooting

### Dashboard shows "Unable to Load Dashboard Data"

**Cause**: Google Sheets not published to web

**Fix**:
```
1. File → Share → Publish to web
2. Select both sheet tabs
3. Click Publish
4. Wait 1-2 minutes
5. Refresh dashboard
```

### Still shows error after 5 minutes

**Check**:
1. Open DevTools Console (F12)
2. Copy the error message
3. Verify Google Sheets URLs are accessible:
   - Try opening the CSV URL in a new tab
   - Should download a CSV file

### CSV downloads but dashboard still blank

**Cause**: Column mapping mismatch

**Fix**:
1. Check if Google Sheet columns match expected format
2. Open `client/lib/googleSheetsFetcher.ts`
3. Verify column indices are correct
4. Check console for parsing errors

## 📚 Detailed Info

See `GITHUB_PAGES_DEPLOYMENT.md` for:
- Complete architecture explanation
- How client-side fetching works
- Performance notes
- Security considerations

## ✨ Features

✅ Works on GitHub Pages (no backend)
✅ Real-time data from Google Sheets
✅ 2535 movements tracked
✅ 118 never-moved COWs
✅ Full analytics dashboard
✅ Offline after first load (cached)

## 🎯 Summary

```
Google Sheets (Data)
        ↓
 Client-Side CSV Fetch
        ↓
  React Dashboard
        ↓
 GitHub Pages
```

**No servers. Just GitHub Pages + Google Sheets. Simple! 🎉**

---

Ready? Run: `git push origin main`
