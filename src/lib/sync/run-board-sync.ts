import { boards, type BoardProvider } from "../../../config/boards";
import {
  fetchBulldogjob,
  fetchEuRemoteJobs,
  fetchJobicy,
  fetchJustJoinIt,
  fetchNoFluffJobs,
  fetchRemoteOk,
  fetchWeWorkRemotely,
} from "./fetchers/boards";
import { dedupeSyncJobs } from "./dedupe";
import { markGlobalStaleJobs, upsertSyncJobs, writeSyncLog } from "./upsert";
import type { SyncJobInput, SyncResult } from "./types";

const boardFetchers: Record<
  BoardProvider,
  () => Promise<SyncJobInput[]>
> = {
  nofluffjobs: fetchNoFluffJobs,
  justjoinit: fetchJustJoinIt,
  bulldogjob: fetchBulldogjob,
  weworkremotely: fetchWeWorkRemotely,
  jobicy: fetchJobicy,
  remoteok: fetchRemoteOk,
  euremotejobs: fetchEuRemoteJobs,
};

export async function runBoardSync(): Promise<SyncResult> {
  const errors: string[] = [];
  const collected: SyncJobInput[] = [];

  for (const board of boards) {
    if (!board.enabled) continue;

    try {
      const fetcher = boardFetchers[board.provider];
      const jobs = await fetcher();
      collected.push(...jobs);
    } catch (error) {
      errors.push(
        `${board.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const unique = dedupeSyncJobs(collected);
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
