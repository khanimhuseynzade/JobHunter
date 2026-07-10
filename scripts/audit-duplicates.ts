import "./load-env";
import {
  fetchBulldogjob,
  fetchEuRemoteJobs,
  fetchJobicy,
  fetchJustJoinIt,
  fetchNoFluffJobs,
  fetchRemoteOk,
  fetchWeWorkRemotely,
} from "../src/lib/sync/fetchers/boards";
import { fetchCompanyJobs } from "../src/lib/sync/fetchers/companies";
import { dedupeSyncJobs, companyRoleKey } from "../src/lib/sync/dedupe";
import type { SyncJobInput } from "../src/lib/sync/types";
import { companies } from "../config/companies";

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function audit(name: string, jobs: SyncJobInput[]) {
  const dupKeys = jobs.length - new Set(jobs.map((j) => j.externalKey)).size;
  const dupUrls = jobs.length - new Set(jobs.map((j) => j.applyUrl)).size;
  const dupNormUrls =
    jobs.length - new Set(jobs.map((j) => normalizeUrl(j.applyUrl))).size;

  const byCompanyRole = new Map<string, SyncJobInput[]>();
  for (const job of jobs) {
    const key = companyRoleKey(job);
    const group = byCompanyRole.get(key) ?? [];
    group.push(job);
    byCompanyRole.set(key, group);
  }
  const dupCompanyRoles = [...byCompanyRole.entries()].filter(
    ([, g]) => g.length > 1
  );

  const deduped = dedupeSyncJobs(jobs);
  const removed = jobs.length - deduped.length;

  console.log(`\n=== ${name} ===`);
  console.log(`jobs: ${jobs.length}`);
  console.log(`dup externalKey: ${dupKeys}`);
  console.log(`dup applyUrl: ${dupUrls}`);
  console.log(`dup normalized applyUrl: ${dupNormUrls}`);
  console.log(`dup company+role: ${dupCompanyRoles.length}`);
  console.log(`removed by dedupeSyncJobs: ${removed}`);

  for (const [key, group] of dupCompanyRoles.slice(0, 3)) {
    console.log(`  company+role (${group.length}): ${key}`);
    for (const job of group.slice(0, 4)) {
      console.log(`    key=${job.externalKey}`);
      console.log(`    url=${job.applyUrl}`);
    }
  }
}

async function main() {
  const boardFetchers: Array<[string, () => Promise<SyncJobInput[]>]> = [
    ["No Fluff Jobs", fetchNoFluffJobs],
    ["Just Join IT", fetchJustJoinIt],
    ["Bulldogjob", fetchBulldogjob],
    ["We Work Remotely", fetchWeWorkRemotely],
    ["Jobicy", fetchJobicy],
    ["RemoteOK", fetchRemoteOk],
    ["EU Remote Jobs", fetchEuRemoteJobs],
  ];

  const allBoard: SyncJobInput[] = [];

  for (const [name, fn] of boardFetchers) {
    try {
      const jobs = await fn();
      audit(name, jobs);
      allBoard.push(...jobs);
    } catch (error) {
      console.log(`\n=== ${name} ===`);
      console.log(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\n=== All boards (cross-source) ===");
  audit("All boards combined", allBoard);
  audit("All boards after dedupeSyncJobs", dedupeSyncJobs(allBoard));

  for (const company of companies.filter((c) => c.ats)) {
    try {
      const jobs = await fetchCompanyJobs(company);
      if (jobs.length > 0) audit(`${company.name} careers`, jobs);
    } catch (error) {
      console.log(`\n=== ${company.name} careers ===`);
      console.log(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
