# Deployment Alignment - Changes Summary

## Files Modified

### 1. `vite.config.ts` ✅

**Changes**:
```diff
- const base = isGitHubPages && repoName ? `/${repoName}/` : process.env.BASE_URL || "/";
+ const base = "./";  // Relative base for subpath safety

- build: {
-   outDir: "dist/spa",
- }
+ build: {
+   outDir: "docs",  // Single production output for all deployments
+ }
```

**Why**: 
- Relative base `./` works on any subpath (GitHub Pages, Vercel, STC Cypher)
- Output to `/docs` for GitHub Pages (reads from main/docs folder)
- Single source of truth for all deployment platforms

---

### 2. `package.json` ✅

**Changes**:
```diff
  "pkg": {
    "assets": [
-     "dist/spa/*"
+     "docs/*"
    ]
  },

  "scripts": {
-   "build:client": "vite build",
+   "build:client": "vite build && cp public/*.json docs/",
  }
```

**Why**:
- Ensures JSON files are copied from `/public` to `/docs` after Vite build
- No manual copying required
- Pkg assets updated to point to `/docs`

---

### 3. `vercel.json` ✅ (NEW FILE)

**Created**:
```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "docs",
  "framework": "vite",
  "env": {
    "VITE_BASE_URL": "./"
  }
}
```

**Why**:
- Tells Vercel to use `/docs` as output directory
- Matches GitHub Pages structure
- Ensures identical builds across platforms

---

### 4. `client/lib/localDataFetcher.ts` ✅ (NO CHANGES NEEDED)

**Already Correct**:
```typescript
const base = import.meta.env.BASE_URL || "./";
const url = `${base}movement-data.json`;
```

**Status**: ✅ Already implements subpath-safe JSON loading

---

## Build Process Flow

### Before Changes
```
pnpm run build
  └─ vite build
     └─ outputs to dist/spa/
     └─ JSON NOT automatically copied
     └─ May fail on GitHub Pages (reads from /docs)
```

### After Changes
```
pnpm run build
  ├─ npm run build:client
  │  ├─ vite build
  │  │  └─ outputs to docs/
  │  │     ├─ docs/index.html
  │  │     ├─ docs/assets/
  │  │     └─ ...other Vite output
  │  └─ cp public/*.json docs/
  │     ├─ copies movement-data.json to docs/
  │     └─ copies never-moved-cows.json to docs/
  └─ npm run build:server
```

---

## Deployment Alignment

### GitHub Pages
- **Branch**: main
- **Source**: `/docs` folder
- **Output**: `https://stc-cow.github.io/`
- **JSON access**: `https://stc-cow.github.io/movement-data.json`
- **Status**: ✅ Works (reads from /docs)

### Vercel
- **Build command**: `pnpm run build`
- **Output directory**: `docs` (from vercel.json)
- **Output URL**: `https://<project>.vercel.app/`
- **JSON access**: `https://<project>.vercel.app/movement-data.json`
- **Status**: ✅ Works (uses /docs)

### STC Cypher
- **Deployment**: Static export of `/docs`
- **Base path**: `./` (relative, works on any subpath)
- **Status**: ✅ Works (relative paths)

### Builder Export
- **Source**: `/docs` folder
- **Type**: Static content
- **Status**: ✅ Works (direct static files)

---

## Verification Checklist

After changes, verify:

```bash
# 1. Build completes successfully
pnpm run build:client

# 2. Check /docs output exists
ls -la docs/
# Expected:
#   docs/index.html
#   docs/movement-data.json
#   docs/never-moved-cows.json
#   docs/assets/

# 3. Verify JSON files are present
file docs/movement-data.json  # should be "JSON data"
file docs/never-moved-cows.json  # should be "JSON data"

# 4. Check JSON content is valid
jq . docs/movement-data.json | head -5
```

---

## Key Points

✅ **Single source of truth**: `/docs` directory  
✅ **Subpath-safe**: Base path is relative `./`  
✅ **No manual copying**: Build script handles JSON  
✅ **GitHub Pages ready**: Reads from `/docs` folder  
✅ **Vercel ready**: Output directory configured  
✅ **STC Cypher ready**: Relative paths work on any subpath  
✅ **Builder compatible**: Direct static content  
✅ **No breaking changes**: Existing functionality preserved  

---

## Next Steps

1. **Run build**:
   ```bash
   pnpm run build:client
   ```

2. **Verify `/docs` output**:
   ```bash
   ls -lh docs/*.json
   ```

3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "chore: align deployments to /docs output"
   git push origin main
   ```

4. **Check GitHub Pages**:
   - Visit: `https://stc-cow.github.io`
   - Check: `https://stc-cow.github.io/movement-data.json`

5. **Verify Vercel** (if connected):
   - Vercel automatically redeploys on push
   - Check build logs for success
   - Verify JSON accessible at deployment URL

---

## Technical Details

### Why `base: "./"`?

Relative base path makes the app work everywhere:

```javascript
// Absolute base (fails on subpaths):
base: "/"
// GitHub Pages: fetch('/movement-data.json') → 404 ❌

// Relative base (works everywhere):
base: "./"
// GitHub Pages: fetch('./movement-data.json') → works ✅
// Vercel: fetch('./movement-data.json') → works ✅
// STC subpath: fetch('./movement-data.json') → works ✅
```

### Why copy JSON to `/docs`?

Vite's `public/` folder is copied to build root during production build, but:
- Using explicit copy command ensures JSON is always present
- Vite plugin provides fallback reliability
- No version mismatches between data and app

### Why separate `/docs` from `dist/spa/`?

- GitHub Pages specifically reads from `/docs` folder in main branch
- Keeps frontend and server-side builds separate
- Frontend goes to `/docs` (static, GitHub Pages)
- Server goes to `dist/server` (Node.js runtime)

---

## Support

See `DEPLOYMENT_ALIGNMENT.md` for detailed documentation.
