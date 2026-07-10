import type { SyncJobInput } from "./types";

function normalizeApplyUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === "/" || !parsed.pathname) return null;
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

/** Drop duplicate listings by external key and apply URL. */
export function dedupeSyncJobs(jobs: SyncJobInput[]): SyncJobInput[] {
  const byKey = new Set<string>();
  const byUrl = new Set<string>();
  const unique: SyncJobInput[] = [];

  for (const job of jobs) {
    if (byKey.has(job.externalKey)) continue;

    const normalizedUrl = normalizeApplyUrl(job.applyUrl);
    if (normalizedUrl && byUrl.has(normalizedUrl)) continue;

    byKey.add(job.externalKey);
    if (normalizedUrl) byUrl.add(normalizedUrl);
    unique.push(job);
  }

  return unique;
}
