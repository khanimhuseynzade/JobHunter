import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { syncLogs } from "@/lib/schema";

export interface SyncStatus {
  boards: string | null;
  companies: string | null;
  latest: string | null;
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const db = getDb();
  if (!db) {
    return { boards: null, companies: null, latest: null };
  }

  const rows = await db
    .select({
      searchType: syncLogs.searchType,
      ranAt: syncLogs.ranAt,
    })
    .from(syncLogs)
    .orderBy(desc(syncLogs.ranAt))
    .limit(20);

  const boards = rows.find((row) => row.searchType === "boards")?.ranAt ?? null;
  const companies =
    rows.find((row) => row.searchType === "companies")?.ranAt ?? null;
  const latest = rows[0]?.ranAt ?? null;

  return { boards, companies, latest };
}
