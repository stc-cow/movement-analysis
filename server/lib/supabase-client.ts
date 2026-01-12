/**
 * @deprecated Supabase integration has been removed as of the single source of truth migration
 *
 * The application now uses a single source of truth: Google Sheets
 * All data is fetched from the published CSV URL:
 * https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1539310010&single=true&output=csv
 *
 * See: server/routes/data.ts for the current data pipeline
 *
 * This file is kept for reference only and should NOT be used.
 */

// Stub exports to prevent import errors
export function getSupabaseServer() {
  throw new Error(
    "Supabase integration has been removed. Use Google Sheets as the single source of truth.",
  );
}

export function getSupabasePublic() {
  throw new Error(
    "Supabase integration has been removed. Use Google Sheets as the single source of truth.",
  );
}

export const supabaseServer = null;
export const supabasePublic = null;

export function isSupabaseConfigured(): boolean {
  return false;
}

export async function fetchFromSupabase() {
  throw new Error(
    "Supabase integration has been removed. Use Google Sheets as the single source of truth.",
  );
}
