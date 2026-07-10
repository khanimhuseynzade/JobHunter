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
import { dedupeSyncJobs } from "../src/lib/sync/dedupe";
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

function fingerprint(job: SyncJobInput): string {
  return [
    job.sourceName,
    job.role.trim().toLowerCase(),
    job.company.trim().toLowerCase(),
    job.location.trim().toLowerCase(),
  ].join("|");
}

function audit(name: string, jobs: SyncJobInput[]) {
  const dupKeys = jobs.length - new Set(jobs.map((j) => j.externalKey)).size;
  const dupUrls = jobs.length - new Set(jobs.map((j) => j.applyUrl)).size;
  const dupNormUrls =
    jobs.length - new Set(jobs.map((j) => normalizeUrl(j.applyUrl))).size;

  const byFingerprint = new Map<string, SyncJobInput[]>();
  for (const job of jobs) {
    const key = fingerprint(job);
    const group = byFingerprint.get(key) ?? [];
    group.push(job);
    byFingerprint.set(key, group);
  }
  const dupFingerprints = [...byFingerprint.entries()].filter(([, g]) => g.length > 1);

  const deduped = dedupeSyncJobs(jobs);
  const removed = jobs.length - deduped.length;

  console.log(`\n=== ${name} ===`);
  console.log(`jobs: ${jobs.length}`);
  console.log(`dup externalKey: ${dupKeys}`);
  console.log(`dup applyUrl: ${dupUrls}`);
  console.log(`dup normalized applyUrl: ${dupNormUrls}`);
  console.log(`dup role+company+location fingerprint: ${dupFingerprints.length}`);
  console.log(`removed by dedupeSyncJobs: ${removed}`);

  for (const [fp, group] of dupFingerprints.slice(0, 3)) {
    console.log(`  fingerprint (${group.length}): ${fp}`);
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
