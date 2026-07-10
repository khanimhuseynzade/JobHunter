import {
  linkedinMaxPages,
  linkedinSearches,
  type LinkedInSearch,
} from "../../../../config/linkedin";
import type { SyncJobInput } from "../types";
import {
  formatLocation,
  inferWorkMode,
  isWithinMaxAge,
  matchesRole,
} from "../match";

const LINKEDIN_GUEST_API =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const LINKEDIN_USER_AGENT =
  "Mozilla/5.0 (compatible; Board/1.0; +https://github.com)";

export interface LinkedInJobCard {
  jobId: string;
  role: string;
  company: string;
  location: string;
  applyUrl: string;
  postedDate: string | null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(value: string): string {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

export function parseLinkedInSearchHtml(html: string): LinkedInJobCard[] {
  const blocks = html.split(/<li>\s*/).slice(1);
  const results: LinkedInJobCard[] = [];

  for (const block of blocks) {
    const jobId = block.match(/data-entity-urn="urn:li:jobPosting:(\d+)"/)?.[1];
    const role = block.match(/base-search-card__title[^>]*>\s*([^<]+)/)?.[1];
    const company = block.match(
      /hidden-nested-link[^>]*href="[^"]*company[^"]*"[^>]*>\s*([^<]+)/
    )?.[1];
    const location = block.match(/job-search-card__location[^>]*>\s*([^<]+)/)?.[1];
    const applyUrl = block.match(/base-card__full-link[^>]*href="([^"]+)"/)?.[1];
    const postedDate = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];

    if (!jobId || !role || !applyUrl) continue;

    results.push({
      jobId,
      role: cleanText(role),
      company: cleanText(company ?? "Unknown"),
      location: cleanText(location ?? ""),
      applyUrl: cleanText(applyUrl),
      postedDate: postedDate ? new Date(postedDate).toISOString() : null,
    });
  }

  return results;
}

function linkedInSearchUrl(search: LinkedInSearch, start: number): string {
  const url = new URL(LINKEDIN_GUEST_API);
  url.searchParams.set("keywords", search.keywords);
  url.searchParams.set("location", search.location);
  url.searchParams.set("start", String(start));
  url.searchParams.set("count", "25");
  url.searchParams.set("f_TPR", "r2592000"); // past 30 days
  if (search.remote) {
    url.searchParams.set("f_WT", "2");
  }
  return url.toString();
}

async function fetchLinkedInHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": LINKEDIN_USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`LinkedIn request failed (${res.status})`);
  }
  return res.text();
}

function toSyncJob(card: LinkedInJobCard): SyncJobInput | null {
  if (!matchesRole(card.role)) return null;
  if (!isWithinMaxAge(card.postedDate)) return null;

  const location = formatLocation([card.location]);
  const workMode = inferWorkMode({ locationText: location });

  return {
    externalKey: `board:linkedin:${card.jobId}`,
    role: card.role,
    company: card.company,
    location,
    workMode,
    postedDate: card.postedDate,
    latencyDays: null,
    sourceType: "board",
    sourceName: "LinkedIn",
    applyUrl: card.applyUrl,
  };
}

export async function fetchLinkedIn(): Promise<SyncJobInput[]> {
  const seen = new Set<string>();
  const results: SyncJobInput[] = [];

  for (const search of linkedinSearches) {
    for (let page = 0; page < linkedinMaxPages; page++) {
      const start = page * 25;
      const url = linkedInSearchUrl(search, start);

      let html: string;
      try {
        html = await fetchLinkedInHtml(url);
      } catch (error) {
        throw new Error(
          `LinkedIn search "${search.keywords}" @ ${search.location}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      const cards = parseLinkedInSearchHtml(html);
      if (cards.length === 0) break;

      for (const card of cards) {
        if (seen.has(card.jobId)) continue;
        seen.add(card.jobId);

        const job = toSyncJob(card);
        if (job) results.push(job);
      }

      if (cards.length < 25) break;
    }
  }

  return results;
}
