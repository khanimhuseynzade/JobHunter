import { getDb } from "@/lib/db";
import { cleanupDuplicateBoardJobs } from "./cleanup-duplicates";

const RECONCILE_COOLDOWN_MS = 30 * 60 * 1000;

let reconcileInFlight = false;
let lastReconcileAt = 0;

/**
 * Re-apply duplicate keeper rules on page load. Actual job syncing happens
 * ONLY via the twice-daily Vercel cron (/api/cron/sync-all), so this never
 * runs a full sync or writes a sync_logs row. That keeps the "Last updated"
 * timestamp tied strictly to the scheduled 10 AM / 3 PM runs instead of
 * jumping to the time of a page visit.
 */
export async function reconcileJobsIfNeeded(): Promise<void> {
  const db = getDb();
  if (!db) return;

  if (reconcileInFlight) return;
  if (Date.now() - lastReconcileAt < RECONCILE_COOLDOWN_MS) return;

  reconcileInFlight = true;
  lastReconcileAt = Date.now();

  try {
    await cleanupDuplicateBoardJobs();
  } finally {
    reconcileInFlight = false;
  }
}
