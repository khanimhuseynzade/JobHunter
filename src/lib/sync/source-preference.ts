export type SourcePreferenceJob = {
  sourceType: string;
  sourceName: string;
  applyUrl: string;
};

/** Higher = prefer keeping this listing when duplicates share company + role. */
export function sourcePreferenceScore(job: SourcePreferenceJob): number {
  if (job.sourceType === "company") return 2;
  if (isLinkedInJob(job)) return 1;
  return 0;
}

export function isLinkedInJob(job: SourcePreferenceJob): boolean {
  if (job.sourceName === "LinkedIn") return true;

  try {
    return new URL(job.applyUrl).hostname.includes("linkedin.com");
  } catch {
    return job.applyUrl.toLowerCase().includes("linkedin.com");
  }
}

export function compareSourcePreference(
  a: SourcePreferenceJob,
  b: SourcePreferenceJob
): number {
  return sourcePreferenceScore(a) - sourcePreferenceScore(b);
}
