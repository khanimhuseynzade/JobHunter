import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs as jobsTable, syncLogs } from "@/lib/schema";
import { filters } from "../../../config/filters";
import { dedupeSyncJobs } from "./dedupe";
import type { SyncJobInput, SyncResult } from "./types";

function latencyFromPosted(postedDate: string | null): number | null {
  if (!postedDate) return null;
  const posted = new Date(postedDate).getTime();
  if (Number.isNaN(posted)) return null;
  return Math.max(0, Math.floor((Date.now() - posted) / 86400000));
}

export async function upsertSyncJobs(
  searchType: SyncResult["searchType"],
  sourceName: string,
  incoming: SyncJobInput[]
): Promise<Pick<SyncResult, "jobsFound" | "jobsNew" | "jobsUpdated">> {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL is required for sync");
  }

  const syncStartedAt = new Date().toISOString();
  let jobsNew = 0;
  let jobsUpdated = 0;
  const seenKeys: string[] = [];
  const unique = dedupeSyncJobs(incoming);

  for (const job of unique) {
    seenKeys.push(job.externalKey);
    const [existing] = await db
      .select({ id: jobsTable.id })
      .from(jobsTable)
      .where(eq(jobsTable.externalKey, job.externalKey))
      .limit(1);

    const mutableFields = {
      role: job.role,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      postedDate: job.postedDate,
      latencyDays: job.latencyDays ?? latencyFromPosted(job.postedDate),
      sourceType: job.sourceType,
      sourceName: job.sourceName,
      applyUrl: job.applyUrl,
      lastSeenAt: syncStartedAt,
      // Seen this run, so it's active again: clear the miss counter and any
      // stale "possibly closed" flag.
      missedSyncs: 0,
      possiblyClosed: false,
    };

    if (existing) {
      await db
        .update(jobsTable)
        .set(mutableFields)
        .where(eq(jobsTable.externalKey, job.externalKey));
      jobsUpdated += 1;
    } else {
      // Atomic upsert: overlapping sync runs (the jobs page fires
      // reconcileJobsIfNeeded via `after()` with no durable lock, and Vercel
      // instances don't share the in-memory guard) can both see "not existing"
      // and race to insert the same externalKey. A plain insert throws a
      // duplicate-key error that aborts the whole sync before writeSyncLog runs,
      // which keeps the data perpetually "stale" and re-runs the sync on nearly
      // every page load — making the job count drift on reload. ON CONFLICT
      // turns that race into a harmless update instead.
      await db
        .insert(jobsTable)
        .values({
          externalKey: job.externalKey,
          status: null,
          firstSeenAt: syncStartedAt,
          ...mutableFields,
        })
        .onConflictDoUpdate({
          target: jobsTable.externalKey,
          set: mutableFields,
        });
      jobsNew += 1;
    }
  }

  // Any job from this source that wasn't returned this run is a miss. Bump its
  // counter; pruneClosedJobs() (run once after all sources) turns a run of
  // misses into a deletion. We only touch this source's rows, and only when the
  // source actually returned something, so a failed/empty fetch never penalizes
  // its listings.
  if (seenKeys.length > 0) {
    await db
      .update(jobsTable)
      .set({ missedSyncs: sql`${jobsTable.missedSyncs} + 1` })
      .where(
        and(
          eq(jobsTable.sourceName, sourceName),
          lt(jobsTable.lastSeenAt, syncStartedAt)
        )
      );
  }

  return {
    jobsFound: unique.length,
    jobsNew,
    jobsUpdated,
  };
}

export async function writeSyncLog(result: SyncResult): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.insert(syncLogs).values({
    searchType: result.searchType,
    jobsFound: result.jobsFound,
    jobsNew: result.jobsNew,
    errors:
      result.errors.length > 0
        ? result.errors.join("\n")
        : null,
  });
}

/**
 * Delete listings that have gone missing from too many consecutive syncs — they
 * are treated as closed. Listings the user has acted on (any manual status) are
 * never deleted; instead they're flagged as possibly closed so the record
 * survives with a clear "listing gone" marker. Run once per sync, after every
 * source has updated its miss counters.
 */
export async function pruneClosedJobs(): Promise<{ deleted: number }> {
  const db = getDb();
  if (!db) return { deleted: 0 };

  const threshold = filters.removeAfterMissedSyncs;

  const deleted = await db
    .delete(jobsTable)
    .where(
      and(gte(jobsTable.missedSyncs, threshold), isNull(jobsTable.status))
    )
    .returning({ id: jobsTable.id });

  // Whatever survived past the threshold has a manual status — keep it but mark
  // the listing as gone. Below the threshold the listing is still considered
  // active, so make sure the flag is cleared (e.g. after it reappears).
  await db
    .update(jobsTable)
    .set({ possiblyClosed: true })
    .where(gte(jobsTable.missedSyncs, threshold));

  await db
    .update(jobsTable)
    .set({ possiblyClosed: false })
    .where(
      and(lt(jobsTable.missedSyncs, threshold), eq(jobsTable.possiblyClosed, true))
    );

  return { deleted: deleted.length };
}
