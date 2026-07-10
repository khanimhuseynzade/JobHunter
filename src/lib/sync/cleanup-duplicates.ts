import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs as jobsTable, pages as pagesTable } from "@/lib/schema";
import { companyRoleKey } from "./dedupe";
import { pickKeeperJob } from "./company-role-duplicates";

type JobRow = typeof jobsTable.$inferSelect;

/** Remove jobs that share the same company + role, keeping the best candidate. */
export async function cleanupDuplicateBoardJobs(): Promise<{ removed: number }> {
  const db = getDb();
  if (!db) return { removed: 0 };

  const allJobs = await db.select().from(jobsTable);

  const pages = await db.select().from(pagesTable);
  const linkedPageJobIds = new Set(
    pages.flatMap((page) => (page.linkedJobId ? [page.linkedJobId] : []))
  );

  const groups = new Map<string, JobRow[]>();
  for (const job of allJobs) {
    const key = companyRoleKey(job);
    const group = groups.get(key) ?? [];
    group.push(job);
    groups.set(key, group);
  }

  const toDelete: string[] = [];
  const now = new Date().toISOString();

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const keeper = pickKeeperJob(group, linkedPageJobIds);
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
