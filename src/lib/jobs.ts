import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs as jobsTable, pages as pagesTable } from "@/lib/schema";
import {
  getMemoryJobs,
  setMemoryJobs,
  sortJobs,
} from "@/lib/seed";
import { cleanupDuplicateBoardJobs } from "@/lib/sync/cleanup-duplicates";
import { dedupeBoardJobsByCompanyRole } from "@/lib/sync/company-role-duplicates";
import type { Job, JobStatus } from "@/types";

let cleanupStarted = false;

function scheduleDuplicateCleanup(): void {
  if (cleanupStarted) return;
  cleanupStarted = true;
  void cleanupDuplicateBoardJobs();
}

function rowToJob(row: typeof jobsTable.$inferSelect): Job {
  return {
    id: row.id,
    externalKey: row.externalKey,
    role: row.role,
    company: row.company,
    location: row.location,
    workMode: row.workMode,
    postedDate: row.postedDate,
    latencyDays: row.latencyDays,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
    applyUrl: row.applyUrl,
    status: row.status,
    possiblyClosed: row.possiblyClosed,
    pageId: row.pageId,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
  };
}

export async function fetchJobs(options?: {
  showSkipped?: boolean;
  showClosed?: boolean;
}): Promise<Job[]> {
  const db = getDb();
  let list: Job[];

  if (db) {
    scheduleDuplicateCleanup();

    const [rows, pages] = await Promise.all([
      db.select().from(jobsTable),
      db.select({ linkedJobId: pagesTable.linkedJobId }).from(pagesTable),
    ]);
    const linkedPageJobIds = new Set(
      pages.flatMap((page) => (page.linkedJobId ? [page.linkedJobId] : []))
    );
    list = dedupeBoardJobsByCompanyRole(rows.map(rowToJob), linkedPageJobIds);
  } else {
    list = dedupeBoardJobsByCompanyRole(getMemoryJobs());
  }

  let filtered = list;
  if (!options?.showSkipped) {
    filtered = filtered.filter((j) => j.status !== "skipped");
  }
  if (!options?.showClosed) {
    filtered = filtered.filter((j) => !j.possiblyClosed);
  }

  return sortJobs(filtered);
}

export async function updateJobStatus(
  id: string,
  status: JobStatus | null
): Promise<Job | null> {
  const db = getDb();

  if (db) {
    const [row] = await db
      .update(jobsTable)
      .set({ status })
      .where(eq(jobsTable.id, id))
      .returning();
    return row ? rowToJob(row) : null;
  }

  const jobs = getMemoryJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], status };
  setMemoryJobs(jobs);
  return jobs[idx];
}
