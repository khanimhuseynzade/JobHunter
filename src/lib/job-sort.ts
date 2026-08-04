import type { Job, JobStatus, WorkMode } from "@/types";
import { formatDisplayLocation } from "@/lib/location";
import { jobPostedAgeDays } from "@/lib/job-dates";

export type JobSortKey =
  | "status"
  | "role"
  | "company"
  | "location"
  | "workMode"
  | "latencyDays";

export type SortDirection = "asc" | "desc";

const STATUS_ORDER: Record<JobStatus, number> = {
  applied: 1,
  reached_out: 2,
  rejected: 3,
  expired: 4,
  error: 5,
  skipped: 6,
};

const WORK_MODE_ORDER: Record<WorkMode, number> = {
  remote: 0,
  hybrid: 1,
  on_site: 2,
};

function compareStatus(a: JobStatus | null, b: JobStatus | null): number {
  const aOrder = a === null ? 0 : STATUS_ORDER[a] + 1;
  const bOrder = b === null ? 0 : STATUS_ORDER[b] + 1;
  return aOrder - bOrder;
}

function compareLatency(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

export function sortJobList(
  jobs: Job[],
  key: JobSortKey,
  direction: SortDirection
): Job[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...jobs].sort((a, b) => {
    let result = 0;

    switch (key) {
      case "status":
        result = compareStatus(a.status, b.status);
        break;
      case "role":
        result = a.role.localeCompare(b.role, undefined, { sensitivity: "base" });
        break;
      case "company":
        result = a.company.localeCompare(b.company, undefined, {
          sensitivity: "base",
        });
        break;
      case "location":
        result = formatDisplayLocation(a.location).localeCompare(
          formatDisplayLocation(b.location),
          undefined,
          { sensitivity: "base" }
        );
        break;
      case "workMode":
        result = WORK_MODE_ORDER[a.workMode] - WORK_MODE_ORDER[b.workMode];
        break;
      case "latencyDays":
        result = compareLatency(jobPostedAgeDays(a), jobPostedAgeDays(b));
        break;
    }

    if (result !== 0) return result * factor;

    return a.role.localeCompare(b.role, undefined, { sensitivity: "base" });
  });
}