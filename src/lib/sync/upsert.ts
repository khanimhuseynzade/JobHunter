import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs as jobsTable, syncLogs } from "@/lib/schema";
import { filters } from "../../../config/filters";
import { dedupeSyncJobs } from "./dedupe";
import {
  isOldEnoughToClose,
  shouldMarkPossiblyClosed,
} from "./possibly-closed";
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

  if (seenKeys.length > 0) {
    const missed = await db
      .select({
        id: jobsTable.id,
        postedDate: jobsTable.postedDate,
        latencyDays: jobsTable.latencyDays,
        firstSeenAt: jobsTable.firstSeenAt,
      })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.sourceName, sourceName),
          lt(jobsTable.lastSeenAt, syncStartedAt)
        )
      );

    const toClose = missed.filter((job) => shouldMarkPossiblyClosed(job));
    if (toClose.length > 0) {
      await db
        .update(jobsTable)
        .set({ possiblyClosed: true })
        .where(
          inArray(
            jobsTable.id,
            toClose.map((job) => job.id)
          )
        );
    }

    const toReopen = missed.filter((job) => !shouldMarkPossiblyClosed(job));
    if (toReopen.length > 0) {
      await db
        .update(jobsTable)
        .set({ possiblyClosed: false })
        .where(
          inArray(
            jobsTable.id,
            toReopen.map((job) => job.id)
          )
        );
    }
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

export async function markGlobalStaleJobs(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  let marked = 0;

  const wronglyClosed = await db
    .select({
      id: jobsTable.id,
      postedDate: jobsTable.postedDate,
      latencyDays: jobsTable.latencyDays,
      firstSeenAt: jobsTable.firstSeenAt,
    })
    .from(jobsTable)
    .where(eq(jobsTable.possiblyClosed, true));

  const toReopen = wronglyClosed.filter((job) => !isOldEnoughToClose(job));
  if (toReopen.length > 0) {
    await db
      .update(jobsTable)
      .set({ possiblyClosed: false })
      .where(
        inArray(
          jobsTable.id,
          toReopen.map((job) => job.id)
        )
      );
  }

  const cutoff = new Date(
    Date.now() - filters.staleAfterDays * 86400000
  ).toISOString();

  const stale = await db
    .select({
      id: jobsTable.id,
      postedDate: jobsTable.postedDate,
      latencyDays: jobsTable.latencyDays,
      firstSeenAt: jobsTable.firstSeenAt,
    })
    .from(jobsTable)
    .where(
      and(
        lt(jobsTable.lastSeenAt, cutoff),
        eq(jobsTable.possiblyClosed, false)
      )
    );

  const toClose = stale.filter((job) => shouldMarkPossiblyClosed(job));
  if (toClose.length === 0) return 0;

  await db
    .update(jobsTable)
    .set({ possiblyClosed: true })
    .where(
      inArray(
        jobsTable.id,
        toClose.map((row) => row.id)
      )
    );

  marked = toClose.length;
  return marked;
}
