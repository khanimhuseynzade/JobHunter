import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs as jobsTable } from "@/lib/schema";
import { companyRoleKey } from "./dedupe";
import { pickKeeperJob } from "./company-role-duplicates";

type JobRow = typeof jobsTable.$inferSelect;

/** Remove jobs that share the same company + role, keeping the best candidate. */
export async function cleanupDuplicateBoardJobs(): Promise<{ removed: number }> {
  const db = getDb();
  if (!db) return { removed: 0 };

  const allJobs = await db.select().from(jobsTable);

  const groups = new Map<string, JobRow[]>();
  for (const job of allJobs) {
    const key = companyRoleKey(job);
    const group = groups.get(key) ?? [];
    group.push(job);
    groups.set(key, group);
  }

  const toDelete: string[] = [];

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const keeper = pickKeeperJob(group);
    const duplicates = group.filter((job) => job.id !== keeper.id);

    for (const duplicate of duplicates) {
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
