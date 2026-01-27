# Production Deployment Guide - GitHub Pages / Builder Static Export

## ✅ Problem Solved: Subpath Deployment Support

The dashboard now works on **any deployment path** - not just the root `/`:
- ✅ Development: `http://localhost:8080/`
- ✅ Root domain: `https://domain.com/`
- ✅ GitHub Pages: `https://username.github.io/repo-name/`
- ✅ Builder export: Any subpath configured

---

## How It Works (Architecture)

### Fetch Path Resolution

The frontend now uses **dynamic BASE_URL** to determine the correct path:

```typescript
const base = import.meta.env.BASE_URL || './';
const url = `${base}movement-data.json`;

fetch(url)  // Resolves to correct path based on deployment
```

### Vite Configuration

The `vite.config.ts` automatically configures `base` based on environment:

```typescript
// For GitHub Pages (automated):
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const base = isGitHubPages && repoName ? `/${repoName}/` : "/";

// For custom deployments:
const base = process.env.BASE_URL || "/";
```

---

## Files Modified for Production Support

### 1. **client/lib/localDataFetcher.ts**
- Updated `loadMovementData()` to use `import.meta.env.BASE_URL`
- Updated `loadNeverMovedCows()` to use `import.meta.env.BASE_URL`
- Added console logging for debugging: `📍 Fetching from: ${url}`

**Before:**
```typescript
fetch('/movement-data.json')
fetch('/never-moved-cows.json')
```

**After:**
```typescript
const base = import.meta.env.BASE_URL || './';
fetch(`${base}movement-data.json`)
fetch(`${base}never-moved-cows.json`)
```

### 2. **vite.config.ts**
- Added `fs` import for file operations
- Updated `resolve.alias` to use `process.cwd()` instead of `__dirname`
- Added `copyJsonPlugin()` to ensure JSON files are copied to build output
- Plugin runs only during `build` mode (production)

### 3. **server/index.ts**
- Configured Express to serve static files from `/public`
- Used `path.resolve(process.cwd(), "public")` for path resolution

---

## Build & Deployment Process

### Step 1: Build the Application

```bash
pnpm run build
```

**Output Structure:**
```
dist/spa/
  ├── index.html
  ├── movement-data.json      ← Copied by copyJsonPlugin
  ├── never-moved-cows.json   ← Copied by copyJsonPlugin
  ├── assets/
  │   ├── index-<hash>.js
  │   └── index-<hash>.css
  └── ...other static files
```

### Step 2: GitHub Pages Deployment

For GitHub Actions automatic deployment:

```yaml
# .github/workflows/deploy.yml
- name: Build
  run: pnpm run build

- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist/spa
```

**Environment Variables (set by GitHub):**
- `GITHUB_PAGES=true`
- `GITHUB_REPOSITORY=owner/repo-name`

→ Vite automatically sets `base` to `/repo-name/`

### Step 3: Builder Static Export

The app works with Builder's static export as-is:
1. Builder runs: `pnpm run build`
2. Static files from `dist/spa/` are deployed
3. BASE_URL is handled by Builder's deployment configuration

---

## Verification Checklist

### ✅ Development (Local)

```bash
pnpm run dev
# Visit: http://localhost:8080/
# Should see: "Loading Movement Data from local JSON..."
# Check browser Console for: "📍 Fetching from: /movement-data.json"
```

### ✅ Production Build Test

```bash
pnpm run build

# Verify build output contains JSON files:
ls -lh dist/spa/movement-data.json
ls -lh dist/spa/never-moved-cows.json
# Both should exist

# Verify build size:
du -sh dist/spa/
```

### ✅ GitHub Pages Test (After Deployment)

```
https://username.github.io/repo-name/movement-data.json
# Should return valid JSON (not 404)

https://username.github.io/repo-name/
# Should load dashboard with data
```

### ✅ Builder Export Test

Visit the deployed app URL and:
1. Open Developer Tools (F12)
2. Check Console for success messages:
   - `📍 Fetching from: /movement-data.json`
   - `✅ Loaded 2535 movements from local JSON`
3. Dashboard should display all KPIs correctly

---

## Environment Variables for Custom Deployments

### Vercel

```env
# vercel.json or .env.production
VITE_BASE_URL=/
# or for subpath:
VITE_BASE_URL=/custom-path/
```

### Netlify

```toml
# netlify.toml
[context.production.environment]
VITE_BASE_URL = "/"
```

### Custom Subpath Hosting

```env
# .env.production
VITE_BASE_URL=/your-project-name/
```

Then during build:
```bash
pnpm run build
# or
VITE_BASE_URL=/your-project-name/ pnpm run build
```

---

## Why This Is STC Cypher-Safe

### ✅ No External APIs
- No Google Sheets API calls
- No backend dependencies
- Pure static JSON files

### ✅ No Network Calls (Except CDN)
- Only external call: Highcharts geo data (one-time, cached)
- All analytics data served locally
- Works offline after first load

### ✅ Enterprise Security
- No credentials needed
- No sensitive data transmitted
- Full data control
- Can be deployed on internal networks

### ✅ Scalable Architecture
- Works on any static hosting
- No server capacity issues
- Unlimited concurrent users
- Zero backend overhead

---

## Troubleshooting Production Issues

### Issue: 404 on `/movement-data.json`

**Cause:** JSON files not in build output

**Solution:**
```bash
# Verify files were copied
ls -lh dist/spa/movement-data.json

# If missing, rebuild with verbose output:
pnpm run build --debug

# Check plugin output for: "✅ Copied movement-data.json to build output"
```

### Issue: Dashboard Loads but Shows Error

**Cause:** Incorrect BASE_URL resolution

**Solution:**
1. Open DevTools (F12)
2. Check Console for actual fetch URL
3. Should see: `📍 Fetching from: <correct-path>`
4. If path is wrong, verify BASE_URL environment variable

### Issue: Works on GitHub Pages but Not on Custom Host

**Cause:** BASE_URL mismatch

**Solution:**
```bash
# Set correct BASE_URL before build
export VITE_BASE_URL=/your-actual-path/
pnpm run build

# Or build with .env.production
echo "VITE_BASE_URL=/your-path/" > .env.production
pnpm run build
```

---

## Performance Notes

### Data Loading
- Movement data: ~2.3 MB (minified JSON)
- Never-moved cows: ~66 KB
- Total additional payload: ~2.4 MB

### Optimization Tips
1. Gzip compression (recommended): ~200 KB
2. Browser caching: Set cache headers for JSON files
3. Lazy loading: Map only loads on tab click
4. Charts: Rendered only when visible

### Recommended CDN Settings

For GitHub Pages / Netlify:
```
Cache-Control: public, max-age=3600
Content-Encoding: gzip
```

---

## Rollback Plan

If deployment fails:

1. **GitHub Pages:** Previous deploy is still available
   ```bash
   # Revert to previous commit and trigger redeploy
   git revert <commit>
   git push
   # GitHub Actions will redeploy automatically
   ```

2. **Builder:** Use Builder's version history
   - No code changes needed
   - Just point to previous build

3. **Custom Hosting:** Keep previous build folder
   ```bash
   # Keep dist-backup/
   mv dist/spa dist-backup/
   pnpm run build  # New build
   # If fails, swap back: mv dist-backup dist/spa
   ```

---

## Future Enhancements

Possible improvements while maintaining Cypher compliance:

1. **Data Updates**
   - Regenerate JSON files nightly
   - Use GitHub Actions to automate
   - Push to `main` branch

2. **Data Compression**
   - Pre-gzip JSON files
   - Or use MessagePack format
   - Reduces payload to ~400 KB

3. **Multiple Datasets**
   - Load different JSON files based on region
   - User-specific data without backend

4. **Real-time Updates**
   - WebSocket instead of HTTP (still local, no external APIs)
   - Server-sent events for live updates

---

## Summary

✅ **Your dashboard is now production-ready for:**
- GitHub Pages
- Builder static export
- Any subpath deployment
- Offline use (after first load)
- Enterprise Cypher compliance

The JSON files are automatically included in builds and served correctly regardless of deployment location.

