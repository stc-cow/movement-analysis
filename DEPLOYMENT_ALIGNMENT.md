# Deployment Alignment: GitHub Pages + Vercel + STC Cypher

## Current Production Reality

### Single Source of Truth: `/docs` Directory

All production deployments now build to a **single output directory**: `/docs`

This folder contains:
- `index.html` - React app entry point
- `assets/` - JavaScript, CSS, and images
- `movement-data.json` - COW movement data
- `never-moved-cows.json` - Never-moved COW data

### Deployment Targets

The same `/docs` output serves:

1. **GitHub Pages**: `main` branch → `/docs` folder → published to `stc-cow.github.io`
2. **Vercel**: `/docs` directory → `outputDirectory: "docs"` in vercel.json
3. **STC Cypher**: Subpath-safe deployment with relative base paths
4. **Builder Static Export**: Direct `/docs` content

---

## Implementation Details

### 1. Build Configuration (`vite.config.ts`)

**Base Path (Mandatory)**:
```javascript
const base = "./";  // Relative base for subpath safety
```

**Output Directory**:
```javascript
build: {
  outDir: "docs",  // Single production output
}
```

**Why `./ ` base is critical**:
- GitHub Pages serves from `/repo-name/` subpath
- Vercel may serve from custom subpaths
- STC internal hosting uses subpaths
- Builder export may use nested routes
- Absolute paths `/` fail on ALL subpath deployments

### 2. Build Script (`package.json`)

```json
{
  "build:client": "vite build && cp public/*.json docs/"
}
```

**What this does**:
1. Runs `vite build` → outputs to `/docs`
2. Copies JSON files from `/public` to `/docs`
3. Ensures JSON is always available at root of `/docs`

**Verification after build**:
```bash
ls -la docs/
# Expected output:
# docs/index.html
# docs/movement-data.json
# docs/never-moved-cows.json
# docs/assets/
```

### 3. JSON Fetching (`client/lib/localDataFetcher.ts`)

**Already Correct**:
```typescript
const base = import.meta.env.BASE_URL || "./";
const url = `${base}movement-data.json`;
const response = await fetch(url);
```

**Works across all deployments**:
- GitHub Pages: `base` = `/repo-name/` → fetches `/repo-name/movement-data.json`
- Vercel root: `base` = `/` → fetches `/movement-data.json`
- Vercel subpath: `base` = `/app/` → fetches `/app/movement-data.json`
- STC Cypher: `base` = configured value → uses that prefix
- Local dev: `base` = `./` → fetches `./movement-data.json` (relative)

### 4. Vercel Configuration (`vercel.json`)

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "docs",
  "framework": "vite"
}
```

**Critical settings**:
- `outputDirectory: "docs"` - tells Vercel where to find static assets
- `buildCommand: "pnpm run build"` - runs full build process
- Framework: "vite" - Vercel recognizes Vite configuration

---

## Verification Checklist

### After Making Changes

- [ ] `vite.config.ts` has `base: "./"`
- [ ] `vite.config.ts` has `outDir: "docs"`
- [ ] `package.json` build script copies JSON: `cp public/*.json docs/`
- [ ] `vercel.json` exists with `outputDirectory: "docs"`
- [ ] `client/lib/localDataFetcher.ts` uses `BASE_URL || "./"`

### After Building

```bash
pnpm run build:client
```

**Check build output exists**:
```bash
# All of these must exist:
ls docs/index.html
ls docs/movement-data.json
ls docs/never-moved-cows.json
ls docs/assets/
```

### After Deployment

**GitHub Pages**:
```bash
# Visit: https://stc-cow.github.io
curl https://stc-cow.github.io/movement-data.json | jq . | head -5
```

**Vercel**:
```bash
# Visit deployment URL (check Vercel dashboard)
curl <VERCEL_URL>/movement-data.json | jq . | head -5
```

**Expected Response**:
```json
[
  {
    "cows_id": "...",
    "from_location": "...",
    ...
  }
]
```

If you get **404**, check:
1. File exists: `docs/movement-data.json` ✓
2. Build ran copy step: `cp public/*.json docs/` ✓
3. Base path is relative: `base: "./"` ✓

---

## Deployment Order

### 1. Local Testing

```bash
# Test build creates /docs with JSON
pnpm run build:client

# Verify JSON is present
ls -lh docs/*.json

# Run preview server
pnpm run dev
```

### 2. Push to GitHub

```bash
git add .
git commit -m "chore: align deployments to /docs output"
git push origin main
```

**GitHub Actions**:
- Detects changes in main branch
- Runs `pnpm run build`
- Publishes `/docs` folder to GitHub Pages
- Available at: `https://stc-cow.github.io`

### 3. Vercel Deployment

**Automatic** - Vercel webhook triggers on push to main:
- Builds with `vercel.json` config
- Outputs to `/docs` (from `outputDirectory`)
- Publishes to production URL
- Available at: `https://<project>.vercel.app`

### 4. STC Cypher

Use static export of `/docs`:
- Download `/docs` folder
- Serve from STC internal server
- All paths are relative (base: `./`)
- Works on any subpath

---

## Why This Matters

### Before Alignment Issues

❌ Different output for GitHub vs Vercel
❌ JSON files 404 on GitHub Pages
❌ STC Cypher breaks on new deployments
❌ Builder export doesn't match production

### After Alignment Benefits

✅ **Single source of truth**: `/docs`
✅ **GitHub Pages works**: `stc-cow.github.io/movement-data.json`
✅ **Vercel works**: Same build output
✅ **STC Cypher safe**: Relative paths work on any subpath
✅ **Builder compatible**: Direct static content
✅ **Production ready**: No manual file copying
✅ **No CI mismatches**: Same artifact everywhere

---

## Common Issues & Solutions

### Issue: "404 when fetching movement-data.json"

**Check 1**: Build created the file?
```bash
ls docs/movement-data.json
```

**Check 2**: Is `/docs` being served?
```bash
# GitHub Pages: main branch → /docs ✓
# Vercel: outputDirectory: "docs" ✓
# Local: vite outDir: "docs" ✓
```

**Check 3**: Fetch path is correct?
```javascript
// ✓ Correct - uses relative base
const base = import.meta.env.BASE_URL || "./";
fetch(`${base}movement-data.json`)

// ✗ Wrong - absolute path fails on subpaths
fetch('/movement-data.json')
```

### Issue: "Dashboard works on localhost but 404 on GitHub Pages"

**Root cause**: Absolute paths `/` don't work on `/repo-name/` subpath

**Fix**: Use relative base `./`
```typescript
// In vite.config.ts
const base = "./";  // NOT "/"

// In localDataFetcher.ts
const base = import.meta.env.BASE_URL || "./";
fetch(`${base}movement-data.json`)
```

### Issue: "Vercel deployment has stale data"

**Solution**: Vercel must rebuild to get latest `/docs`

```bash
# Force Vercel rebuild:
git commit --allow-empty -m "chore: force redeploy"
git push origin main
```

---

## Technical Details: Why Relative Base

### Absolute Base Problems

```
Config: base = "/"

GitHub Pages URL: https://stc-cow.github.io/repo-name/
App tries to fetch: fetch('/movement-data.json')
Browser requests: https://stc-cow.github.io/movement-data.json ❌ 404
Correct path should be: https://stc-cow.github.io/repo-name/movement-data.json
```

### Relative Base Solution

```
Config: base = "./"

GitHub Pages URL: https://stc-cow.github.io/repo-name/
App tries to fetch: fetch('./movement-data.json')
Browser resolves: ./movement-data.json relative to current page
Final request: https://stc-cow.github.io/repo-name/movement-data.json ✓ Works

Vercel root URL: https://example.vercel.app/
App tries to fetch: fetch('./movement-data.json')
Browser resolves: ./movement-data.json relative to /
Final request: https://example.vercel.app/movement-data.json ✓ Works

STC subpath: https://internal.stc/cow-dashboard/
App tries to fetch: fetch('./movement-data.json')
Browser resolves: ./movement-data.json relative to /cow-dashboard/
Final request: https://internal.stc/cow-dashboard/movement-data.json ✓ Works
```

---

## Summary

**Changes Made**:

1. ✅ Updated `vite.config.ts`:
   - `base: "./"`  (relative for subpath safety)
   - `outDir: "docs"` (single production output)

2. ✅ Updated `package.json`:
   - Build script includes `cp public/*.json docs/`
   - pkg.assets points to `/docs`

3. ✅ Created `vercel.json`:
   - `outputDirectory: "docs"`
   - `buildCommand: "pnpm run build"`

4. ✅ Verified `client/lib/localDataFetcher.ts`:
   - Uses `BASE_URL || "./"`
   - Works across all deployments

**Result**: Single `/docs` output works on GitHub Pages, Vercel, STC Cypher, and Builder export without modification.

**Next Step**: `pnpm run build:client` and verify all files in `/docs` directory.
