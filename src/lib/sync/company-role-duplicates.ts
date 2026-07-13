import { companyRoleKey } from "./dedupe";
import {
  compareSourcePreference,
  type SourcePreferenceJob,
} from "./source-preference";

type CompanyRoleJob = SourcePreferenceJob & {
  id: string;
  company: string;
  role: string;
  status: string | null;
  lastSeenAt: string;
};

function compareKeeperJobs<T extends CompanyRoleJob>(a: T, b: T): number {
  const aHasStatus = a.status !== null;
  const bHasStatus = b.status !== null;
  if (aHasStatus !== bHasStatus) return aHasStatus ? 1 : -1;

  const sourceDiff = compareSourcePreference(a, b);
  if (sourceDiff !== 0) return sourceDiff;

  return (
    new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime()
  );
}

export function pickKeeperJob<T extends CompanyRoleJob>(jobs: T[]): T {
  return jobs.reduce((best, job) =>
    compareKeeperJobs(job, best) > 0 ? job : best
  );
}

/** Keep one job per company + role pair across all sources. */
export function dedupeBoardJobsByCompanyRole<T extends CompanyRoleJob>(
  jobs: T[]
): T[] {
  const groups = new Map<string, T[]>();

  for (const job of jobs) {
    const key = companyRoleKey(job);
    const group = groups.get(key) ?? [];
    group.push(job);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) =>
    group.length === 1 ? group[0] : pickKeeperJob(group)
  );
}
