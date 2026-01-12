import { Router, Request, Response } from "express";

const router = Router();

/**
 * @deprecated Supabase migration routes have been removed
 * 
 * The application now uses a single source of truth: Google Sheets
 * All data is fetched directly from the published CSV URL:
 * https://docs.google.com/spreadsheets/d/e/2PACX-1vTFm8lIuL_0cRCLq_jIa12vm1etX-ftVtl3XLaZuY2Jb_IDi4M7T-vq-wmFIra9T2BiAtOKkEZkbQwz/pub?gid=1539310010&single=true&output=csv
 * 
 * Migration endpoints are no longer available and should not be used.
 * See: server/routes/data.ts for the current data pipeline
 */

/**
 * POST /api/migrate/import-google-sheets - DEPRECATED
 * This endpoint no longer functions as Supabase has been removed
 */
router.post("/import-google-sheets", async (req: Request, res: Response) => {
  res.status(410).json({
    error: "This endpoint has been deprecated",
    message:
      "Supabase integration has been removed. The application now uses Google Sheets as the single source of truth.",
    documentation:
      "See server/routes/data.ts for the current data pipeline",
  });
});

export default router;
