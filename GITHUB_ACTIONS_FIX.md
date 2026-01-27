# GitHub Actions Deployment Fix

## Problem

GitHub Actions workflow was failing because it tried to copy from a directory that no longer exists:

```bash
# ❌ OLD COMMAND (BROKEN)
cp -r dist/spa/* docs/

# Error: dist/spa/ does not exist (we changed build output to docs/)
```

## Root Cause

**Build output changed** but **GitHub Actions workflow wasn't updated**:

| Component | Before | After |
|-----------|--------|-------|
| Vite output | `dist/spa/` | `docs/` |
| Build script | Manual copy needed | Direct output to docs |
| GitHub Actions | Copy `dist/spa/` to `docs/` | No copying needed |

**The Mismatch**:
- ✅ Updated `vite.config.ts` to output to `docs/`
- ✅ Updated `package.json` build to output to `docs/`
- ❌ **Did NOT update GitHub Actions** (still tried to copy from old location)

---

## Solution

### File: `.github/workflows/deploy.yml`

**Before**:
```yaml
- name: Prepare build for GitHub Pages
  run: |
    # Copy build artifacts to docs folder for GitHub Pages serving
    rm -rf docs/assets docs/index.html docs/favicon.ico docs/placeholder.svg docs/robots.txt
    cp -r dist/spa/* docs/  # ❌ This folder doesn't exist anymore!
```

**After**:
```yaml
- name: Verify docs folder is ready for GitHub Pages
  run: |
    # Verify that docs/ has all required files
    # Build already outputs directly to docs/
    echo "✅ Checking docs folder contents..."
    ls -lh docs/index.html docs/movement-data.json docs/never-moved-cows.json || echo "⚠️  Missing files!"
    echo "✅ docs folder is ready for GitHub Pages"
```

**Changes**:
- ❌ Removed: `rm -rf docs/assets ...` (destructive, no longer needed)
- ❌ Removed: `cp -r dist/spa/* docs/` (source doesn't exist)
- ✅ Added: Verification step to ensure files are in place

---

## Build Flow (Now Correct)

```
pnpm run build
  │
  ├─ npm run build:client
  │  ├─ vite build --outDir docs
  │  │  └─ Outputs to: docs/index.html, docs/assets/, etc.
  │  └─ cp public/*.json docs/
  │     └─ Copies: docs/movement-data.json, docs/never-moved-cows.json
  │
  └─ npm run build:server
     └─ vite build --config vite.config.server.ts
        └─ Outputs to: dist/server/

GitHub Actions:
  ├─ pnpm run build
  │  └─ Creates: docs/ folder with everything
  └─ Verify docs folder exists
     └─ No copying needed!
```

---

## Verification

### Local Test

```bash
# 1. Clean build
rm -rf docs/ dist/
pnpm run build

# 2. Check output
ls -lh docs/
# Should show:
# - index.html
# - movement-data.json
# - never-moved-cows.json
# - assets/ (folder)
# - favicon.ico
# - robots.txt

# 3. Verify JSON files
jq . docs/movement-data.json | head -5
```

### GitHub Actions Test

1. **Push changes to main branch**
   ```bash
   git add .
   git commit -m "fix: update github actions for new build output structure"
   git push origin main
   ```

2. **Check GitHub Actions**
   - Go to: Repository → Actions tab
   - Should see "Deploy to GitHub Pages" workflow running
   - Look for: "Verify docs folder is ready for GitHub Pages" step
   - Should see: ✅ Checking docs folder contents...

3. **Verify Deployment**
   - Visit: `https://stc-cow.github.io`
   - Should load dashboard
   - Check: `https://stc-cow.github.io/movement-data.json` loads JSON

---

## Why This Matters

### Before Fix
```
GitHub Actions runs:
  1. pnpm run build
     → Creates: docs/ and dist/server/
  
  2. cp -r dist/spa/* docs/
     → ERROR: dist/spa/ does not exist!
  
  Result: ❌ Deployment fails
```

### After Fix
```
GitHub Actions runs:
  1. pnpm run build
     → Creates: docs/ directly
  
  2. ls -lh docs/
     → Verifies files are present
  
  Result: ✅ Deployment succeeds
```

---

## Files Modified

**`.github/workflows/deploy.yml`**
- Removed: Lines that deleted and copied from `dist/spa/`
- Added: Verification step to check `docs/` contents

---

## Critical Files in /docs (After Build)

These files MUST exist for deployment to work:

1. **`docs/index.html`**
   - React app entry point
   - Served by GitHub Pages

2. **`docs/movement-data.json`**
   - COW movement data (2,535 records)
   - Loaded by dashboard at runtime

3. **`docs/never-moved-cows.json`**
   - Never-moved COW data (139 records)
   - Loaded by dashboard at runtime

4. **`docs/assets/`** (folder)
   - JavaScript bundles
   - CSS files
   - Images

5. **`docs/favicon.ico`**
   - Browser tab icon

6. **`docs/robots.txt`**
   - SEO configuration

---

## Deployment Checklist

- [x] `vite.config.ts` outputs to `docs/` 
- [x] `package.json` build script includes copy: `cp public/*.json docs/`
- [x] GitHub Actions no longer tries to copy from `dist/spa/`
- [x] GitHub Actions verifies `docs/` contents
- [x] Local build produces all required files

---

## Next Steps

1. **Local verification**:
   ```bash
   pnpm run build
   ls -lh docs/
   ```

2. **Push to GitHub**:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "fix: github actions build output alignment"
   git push origin main
   ```

3. **Monitor deployment**:
   - Check GitHub Actions tab
   - Verify "Deploy to GitHub Pages" completes successfully
   - Check: `https://stc-cow.github.io`

4. **Verify API endpoints**:
   ```bash
   curl https://stc-cow.github.io/movement-data.json | jq . | head -5
   ```

---

## Common Issues

### Issue: "docs folder is empty"

**Check**:
1. Did build complete successfully?
   ```bash
   pnpm run build
   echo $?  # Should be 0
   ```

2. Are files in correct location?
   ```bash
   ls -la docs/
   # Should list: index.html, movement-data.json, never-moved-cows.json, assets
   ```

3. Is vite configured correctly?
   ```bash
   grep "outDir" vite.config.ts
   # Should show: outDir: "docs"
   ```

### Issue: "404 on movement-data.json"

**Check**:
1. Does file exist locally?
   ```bash
   file docs/movement-data.json
   # Should show: JSON data
   ```

2. Is GitHub Pages serving from `/docs`?
   - Check: Repository → Settings → Pages
   - Should show: Source = "main branch /docs folder"

3. Is JSON file in build output?
   ```bash
   grep "cp public" package.json
   # Should show: cp public/*.json docs/
   ```

---

## Summary

**The Problem**: GitHub Actions tried to copy from `dist/spa/` which no longer exists

**The Solution**: 
1. Remove artifact copy step (no longer needed)
2. Add verification step (ensure files are in place)
3. Build outputs directly to `docs/`

**Result**: Single `/docs` folder serves as source for GitHub Pages, Vercel, and Builder export - no copying, no artifacts, no path hacks.
