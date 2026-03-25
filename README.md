# COW Analytics

COW Analytics is a dashboard for analyzing COW movement data, warehouse idle time, utilization, events, and regional activity.

The app is built with React, Vite, TypeScript, Recharts, Highcharts, Leaflet, and Tailwind CSS.

## What this dashboard shows

- Executive summary KPIs
- Warehouse analysis
- Warehouse HUB time analysis
- COW utilization
- Events analysis
- Royal / EBU insights
- Top events movement analysis
- Never-moved COWs

## How the app works

This project uses **local JSON files** as the dashboard data source:

- `public/movement-data.json`
- `public/never-moved-cows.json`

The app loads those files directly in the browser, so the dashboard can run without a live backend.

## Requirements

- Node.js 18+ recommended
- pnpm 10+

## Install

```bash
pnpm install
```

## Run locally

```bash
pnpm dev
```

This starts the Vite development server with the dashboard UI.

## Build for production

```bash
pnpm build
```

Build output includes:

- `docs/` for the client app
- `dist/server/` for the server bundle

## Available scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the app in development mode |
| `pnpm build` | Build client and server output |
| `pnpm build:client` | Build the client into `docs/` |
| `pnpm build:server` | Build the server bundle |
| `pnpm start` | Start the production server bundle |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm format.fix` | Format the codebase |

## Updating the data

If the source spreadsheet or CSV changes, regenerate the JSON files before building:

```bash
pnpm exec node convert-csv-to-json.mjs
```

That updates the files used by the dashboard.

## Project structure

```text
client/   Frontend app
server/   Express server used in development and production bundle
shared/   Shared types and models
public/   JSON data and static files
docs/    Production client build output
```

## Deployment

This project is configured for static deployment and can be deployed with:

- Vercel
- GitHub Pages
- Netlify

The production client build is written to `docs/`.

## Troubleshooting

### Blank page in production

- Check that the app was built successfully
- Make sure the production build output includes `docs/index.html` and `docs/assets/`
- Confirm the deployment is serving the `docs/` folder

### No data on the dashboard

- Verify `public/movement-data.json` exists
- Verify `public/never-moved-cows.json` exists
- Regenerate the JSON files using the conversion script

### Charts look empty

- Check the browser console for data loading errors
- Make sure the JSON files contain recent movement data
- Rebuild the project after updating data files

## Notes

- The dashboard is designed to work directly in the browser
- No manual backend setup is required for normal use
- The data files in `public/` are the source of truth for the dashboard
