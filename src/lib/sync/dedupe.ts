import { normalizeRoleForDedupe } from "./match";
import { pickKeeperJob } from "./company-role-duplicates";
import type { SyncJobInput } from "./types";

function jjitSlugBase(slug: string): string {
  return slug.replace(/-[a-f0-9]{8}$/i, "");
}

function normalizeApplyUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === "/" || !parsed.pathname) return null;
    let path = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();

    if (parsed.hostname.includes("nofluffjobs.com")) {
      const jobIdx = path.indexOf("/job/");
      if (jobIdx !== -1) {
        const slug = path.slice(jobIdx + "/job/".length);
        const baseSlug = slug.includes("--") ? slug.slice(0, slug.indexOf("--")) : slug;
        path = `${path.slice(0, jobIdx)}/job/${baseSlug}`;
      }
    }

    if (parsed.hostname.includes("justjoin.it")) {
      const offerIdx = path.indexOf("/job-offer/");
      if (offerIdx !== -1) {
        const slug = path.slice(offerIdx + "/job-offer/".length);
        path = `${path.slice(0, offerIdx)}/job-offer/${jjitSlugBase(slug)}`;
      }
    }

    return path;
  } catch {
    return trimmed.toLowerCase();
  }
}

function normalizeExternalKey(key: string): string {
  if (key.startsWith("board:jjit:")) {
    const slug = key.slice("board:jjit:".length);
    return `board:jjit:${jjitSlugBase(slug)}`;
  }
  return key;
}

function normalizeCompany(company: string): string {
  let name = company.trim().toLowerCase().replace(/_/g, " ");
  name = name
    .replace(/spółka z ograniczoną odpowiedzialnością/gi, "")
    .replace(/\bsp\.?\s*z\.?\s*o\.?\s*o\.?\b/gi, "")
    .replace(/\b(ltd\.?|inc\.?|gmbh|s\.?a\.?)\b/gi, "");
  name = name.replace(/\s+(poland|polska|uk|usa|europe)$/i, "");
  name = name.replace(/[^\p{L}\p{N}\s]/gu, " ");
  return name.replace(/\s+/g, " ").trim();
}

export function companyRoleKey(job: { company: string; role: string }): string {
  return [
    normalizeCompany(job.company),
    normalizeRoleForDedupe(job.role),
  ].join("|");
}

type SyncKeeperJob = SyncJobInput & {
  id: string;
  status: null;
  lastSeenAt: string;
};

function toSyncKeeperJob(job: SyncJobInput): SyncKeeperJob {
  return {
    ...job,
    id: job.externalKey,
    status: null,
    lastSeenAt: job.postedDate ?? "",
  };
}

export function dedupeSyncJobs(jobs: SyncJobInput[]): SyncJobInput[] {
  const byKey = new Set<string>();
  const byUrl = new Set<string>();
  const byCompanyRole = new Map<string, SyncJobInput>();
  const unique: SyncJobInput[] = [];

  for (const job of jobs) {
    const normalizedKey = normalizeExternalKey(job.externalKey);
    if (byKey.has(normalizedKey)) continue;

    const normalizedUrl = normalizeApplyUrl(job.applyUrl);
    if (normalizedUrl && byUrl.has(normalizedUrl)) continue;

    const companyRole = companyRoleKey(job);
    const existing = byCompanyRole.get(companyRole);
    if (existing) {
      const keeper = pickKeeperJob([
        toSyncKeeperJob(existing),
        toSyncKeeperJob(job),
      ]);
      if (keeper.externalKey !== job.externalKey) continue;

      const idx = unique.indexOf(existing);
      if (idx !== -1) unique.splice(idx, 1);

      const oldUrl = normalizeApplyUrl(existing.applyUrl);
      if (oldUrl) byUrl.delete(oldUrl);
      byKey.delete(normalizeExternalKey(existing.externalKey));
    }

    byKey.add(normalizedKey);
    if (normalizedUrl) byUrl.add(normalizedUrl);
    byCompanyRole.set(companyRole, job);
    unique.push(job);
  }

  return unique;
}
