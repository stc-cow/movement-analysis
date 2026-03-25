# COW Analytics

COW Analytics is a simple dashboard for viewing COW movement activity, warehouse time, events, utilization, and regional trends.

## What you can do here

- See overall dashboard summaries
- Check warehouse HUB time and idle periods
- Review movement, event, and utilization charts
- Filter the data by year, region, vendor, and type

## How the app gets its data

The dashboard uses local JSON files in the `public/` folder:

- `public/movement-data.json`
- `public/never-moved-cows.json`

That means the app can run directly in the browser without a separate backend.

## Run the project

```bash
pnpm install
pnpm dev
```

## Build for production

```bash
pnpm build
```

## Update the data

If the source sheet changes, regenerate the JSON files first:

```bash
pnpm exec node convert-csv-to-json.mjs
```

## Deployment

The project is ready for static hosting and can be deployed with:

- Vercel
- GitHub Pages
- Netlify

## Need to check something?

- If the dashboard looks empty, make sure the JSON files exist in `public/`
- If production looks blank, rebuild the project and confirm the deployment is serving the `docs/` folder
