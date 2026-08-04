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
import { fetchLinkedIn } from "./fetchers/linkedin";
import { cleanupDuplicateBoardJobs } from "./cleanup-duplicates";
import { dedupeSyncJobs } from "./dedupe";
import { pruneClosedJobs, upsertSyncJobs, writeSyncLog } from "./upsert";
import type { SyncJobInput, BoardFetcherResult, SyncResult } from "./types";

function normalizeBoardFetch(result: BoardFetcherResult): {
  jobs: SyncJobInput[];
  warnings: string[];
} {
  if (Array.isArray(result)) {
    return { jobs: result, warnings: [] };
  }
  return { jobs: result.jobs, warnings: result.warnings ?? [] };
}

const boardFetchers: Record<
  BoardProvider,
  () => Promise<BoardFetcherResult>
> = {
  nofluffjobs: fetchNoFluffJobs,
  justjoinit: fetchJustJoinIt,
  bulldogjob: fetchBulldogjob,
  weworkremotely: fetchWeWorkRemotely,
  jobicy: fetchJobicy,
  remoteok: fetchRemoteOk,
  euremotejobs: fetchEuRemoteJobs,
  linkedin: fetchLinkedIn,
};

export async function runBoardSync(): Promise<SyncResult> {
  const errors: string[] = [];
  const collected: SyncJobInput[] = [];

  for (const board of boards) {
    if (!board.enabled) continue;

    try {
      const fetcher = boardFetchers[board.provider];
      const { jobs, warnings } = normalizeBoardFetch(await fetcher());
      collected.push(...jobs);
      for (const warning of warnings) {
        errors.push(`${board.name}: ${warning}`);
      }
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

  const { removed: jobsRemovedDuplicates } = await cleanupDuplicateBoardJobs();

  await pruneClosedJobs();

  const result: SyncResult = {
    searchType: "boards",
    jobsFound: unique.length,
    jobsNew,
    jobsUpdated,
    jobsRemovedDuplicates,
    errors,
  };

  await writeSyncLog(result);
  return result;
}
