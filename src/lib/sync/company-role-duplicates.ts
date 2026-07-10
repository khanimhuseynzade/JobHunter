import { companyRoleKey } from "./dedupe";

type CompanyRoleJob = {
  id: string;
  company: string;
  role: string;
  sourceType: string;
  status: string | null;
  pageId: string | null;
  lastSeenAt: string;
};

function keeperScore(
  job: CompanyRoleJob,
  linkedPageJobIds: Set<string>
): number {
  let score = 0;
  if (job.status) score += 1_000_000;
  if (job.pageId) score += 100_000;
  if (linkedPageJobIds.has(job.id)) score += 100_000;
  score += new Date(job.lastSeenAt).getTime();
  return score;
}

export function pickKeeperJob<T extends CompanyRoleJob>(
  jobs: T[],
  linkedPageJobIds: Set<string> = new Set()
): T {
  return jobs.reduce((best, job) =>
    keeperScore(job, linkedPageJobIds) > keeperScore(best, linkedPageJobIds)
      ? job
      : best
  );
}

/** Keep one job per company + role pair across all sources. */
export function dedupeBoardJobsByCompanyRole<T extends CompanyRoleJob>(
  jobs: T[],
  linkedPageJobIds: Set<string> = new Set()
): T[] {
  const groups = new Map<string, T[]>();

  for (const job of jobs) {
    const key = companyRoleKey(job);
    const group = groups.get(key) ?? [];
    group.push(job);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) =>
    group.length === 1 ? group[0] : pickKeeperJob(group, linkedPageJobIds)
  );
}
