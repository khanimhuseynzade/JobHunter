import type { Job, Page } from "@/types";

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
    pageId: null,
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
    pageId: null,
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
    pageId: null,
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
    pageId: "b2000001-0000-4000-8000-000000000001",
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
    pageId: null,
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
    pageId: null,
    firstSeenAt: now,
    lastSeenAt: now,
  },
];

export const seedPages: Page[] = [
  {
    id: "b2000001-0000-4000-8000-000000000001",
    title: "Allegro — Product Design Lead",
    body: "# Allegro — Product Design Lead\n\n- Applied March 12\n- Hybrid Warsaw, 2 days/week in office\n- Waiting for recruiter reply",
    folder: "jobs",
    linkedJobId: "a1000004-0000-4000-8000-000000000004",
    linkedCompany: "Allegro",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "b2000002-0000-4000-8000-000000000002",
    title: "Revolut",
    body: "# Revolut\n\n- Strong design org\n- Check careers monthly",
    folder: "companies",
    linkedJobId: null,
    linkedCompany: "Revolut",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "b2000003-0000-4000-8000-000000000003",
    title: "Interview prep",
    body: "# Interview prep\n\n- Portfolio walkthrough script\n- Questions about design process",
    folder: "general",
    linkedJobId: null,
    linkedCompany: null,
    createdAt: now,
    updatedAt: now,
  },
];

let memoryJobs = [...seedJobs];
let memoryPages = [...seedPages];

export function getMemoryJobs() {
  return memoryJobs;
}

export function setMemoryJobs(jobs: Job[]) {
  memoryJobs = jobs;
}

export function getMemoryPages() {
  return memoryPages;
}

export function setMemoryPages(pages: Page[]) {
  memoryPages = pages;
}

export function sortJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const aEmpty = a.status === null ? 0 : 1;
    const bEmpty = b.status === null ? 0 : 1;
    if (aEmpty !== bEmpty) return aEmpty - bEmpty;
    const aLat = a.latencyDays ?? 9999;
    const bLat = b.latencyDays ?? 9999;
    return aLat - bLat;
  });
}

export function getLastSyncLabel(isoDate?: string | null): string {
  const d = isoDate ? new Date(isoDate) : new Date();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
