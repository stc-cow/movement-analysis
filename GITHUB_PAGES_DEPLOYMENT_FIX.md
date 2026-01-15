# GitHub Pages Deployment Fix

## Problem

Your app shows a blank page at `https://stc-cow.github.io/cmms-2Fanalysis/` despite GitHub Actions reporting a successful deployment.

## Root Causes Fixed

### 1. ✅ Missing `GITHUB_PAGES` Environment Variable

**Fixed:** Added `GITHUB_PAGES: "true"` to both workflows

- This tells `vite.config.ts` to extract the repository name and set the correct base path
- The app now builds with `base: /cmms-2Fanalysis/`

### 2. ✅ Jekyll Processing Interfering with SPA

**Fixed:** Added `.nojekyll` file to the `public/` folder

- Tells GitHub Pages to NOT process your app with Jekyll
- Prevents modification of your static files

### 3. ✅ SPA Routing on Subpath

**Fixed:** Updated `404.html` to handle client-side routing

- GitHub Pages serves `404.html` when a route doesn't exist
- The SPA can now handle all routing through React Router

### 4. ✅ Build Configuration

**Fixed:** Updated `jekyll-gh-pages.yml` workflow to properly:

- Set `GITHUB_PAGES=true` environment variable during build
- Use the correct Node and pnpm versions
- Deploy directly to GitHub Pages (not the docs folder)

## Files Changed

1. **`.github/workflows/jekyll-gh-pages.yml`** ← New deployment workflow
   - Builds the Vite app with `GITHUB_PAGES=true`
   - Uploads to GitHub Pages automatically
   - Cleaner than copying to `docs/` folder

2. **`.github/workflows/deploy.yml`** ← Updated existing workflow
   - Now sets `GITHUB_PAGES=true` during build
   - Continues to use `docs/` folder as source (if configured)

3. **`public/.nojekyll`** ← New file
   - Prevents Jekyll processing
   - Must be deployed with your app

4. **`public/404.html`** ← Updated
   - Handles SPA routing on subpaths
   - Redirects 404s to index.html for client-side routing

## What You Need to Do

### Option A: Use the New `jekyll-gh-pages.yml` (Recommended)

1. Go to your GitHub repository settings
2. Navigate to **Settings → Pages**
3. Under "Build and deployment":
   - Set **Source** to `Deploy from a branch`
   - Set **Branch** to `gh-pages` (not `main`)
4. Save changes
5. Wait for the workflow to complete (check **Actions** tab)

### Option B: Keep Using `deploy.yml`

1. Go to your GitHub repository settings
2. Navigate to **Settings → Pages**
3. Under "Build and deployment":
   - Set **Source** to `Deploy from a branch`
   - Set **Branch** to `main`
   - Set **Folder** to `/docs`
4. The existing `deploy.yml` already copies the built app to `docs/`

## How It Works Now

1. **Vite Configuration** (`vite.config.ts`):

   ```typescript
   const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1]; // "cmms-2Fanalysis"
   const isGitHubPages = process.env.GITHUB_PAGES === "true"; // true
   const base = isGitHubPages && repoName ? `/${repoName}/` : "/"; // "/cmms-2Fanalysis/"
   ```

2. **Build Process**:
   - Assets are referenced with the correct base path
   - `import.meta.env.BASE_URL` is set to `/cmms-2Fanalysis/`
   - React Router basename is `/cmms-2Fanalysis/`

3. **Deployment**:
   - GitHub Actions builds the app with proper paths
   - Files are served from GitHub Pages
   - Your SPA routes work correctly at `/cmms-2Fanalysis/*`

4. **404 Handling**:
   - Routes like `/cmms-2Fanalysis/some-route` don't exist as static files
   - GitHub Pages serves `404.html`
   - `404.html` redirects to index.html
   - React Router handles the routing

## Verification Checklist

- [ ] GitHub Pages source is correctly configured (gh-pages branch OR docs folder)
- [ ] The `.nojekyll` file is present in the deployment
- [ ] The workflow has completed successfully (green checkmark in Actions)
- [ ] Try refreshing the GitHub Pages URL
- [ ] Check browser console (F12) for any JavaScript errors
- [ ] Try accessing a route like `/cmms-2Fanalysis/dashboard`

## Still Seeing a Blank Page?

1. **Clear browser cache**: Use Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
2. **Check browser console**: Open DevTools (F12) and look for errors
3. **Verify GitHub Pages settings**:
   - Go to Settings → Pages
   - Check the source is correctly configured
   - Verify it's using the gh-pages branch or docs folder as expected
4. **Check deployment**:
   - Go to **Actions** tab
   - Verify the latest workflow run completed successfully
   - All steps should have green checkmarks
5. **Wait for propagation**: GitHub Pages can take 1-2 minutes to update after a new deployment

## Rollback

If you need to revert to a previous working version:

1. You can disable `jekyll-gh-pages.yml` and keep using `deploy.yml`
2. Make sure `GITHUB_PAGES: "true"` is set in the workflow you use
3. Redeploy by pushing a commit to main
