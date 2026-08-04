import { companies } from "../../../config/companies";
import { fetchCompanyJobs } from "./fetchers/companies";
import { cleanupDuplicateBoardJobs } from "./cleanup-duplicates";
import { pruneClosedJobs, upsertSyncJobs, writeSyncLog } from "./upsert";
import type { SyncResult } from "./types";

export async function runCompanySync(): Promise<SyncResult> {
  const errors: string[] = [];
  let jobsFound = 0;
  let jobsNew = 0;
  let jobsUpdated = 0;

  for (const company of companies) {
    if (!company.ats) continue;

    try {
      const jobs = await fetchCompanyJobs(company);
      jobsFound += jobs.length;

      if (jobs.length === 0) continue;

      const result = await upsertSyncJobs(
        "companies",
        `${company.name} careers`,
        jobs
      );
      jobsNew += result.jobsNew;
      jobsUpdated += result.jobsUpdated;
    } catch (error) {
      errors.push(
        `${company.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const { removed: jobsRemovedDuplicates } = await cleanupDuplicateBoardJobs();

  await pruneClosedJobs();

  const result: SyncResult = {
    searchType: "companies",
    jobsFound,
    jobsNew,
    jobsUpdated,
    jobsRemovedDuplicates,
    errors,
  };

  await writeSyncLog(result);
  return result;
}
