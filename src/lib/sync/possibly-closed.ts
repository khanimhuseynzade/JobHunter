import { filters } from "../../../config/filters";

export interface PossiblyClosedJobFields {
  postedDate: string | null;
  latencyDays: number | null;
  firstSeenAt: string;
}

/** Days since the listing was posted, or since first seen when posted date is unknown. */
export function jobAgeDays(job: PossiblyClosedJobFields): number | null {
  if (job.latencyDays !== null) return job.latencyDays;

  if (job.postedDate) {
    const posted = new Date(job.postedDate).getTime();
    if (!Number.isNaN(posted)) {
      return Math.max(0, Math.floor((Date.now() - posted) / 86400000));
    }
  }

  const firstSeen = new Date(job.firstSeenAt).getTime();
  if (Number.isNaN(firstSeen)) return null;

  return Math.max(0, Math.floor((Date.now() - firstSeen) / 86400000));
}

/** Only listings at least maxAgeDays old can be marked possibly closed. */
export function isOldEnoughToClose(job: PossiblyClosedJobFields): boolean {
  const age = jobAgeDays(job);
  if (age === null) return false;
  return age >= filters.maxAgeDays;
}

/**
 * Mark possibly closed only when the listing is old enough and was not seen
 * in the latest sync check for its source.
 */
export function shouldMarkPossiblyClosed(job: PossiblyClosedJobFields): boolean {
  return isOldEnoughToClose(job);
}
