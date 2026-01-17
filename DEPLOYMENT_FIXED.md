# GitHub Pages Deployment - All Fixes Applied ✅

## What Was Fixed

### ❌ Removed (Netlify & Vercel)
- ✅ Deleted `netlify.toml`
- ✅ Deleted `vercel.json`
- ✅ Deleted `netlify/functions/` directory (all serverless functions)

### ✅ Updated (API Endpoint Configuration)
- ✅ `client/hooks/useDashboardData.ts` - Now uses `VITE_API_BASE_URL` environment variable
- ✅ `client/pages/Dashboard.tsx` - Never-Moved-COWs fetch now uses `VITE_API_BASE_URL`
- ✅ Created `.env.example` - Template for environment configuration

### 📚 Documentation Created
- ✅ `GITHUB_PAGES_BACKEND_SETUP.md` - Complete deployment guide

## The Problem (Solved)

GitHub Pages is **static hosting only** - it cannot run Express server. The app was getting 404 errors because:

```
❌ OLD APPROACH:
GitHub Pages tries → GET /api/data/processed-data → 404 (no backend)
                   → GET /api/data/never-moved-cows → 404 (no backend)

✅ NEW APPROACH:
GitHub Pages → Calls backend at: VITE_API_BASE_URL/api/data/processed-data
(Points to real backend server running elsewhere)
```

## Architecture

```
Frontend (GitHub Pages)          Backend (Separate Server)      Data (Google Sheets)
https://stc-cow.github.io/  →  https://your-backend.com  →   CSV Sheets
                                /api/data/processed-data       (Single Source)
                                /api/data/never-moved-cows
```

## What You Need To Do Now

### Step 1: Deploy Backend Server

Choose ONE of these options:

#### 🚀 Option A: Railway.app (Easiest, Free tier)
1. Go to https://railway.app
2. Sign up with GitHub
3. New Project → Deploy from GitHub
4. Select this repository
5. Railway will auto-detect and deploy Express server
6. Get your backend URL (e.g., `https://cmms-production.up.railway.app`)

#### 🚀 Option B: Render.com (Also easy, Free tier)
1. Go to https://render.com
2. New Web Service → Connect GitHub repo
3. Build Command: `npm install`
4. Start Command: `npm run dev`
5. Deploy and get your URL (e.g., `https://cmms-api.onrender.com`)

#### 🚀 Option C: Self-hosted (VPS/Cloud VM)
```bash
ssh your-server@your-ip
git clone <your-repo>
cd <your-repo>
npm install
npm run dev  # or use PM2 for background
```

### Step 2: Set Backend URL in GitHub

1. Go to **GitHub Repo → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Create secret:
   - Name: `API_BASE_URL`
   - Value: `https://your-backend-server.com` (without trailing slash)
   - Examples:
     - `https://cmms-production.up.railway.app`
     - `https://cmms-api.onrender.com`
     - `https://api.your-domain.com`

### Step 3: Update GitHub Actions Workflow

The workflow needs to build with the backend URL:

**File: `.github/workflows/jekyll-gh-pages.yml`**

Replace the build step with:

```yaml
- name: Build Vite app with GitHub Pages base path and API endpoint
  env:
    GITHUB_PAGES: "true"
    VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
  run: pnpm run build:client
```

### Step 4: Push and Deploy

```bash
git add .
git commit -m "Fix GitHub Pages deployment with backend API"
git push origin main
```

GitHub Actions will:
1. Build the React app with `VITE_API_BASE_URL` pointing to your backend
2. Deploy to `/docs` folder
3. Push to main branch

### Step 5: Verify It Works

1. Visit https://stc-cow.github.io
2. Open **DevTools → Console** (F12)
3. Should see: `✓ Loaded data: 2535 movements, 428 cows`
4. Never-Moved-COWs card should show 118 COWs

## Testing

### Test Local Development
```bash
npm run dev
# Opens http://localhost:8080
# Uses /api (local backend on :8080)
```

### Test Backend API Directly
```bash
# Check if backend is working:
curl https://your-backend-server.com/api/data/diagnostic

# Should return JSON with Google Sheets connection info
```

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 404: API error | Backend URL not set | Set `API_BASE_URL` in GitHub Secrets |
| CORS error | CORS not configured on backend | Ensure `server/index.ts` has CORS enabled |
| Timeout | Backend too slow | Google Sheets fetch takes time (~10s) |
| Blank dashboard | Frontend not loading backend data | Check browser console for API errors |

## Files Summary

### Removed
- ❌ `netlify.toml`
- ❌ `vercel.json`
- ❌ `netlify/functions/` (all serverless code)

### Created/Updated
- ✅ `.env.example` - Configuration template
- ✅ `client/hooks/useDashboardData.ts` - Uses `VITE_API_BASE_URL`
- ✅ `client/pages/Dashboard.tsx` - Uses `VITE_API_BASE_URL`
- ✅ `GITHUB_PAGES_BACKEND_SETUP.md` - Full deployment guide
- ✅ `DEPLOYMENT_FIXED.md` - This file (summary)

### Unchanged (Still Working)
- ✅ `server/routes/data.ts` - Backend API endpoints
- ✅ `.github/workflows/jekyll-gh-pages.yml` - GitHub Actions (needs API_BASE_URL update)
- ✅ `vite.config.ts` - Build configuration
- ✅ All React components (use data hook correctly)

## Environment Variables

| Variable | Where | Value | Example |
|----------|-------|-------|---------|
| `VITE_API_BASE_URL` | GitHub Secrets | Backend server URL | `https://api.railway.app` |
| `GITHUB_PAGES` | GitHub Actions | `true` | (auto-set) |
| `GITHUB_REPOSITORY` | GitHub Actions | `owner/repo` | (auto-set) |

## How It Works Now

1. **GitHub Actions builds** the React app and passes `VITE_API_BASE_URL`
2. **React app** stores API base URL (default: `/api` for dev)
3. **At runtime**, frontend makes requests to `{VITE_API_BASE_URL}/api/data/processed-data`
4. **Backend server** (running on your chosen platform) handles requests
5. **Backend fetches** from Google Sheets and returns data
6. **Frontend displays** dashboard with real data

## Next: Quick Start

```bash
# 1. Deploy backend (pick one option from Step 1)
# 2. Get backend URL from deployment

# 3. Set GitHub Secret
# Go to: Repo → Settings → Secrets → API_BASE_URL = your-url

# 4. Update workflow (add VITE_API_BASE_URL env to build step)

# 5. Push code
git push origin main

# 6. Wait 2-3 minutes for GitHub Actions
# 7. Visit https://stc-cow.github.io
# 8. Check console: should show ✓ Loaded data...
```

---

**Questions?** See `GITHUB_PAGES_BACKEND_SETUP.md` for detailed instructions.
