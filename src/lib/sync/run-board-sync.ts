import { boards } from "../../../config/boards";
import { fetchJustJoinIt, fetchNoFluffJobs } from "./fetchers/boards";
import { markGlobalStaleJobs, upsertSyncJobs, writeSyncLog } from "./upsert";
import type { SyncJobInput, SyncResult } from "./types";

function dedupeByKey(jobs: SyncJobInput[]): SyncJobInput[] {
  const map = new Map<string, SyncJobInput>();
  for (const job of jobs) {
    map.set(job.externalKey, job);
  }
  return [...map.values()];
}

export async function runBoardSync(): Promise<SyncResult> {
  const errors: string[] = [];
  const collected: SyncJobInput[] = [];

  for (const board of boards) {
    if (!board.enabled) continue;

    try {
      const jobs =
        board.provider === "nofluffjobs"
          ? await fetchNoFluffJobs()
          : await fetchJustJoinIt();
      collected.push(...jobs);
    } catch (error) {
      errors.push(
        `${board.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const unique = dedupeByKey(collected);
  let jobsNew = 0;
  let jobsUpdated = 0;

  for (const board of boards.filter((b) => b.enabled)) {
    const boardJobs = unique.filter((job) => job.sourceName === board.name);
    if (boardJobs.length === 0) continue;

    const result = await upsertSyncJobs("boards", board.name, boardJobs);
    jobsNew += result.jobsNew;
    jobsUpdated += result.jobsUpdated;
  }

  await markGlobalStaleJobs();

  const result: SyncResult = {
    searchType: "boards",
    jobsFound: unique.length,
    jobsNew,
    jobsUpdated,
    errors,
  };

  await writeSyncLog(result);
  return result;
}
