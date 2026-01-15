# GitHub Pages Deployment Fix

## Problem

Your app shows a blank page at `https://stc-cow.github.io/cmms-2Fanalysis/` despite GitHub Actions reporting a successful deployment.

## Root Causes Fixed

### 1. ✅ Missing `GITHUB_PAGES` Environment Variable

**Fixed:** Added `GITHUB_PAGES: "true"` to workflows

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
- Copy built app to `docs/` folder
- Commit and push to main branch (no gh-pages branch needed)

## Files Changed

1. **`.github/workflows/jekyll-gh-pages.yml`** ← New deployment workflow
   - Builds the Vite app with `GITHUB_PAGES=true`
   - Copies built app to `docs/` folder
   - Commits and pushes to main branch

2. **`.github/workflows/deploy.yml`** ← Updated existing workflow
   - Now sets `GITHUB_PAGES=true` during build
   - Continues to use `docs/` folder as source

3. **`public/.nojekyll`** ← New file
   - Prevents Jekyll processing
   - Must be deployed with your app

4. **`public/404.html`** ← Updated
   - Handles SPA routing on subpaths
   - Redirects 404s to index.html for client-side routing

## What You Need to Do

1. Go to your GitHub repository settings
2. Navigate to **Settings → Pages**
3. Under "Build and deployment":
   - Set **Source** to `Deploy from a branch`
   - Set **Branch** to `main`
   - Set **Folder** to `/docs`
4. **Save** the settings
5. Push your code to main (or trigger the workflow manually from **Actions** tab)

The `jekyll-gh-pages.yml` workflow will:

- Build your Vite app with the correct base path
- Copy the built app to the `docs/` folder
- Commit and push the changes to main
- GitHub Pages will automatically serve from `/docs`

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
   - Built app is copied to `docs/` folder
   - Changes are committed and pushed to main branch
   - GitHub Pages serves from the `docs/` folder

4. **404 Handling**:
   - Routes like `/cmms-2Fanalysis/some-route` don't exist as static files
   - GitHub Pages serves `404.html`
   - `404.html` redirects to index.html
   - React Router handles the routing

## Verification Checklist

- [ ] GitHub Pages source is correctly configured (main branch, `/docs` folder)
- [ ] The `.nojekyll` file is present in the `docs/` folder after deployment
- [ ] The workflow has completed successfully (green checkmark in Actions)
- [ ] The workflow pushed new commits to main with built app in `docs/`
- [ ] Try refreshing the GitHub Pages URL in your browser
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Check browser console (F12) for any JavaScript errors
- [ ] Try accessing a route like `/cmms-2Fanalysis/dashboard`

## Still Seeing a Blank Page?

### Step 1: Check Docs Folder

Make sure files were copied to the `docs/` folder:

```bash
# The docs folder should contain these files after deployment:
docs/
├── .nojekyll
├── index.html
├── 404.html
├── assets/
└── ... other build files
```

### Step 2: Verify GitHub Pages Configuration

- Go to **Settings → Pages**
- Make sure it shows "Your site is published at https://stc-cow.github.io/cmms-2Fanalysis/"
- Branch should be "main" with folder "/docs"

### Step 3: Hard Refresh Your Browser

- Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
- Or open in Incognito/Private mode to bypass cache

### Step 4: Check Workflow Logs

- Go to **Actions** tab
- Click on the latest `jekyll-gh-pages` workflow run
- Verify all steps completed successfully (green checkmarks)
- Look for any error messages in the build step

### Step 5: Verify Workflow Pushed Changes

- Check the commits on main branch
- You should see new commits from `github-actions[bot]`
- These commits updated the `docs/` folder with the built app

## How to Trigger Deployment Manually

If you want to trigger the deployment without pushing code:

1. Go to **Actions** tab
2. Click on **Deploy to GitHub Pages** workflow
3. Click **Run workflow** button
4. The workflow will start building and deploying your app

## Additional Notes

- The workflow runs automatically on every push to `main`
- You can also trigger it manually from the Actions tab
- It takes about 1-2 minutes for GitHub Pages to update after deployment
- The `.nojekyll` file must exist in the `docs/` folder for the SPA to work correctly
