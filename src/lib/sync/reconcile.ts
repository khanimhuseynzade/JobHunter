import { getDb } from "@/lib/db";
import { fetchSyncStatus } from "@/lib/sync-log";
import { cleanupDuplicateBoardJobs } from "./cleanup-duplicates";
import { runBoardSync } from "./run-board-sync";
import { runCompanySync } from "./run-company-sync";

const RECONCILE_COOLDOWN_MS = 30 * 60 * 1000;
const STALE_MS_PRODUCTION = 12 * 60 * 60 * 1000;
const STALE_MS_DEVELOPMENT = 60 * 60 * 1000;

let reconcileInFlight = false;
let lastReconcileAt = 0;

function staleThresholdMs(): number {
  return process.env.NODE_ENV === "production"
    ? STALE_MS_PRODUCTION
    : STALE_MS_DEVELOPMENT;
}

function isSyncStale(latest: string | null): boolean {
  if (!latest) return true;
  return Date.now() - new Date(latest).getTime() > staleThresholdMs();
}

/** Re-apply duplicate keeper rules and sync when listings are out of date. */
export async function reconcileJobsIfNeeded(): Promise<void> {
  const db = getDb();
  if (!db) return;

  if (reconcileInFlight) return;
  if (Date.now() - lastReconcileAt < RECONCILE_COOLDOWN_MS) return;

  reconcileInFlight = true;
  lastReconcileAt = Date.now();

  try {
    await cleanupDuplicateBoardJobs();

    const status = await fetchSyncStatus();
    if (!isSyncStale(status.latest)) return;

    await runBoardSync();
    await runCompanySync();
  } finally {
    reconcileInFlight = false;
  }
}
