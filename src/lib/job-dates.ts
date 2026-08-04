export function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Days since the listing was posted, computed live from `postedDate`.
 *
 * Do NOT display the stored `latencyDays` column: it is a snapshot frozen at
 * the last sync that saw the job, so once a listing drops out of a source feed
 * (i.e. it expired/closed) its `latencyDays` stops updating and the job keeps
 * showing a stale "Today"/"1d" age forever. Recomputing from `postedDate` on
 * read always reflects the true current age.
 */
export function jobPostedAgeDays(job: { postedDate: string | null }): number | null {
  if (!job.postedDate) return null;
  const posted = new Date(job.postedDate).getTime();
  if (Number.isNaN(posted)) return null;
  return Math.max(0, Math.floor((Date.now() - posted) / 86400000));
}

export function isJobPostedToday(job: { postedDate: string | null }): boolean {
  if (!job.postedDate) return false;
  return isToday(job.postedDate);
}
