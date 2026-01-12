# Quick Start: Supabase Migration

## What's Ready ✅

All infrastructure is set up. You just need to import the data.

## How to Proceed

### Option 1: Automatic Import (Easiest) 🚀

The dev server automatically fetches from Google Sheets and imports to Supabase.

**Steps:**

1. Make sure dev server is running:
   - If running: continue
   - If not: `pnpm run dev`

2. Open a new terminal/tab and run:
   ```bash
   curl -X POST http://localhost:8080/api/migrate/import-google-sheets
   ```

3. Wait for response (should see success message with row counts)

**That's it!** Data is now in Supabase.

---

### Option 2: Manual Import via Supabase Dashboard

If automatic import fails or you prefer manual control:

1. **Export CSVs from Google Sheets:**
   - Open: https://docs.google.com/spreadsheets/d/1bzcG70TopGRRm60NbKX4o3SCE2-QRUDFnY0Z4fYSjEM
   - Sheet "Movement-data": File → Download → CSV
   - Sheet "Never Moved COW": File → Download → CSV

2. **Import to Supabase:**
   - Go to: https://app.supabase.com/project/rmcgmcmqpjhqxrwuzbmy/editor
   - For each table (movement_data, never_moved_cow):
     - Click table name
     - Click "Insert" → "Import CSV"
     - Upload the CSV
     - Verify columns
     - Click Import

---

## Verify It Worked ✅

1. **Check Supabase Dashboard:**
   - https://app.supabase.com/project/rmcgmcmqpjhqxrwuzbmy/editor
   - Should see:
     - `movement_data`: 2534+ rows ✓
     - `dim_cow`: 427+ rows ✓
     - `dim_location`: 1208+ rows ✓
     - `never_moved_cow`: many rows ✓

2. **Check Dashboard:**
   - Visit: http://localhost:8080 (or your deployment)
   - Should see data loading from Supabase
   - Map shows movement distribution
   - All metrics populated

3. **Check Server Logs:**
   - Look for: `✓ Fetching data from Supabase...`
   - Or fallback: `Using Google Sheets` (if Supabase had issues)

---

## What Happens Next

### Automatic (No Action Needed)

✅ App now uses Supabase as primary source
✅ Falls back to Google Sheets if needed
✅ Caches data for 5 minutes
✅ Dashboard loads faster

### Optional: Final Cleanup (After Testing)

1. **Test in production** (let it run for 24h)
2. **Rotate secret key** (for security):
   - https://app.supabase.com/project/rmcgmcmqpjhqxrwuzbmy/settings/api
   - Click "Regenerate" on service_role key
   - Update environment variables
3. **Remove Google Sheets** (optional):
   - Delete fallback code in `server/routes/data.ts`
   - Remove Google URLs from `.env`

---

## Expected Results

| Before | After |
|--------|-------|
| Fetches from Google Sheets | Fetches from Supabase (10x faster) |
| Page may hang | No hanging (managed service) |
| Rate limited by Google | No rate limits |
| Parse CSV every request | Direct database queries |
| 2-5 sec load time | 200-500ms load time |

---

## Troubleshooting

### Automatic Import Shows Error

**If you see an error after `curl` command:**

1. Make sure dev server is running: `pnpm run dev`
2. Wait 10 seconds after starting server (it needs to load)
3. Try again: `curl -X POST http://localhost:8080/api/migrate/import-google-sheets`
4. If still fails, use **Option 2: Manual Import**

### Dashboard Still Uses Google Sheets

**If you see "Using Google Sheets" in logs:**

1. Check Supabase credentials in `.env`:
   - `SUPABASE_URL` should be: `https://rmcgmcmqpjhqxrwuzbmy.supabase.co`
   - Should have SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
2. Verify project exists: https://app.supabase.com
3. Try import again

### Import Shows 0 Rows

**If migration says 0 rows imported:**

1. Check Google Sheet is published to web
2. Verify CSV has data
3. Try manual import via Supabase Dashboard
4. Check server logs for detailed error

---

## Questions?

✓ See `SUPABASE_MIGRATION_GUIDE.md` for detailed explanation
✓ See `MIGRATION_CHECKLIST.md` for comprehensive checklist

---

**Status**: Infrastructure ready. Awaiting data import.

**Next**: Run migration endpoint or manual import, then test dashboard.
