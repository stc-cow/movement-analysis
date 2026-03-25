# COW Analytics

COW Analytics is a dashboard for tracking COW movement activity, warehouse idle time, utilization, event activity, and regional trends.

The goal of the app is to help users quickly understand:

- how many COWs moved
- which COWs stayed at warehouses
- how long they stayed there
- which regions, vendors, and movement types are most active

## App idea

This project turns movement data into a visual dashboard for operations and analysis.

It is designed for:

- warehouse idle time analysis
- movement classification review
- executive summary reporting
- COW filtering and drill-down exploration

## Layout of the app

The dashboard is arranged in a few clear sections:

### 1. Top header

- App title and brand area
- Global filters for year, region, vendor, and type
- A short note showing the active analysis range

### 2. Tab navigation

Each tab opens a different analysis area:

- Executive Overview
- Never Moved COWs
- Warehouse Analysis
- Warehouse HUB Time
- COW Utilization
- Events Analysis
- Royal / EBU
- Top Events Movement

### 3. Main content cards

Each tab shows cards, charts, maps, and tables that explain the data in different ways.

For example:

- KPI cards for totals and counts
- Donut and bar charts for movement breakdowns
- Map views for geographic distribution
- Tables for detailed row-by-row review

### 4. Warehouse HUB Time section

This card shows:

- off-air warehouse aging
- short idle time buckets
- a detail table for COW idle behavior
- modal popups for deeper inspection

## How it works

The dashboard uses **local JSON files** as its data source.

These files live in the `public/` folder:

- `public/movement-data.json`
- `public/never-moved-cows.json`

The app loads those files directly in the browser, so it does not need a separate API for normal use.

### Data flow

1. Source movement data is converted into JSON
2. The dashboard loads the JSON files from `public/`
3. The data is cleaned and classified in the app
4. The cards, charts, and tables update from that data
5. Filters narrow the view without changing the source files

### What the conversion script does

If the source spreadsheet changes, regenerate the JSON files with:

```bash
pnpm exec node convert-csv-to-json.mjs
```

That script updates the dashboard files used by the app.

## Run the project

```bash
pnpm install
pnpm dev
```

## Build for production

```bash
pnpm build
```

## Available scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the app in development mode |
| `pnpm build` | Build the client and server output |
| `pnpm build:client` | Build the client into `docs/` |
| `pnpm build:server` | Build the server bundle |
| `pnpm start` | Start the production server bundle |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm format.fix` | Format the codebase |

## Deployment

The project is ready for static hosting and can be deployed with:

- Vercel
- GitHub Pages
- Netlify

The production client build is written to `docs/`.

## Project structure

```text
client/   Frontend app
server/   Express server used in development and production bundle
shared/   Shared types and models
public/   JSON data and static files
docs/    Production client build output
```

## Troubleshooting

### Dashboard looks empty

- Make sure `public/movement-data.json` exists
- Make sure `public/never-moved-cows.json` exists
- Regenerate the JSON files if the source sheet changed

### Production page is blank

- Rebuild the project
- Confirm the deployment is serving the `docs/` folder
- Check that `docs/index.html` and `docs/assets/` were created

## Notes

- The dashboard is designed to work directly in the browser
- No manual backend setup is required for normal use
- The JSON files in `public/` are the source of truth for the dashboard
