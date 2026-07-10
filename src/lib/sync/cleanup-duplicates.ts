import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs as jobsTable, pages as pagesTable } from "@/lib/schema";
import { companyRoleKey } from "./dedupe";

type BoardJob = typeof jobsTable.$inferSelect;

function keeperScore(job: BoardJob, linkedPageJobIds: Set<string>): number {
  let score = 0;
  if (job.status) score += 1_000_000;
  if (job.pageId) score += 100_000;
  if (linkedPageJobIds.has(job.id)) score += 100_000;
  score += new Date(job.lastSeenAt).getTime();
  return score;
}

function pickKeeper(
  jobs: BoardJob[],
  linkedPageJobIds: Set<string>
): BoardJob {
  return jobs.reduce((best, job) =>
    keeperScore(job, linkedPageJobIds) > keeperScore(best, linkedPageJobIds)
      ? job
      : best
  );
}

/** Remove board jobs that share the same company + role, keeping the best candidate. */
export async function cleanupDuplicateBoardJobs(): Promise<{ removed: number }> {
  const db = getDb();
  if (!db) return { removed: 0 };

  const boardJobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.sourceType, "board"));

  const pages = await db.select().from(pagesTable);
  const linkedPageJobIds = new Set(
    pages.flatMap((page) => (page.linkedJobId ? [page.linkedJobId] : []))
  );

  const groups = new Map<string, BoardJob[]>();
  for (const job of boardJobs) {
    const key = companyRoleKey(job);
    const group = groups.get(key) ?? [];
    group.push(job);
    groups.set(key, group);
  }

  const toDelete: string[] = [];
  const now = new Date().toISOString();

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const keeper = pickKeeper(group, linkedPageJobIds);
    const duplicates = group.filter((job) => job.id !== keeper.id);

    for (const duplicate of duplicates) {
      await db
        .update(pagesTable)
        .set({ linkedJobId: keeper.id, updatedAt: now })
        .where(eq(pagesTable.linkedJobId, duplicate.id));

      if (duplicate.pageId && !keeper.pageId) {
        await db
          .update(jobsTable)
          .set({ pageId: duplicate.pageId })
          .where(eq(jobsTable.id, keeper.id));
        keeper.pageId = duplicate.pageId;
      }

      if (duplicate.status && !keeper.status) {
        await db
          .update(jobsTable)
          .set({ status: duplicate.status })
          .where(eq(jobsTable.id, keeper.id));
        keeper.status = duplicate.status;
      }

      toDelete.push(duplicate.id);
    }
  }

  if (toDelete.length > 0) {
    await db.delete(jobsTable).where(inArray(jobsTable.id, toDelete));
  }

  return { removed: toDelete.length };
}
