import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs as jobsTable } from "@/lib/schema";
import {
  getMemoryJobs,
  setMemoryJobs,
  sortJobs,
} from "@/lib/seed";
import { dedupeBoardJobsByCompanyRole } from "@/lib/sync/company-role-duplicates";
import type { Job, JobStatus, WorkMode } from "@/types";

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
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
  };
}

function matchesQuery(job: Job, query: string): boolean {
  const needle = query.toLowerCase().trim();
  if (!needle) return true;

  return [
    job.role,
    job.company,
    job.location,
    job.sourceName,
    job.applyUrl,
  ].some((field) => field.toLowerCase().includes(needle));
}

function applyJobFilters(
  list: Job[],
  options?: {
    showSkipped?: boolean;
    showClosed?: boolean;
    q?: string;
    workMode?: WorkMode;
  }
): Job[] {
  let filtered = list;

  if (!options?.showSkipped) {
    filtered = filtered.filter((j) => j.status !== "skipped");
  }
  if (!options?.showClosed) {
    // A closed listing is only ever kept in the DB when the user gave it a
    // status, so those stay visible; unstatused ones are pruned at sync time.
    filtered = filtered.filter((j) => !j.possiblyClosed || j.status !== null);
  }
  if (options?.q?.trim()) {
    filtered = filtered.filter((j) => matchesQuery(j, options.q!));
  }
  if (options?.workMode) {
    filtered = filtered.filter((j) => j.workMode === options.workMode);
  }

  return filtered;
}

export async function fetchJobs(options?: {
  showSkipped?: boolean;
  showClosed?: boolean;
  q?: string;
  workMode?: WorkMode;
}): Promise<Job[]> {
  const db = getDb();
  let list: Job[];

  if (db) {
    const rows = await db.select().from(jobsTable);
    list = dedupeBoardJobsByCompanyRole(rows.map(rowToJob));
  } else {
    list = dedupeBoardJobsByCompanyRole(getMemoryJobs());
  }

  return sortJobs(applyJobFilters(list, options));
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
