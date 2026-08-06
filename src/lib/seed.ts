import type { Job, JobStatus, WorkMode } from "@/types";
import { sourcePreferenceScore } from "@/lib/sync/source-preference";

const STATUS_RANK: Record<JobStatus, number> = {
  applied: 1,
  reached_out: 2,
  rejected: 3,
  expired: 4,
  error: 5,
  skipped: 6,
};

function statusRank(status: JobStatus | null): number {
  return status === null ? 0 : STATUS_RANK[status];
}

const now = new Date().toISOString();

export const seedJobs: Job[] = [
  {
    id: "a1000001-0000-4000-8000-000000000001",
    externalKey: "seed:future-mind-product-designer",
    role: "Product Designer",
    company: "Future Mind",
    location: "Remote",
    workMode: "remote",
    postedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    latencyDays: 2,
    sourceType: "board",
    sourceName: "Just Join IT",
    applyUrl: "https://justjoin.it",
    status: null,
    possiblyClosed: false,
    definitelyClosed: false,
    firstSeenAt: now,
    lastSeenAt: now,
  },
  {
    id: "a1000002-0000-4000-8000-000000000002",
    externalKey: "seed:docplanner-senior-ux-designer",
    role: "Senior UX Designer",
    company: "Docplanner",
    location: "Poland",
    workMode: "remote",
    postedDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    latencyDays: 5,
    sourceType: "company",
    sourceName: "Docplanner careers",
    applyUrl: "https://careers.docplanner.com",
    status: null,
    possiblyClosed: false,
    definitelyClosed: false,
    firstSeenAt: now,
    lastSeenAt: now,
  },
  {
    id: "a1000003-0000-4000-8000-000000000003",
    externalKey: "seed:revolut-ui-engineer",
    role: "UI Engineer",
    company: "Revolut",
    location: "Warsaw",
    workMode: "hybrid",
    postedDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    latencyDays: 1,
    sourceType: "company",
    sourceName: "Revolut careers",
    applyUrl: "https://www.revolut.com/careers",
    status: null,
    possiblyClosed: false,
    definitelyClosed: false,
    firstSeenAt: now,
    lastSeenAt: now,
  },
  {
    id: "a1000004-0000-4000-8000-000000000004",
    externalKey: "seed:allegro-product-design-lead",
    role: "Product Design Lead",
    company: "Allegro",
    location: "Warsaw",
    workMode: "hybrid",
    postedDate: new Date(Date.now() - 12 * 86400000).toISOString(),
    latencyDays: 12,
    sourceType: "board",
    sourceName: "Just Join IT",
    applyUrl: "https://justjoin.it",
    status: "applied",
    possiblyClosed: false,
    definitelyClosed: false,
    firstSeenAt: now,
    lastSeenAt: now,
  },
  {
    id: "a1000005-0000-4000-8000-000000000005",
    externalKey: "seed:agency-x-web-designer",
    role: "Web Designer",
    company: "Agency X",
    location: "Kraków",
    workMode: "on_site",
    postedDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    latencyDays: 20,
    sourceType: "board",
    sourceName: "No Fluff Jobs",
    applyUrl: "https://nofluffjobs.com",
    status: "skipped",
    possiblyClosed: false,
    definitelyClosed: false,
    firstSeenAt: now,
    lastSeenAt: now,
  },
  {
    id: "a1000006-0000-4000-8000-000000000006",
    externalKey: "seed:elevenlabs-ux-ui-designer",
    role: "UX/UI Designer",
    company: "ElevenLabs",
    location: "Remote EU",
    workMode: "remote",
    postedDate: new Date(Date.now() - 45 * 86400000).toISOString(),
    latencyDays: 45,
    sourceType: "company",
    sourceName: "ElevenLabs careers",
    applyUrl: "https://elevenlabs.io/careers",
    status: "rejected",
    possiblyClosed: true,
    definitelyClosed: false,
    firstSeenAt: now,
    lastSeenAt: now,
  },
];

let memoryJobs = [...seedJobs];

export function getMemoryJobs() {
  return memoryJobs;
}

export function setMemoryJobs(jobs: Job[]) {
  memoryJobs = jobs;
}

function workModeScore(mode: WorkMode): number {
  if (mode === "remote") return 2;
  if (mode === "hybrid") return 1;
  return 0;
}

function sourceScore(job: Job): number {
  return sourcePreferenceScore(job);
}

function postedTime(job: Job): number {
  if (!job.postedDate) return 0;
  const time = new Date(job.postedDate).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function sortJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;

    const postedDiff = postedTime(b) - postedTime(a);
    if (postedDiff !== 0) return postedDiff;

    const modeDiff = workModeScore(b.workMode) - workModeScore(a.workMode);
    if (modeDiff !== 0) return modeDiff;

    const sourceDiff = sourceScore(b) - sourceScore(a);
    if (sourceDiff !== 0) return sourceDiff;

    const aLat = a.latencyDays ?? 9999;
    const bLat = b.latencyDays ?? 9999;
    return aLat - bLat;
  });
}

// Sync/email logs live in Postgres `timestamp` columns (no timezone), so the
// raw value looks like "2026-07-31 23:17:07.868" with no offset marker. We
// render it in a fixed zone so the formatted string is identical on the server
// (Vercel runs in UTC) and in the browser — otherwise the label would differ
// between SSR and hydration and flip after mount.
const DISPLAY_TIME_ZONE = "Europe/Warsaw";

function parseSyncTimestamp(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Already carries timezone info (e.g. an ISO string with `Z` or ±hh:mm).
  const hasTimezone = /[zZ]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed);
  const normalized = hasTimezone ? trimmed : `${trimmed.replace(" ", "T")}Z`;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getLastSyncLabel(isoDate?: string | null): string {
  if (!isoDate) return "Never";

  const date = parseSyncTimestamp(isoDate);
  if (!date) return "Never";

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  });
}
