export function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isJobPostedToday(job: {
  postedDate: string | null;
  latencyDays: number | null;
}): boolean {
  if (job.postedDate) return isToday(job.postedDate);
  return job.latencyDays === 0;
}
