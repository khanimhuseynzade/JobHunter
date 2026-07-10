import type { SyncJobInput } from "../types";
import {
  fetchJson,
  fetchText,
  locationFromParts,
  parseIsoDate,
  parseRssItems,
  parseXmlBlocks,
  toBoardJob,
  workModeFromText,
  xmlElementText,
} from "./board-utils";
import {
  formatLocation,
  inferWorkMode,
  isWithinMaxAge,
  matchesRole,
} from "../match";

interface NfjPosting {
  id: string;
  title: string;
  name: string;
  posted: number;
  location?: {
    fullyRemote?: boolean;
    hybridDesc?: string;
    places?: Array<{ city?: string; country?: { name?: string } }>;
  };
  url?: string;
}

interface NfjResponse {
  postings: NfjPosting[];
}

interface JjitOffer {
  guid: string;
  slug: string;
  title: string;
  workplaceType?: string;
  city?: string;
  companyName?: string;
  publishedAt?: string;
  locations?: Array<{ city?: string }>;
}

interface JjitResponse {
  data: JjitOffer[];
  meta: {
    totalItems: number;
    next?: { cursor?: number | null };
  };
}

interface RemoteOkJob {
  id?: string;
  slug?: string;
  epoch?: number;
  date?: string;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
}

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  jobType?: string;
  pubDate?: string;
}

interface JobicyResponse {
  jobs?: JobicyJob[];
}

const JJIT_UX_CATEGORY = "ux";

export async function fetchNoFluffJobs(): Promise<SyncJobInput[]> {
  const data = await fetchJson<NfjResponse>(
    "https://nofluffjobs.com/api/posting?limit=12000"
  );
  const results: SyncJobInput[] = [];

  for (const posting of data.postings ?? []) {
    if (!matchesRole(posting.title)) continue;

    const postedDate = new Date(posting.posted).toISOString();
    if (!isWithinMaxAge(postedDate)) continue;

    const cities =
      posting.location?.places
        ?.map((place) => place.city)
        .filter((city): city is string => Boolean(city)) ?? [];
    const countries =
      posting.location?.places
        ?.map((place) => place.country?.name)
        .filter((country): country is string => Boolean(country)) ?? [];

    const location = formatLocation([
      posting.location?.fullyRemote ? "Remote" : "",
      ...cities,
      ...countries,
    ]);

    const workMode = inferWorkMode({
      fullyRemote: posting.location?.fullyRemote,
      hybridDesc: posting.location?.hybridDesc,
      locationText: location,
    });

    const slug = posting.url ?? posting.id;
    results.push({
      externalKey: `board:nfj:${posting.id}`,
      role: posting.title,
      company: posting.name,
      location,
      workMode,
      postedDate,
      latencyDays: null,
      sourceType: "board",
      sourceName: "No Fluff Jobs",
      applyUrl: `https://nofluffjobs.com/job/${slug}`,
    });
  }

  return results;
}

export async function fetchJustJoinIt(): Promise<SyncJobInput[]> {
  const results: SyncJobInput[] = [];
  const seen = new Set<string>();
  let from = 0;
  let totalItems = Infinity;

  while (from < totalItems) {
    const url = new URL("https://justjoin.it/api/candidate-api/offers");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("orderBy", "descending");
    url.searchParams.set("categories", JJIT_UX_CATEGORY);
    url.searchParams.set("from", String(from));

    const page = await fetchJson<JjitResponse>(url.toString());
    totalItems = page.meta.totalItems ?? 0;

    const batch = page.data ?? [];
    if (batch.length === 0) break;

    for (const offer of batch) {
      if (seen.has(offer.guid)) continue;
      seen.add(offer.guid);

      const postedDate = parseIsoDate(offer.publishedAt);
      const cities =
        offer.locations
          ?.map((place) => place.city)
          .filter((city): city is string => Boolean(city)) ?? [];
      const location = locationFromParts([
        offer.workplaceType === "remote" ? "Remote" : "",
        offer.city ?? "",
        ...cities,
        offer.workplaceType ?? "",
      ]);
      const workMode = workModeFromText(
        location,
        offer.workplaceType === "remote"
      );

      const job = toBoardJob({
        externalKey: `board:jjit:${offer.guid}`,
        role: offer.title,
        company: offer.companyName ?? "Unknown",
        location,
        workMode,
        postedDate,
        sourceName: "Just Join IT",
        applyUrl: `https://justjoin.it/job-offer/${offer.slug}`,
      });
      if (job) results.push(job);
    }

    const nextCursor = page.meta.next?.cursor;
    if (nextCursor == null || nextCursor === from) break;
    from = nextCursor;
  }

  return results;
}

export async function fetchBulldogjob(): Promise<SyncJobInput[]> {
  const xml = await fetchText("https://bulldogjob.com/api/v2/jobs");
  const results: SyncJobInput[] = [];

  for (const block of parseXmlBlocks(xml, "job")) {
    const role = xmlElementText(block, "title");
    const company = xmlElementText(block, "company");
    const applyUrl = xmlElementText(block, "url");
    const location = xmlElementText(block, "location");
    const id = xmlElementText(block, "id");

    const job = toBoardJob({
      externalKey: `board:bulldogjob:${id || applyUrl}`,
      role,
      company: company || "Unknown",
      location: locationFromParts([location]),
      workMode: workModeFromText(location),
      postedDate: null,
      sourceName: "Bulldogjob",
      applyUrl,
    });
    if (job) results.push(job);
  }

  return results;
}

export async function fetchWeWorkRemotely(): Promise<SyncJobInput[]> {
  const xml = await fetchText(
    "https://weworkremotely.com/categories/remote-design-jobs.rss"
  );
  const results: SyncJobInput[] = [];

  for (const item of parseRssItems(xml)) {
    const [companyPart, ...titleParts] = item.title.split(":");
    const company = companyPart?.trim() || "Unknown";
    const role = titleParts.join(":").trim() || item.title;
    const postedDate = parseIsoDate(item.pubDate);

    const job = toBoardJob({
      externalKey: `board:wwr:${item.link}`,
      role,
      company,
      location: "Remote",
      workMode: "remote",
      postedDate,
      sourceName: "We Work Remotely",
      applyUrl: item.link,
    });
    if (job) results.push(job);
  }

  return results;
}

export async function fetchJobicy(): Promise<SyncJobInput[]> {
  const queries = [
    "https://jobicy.com/api/v2/remote-jobs?count=50&tag=design",
    "https://jobicy.com/api/v2/remote-jobs?count=50&industry=design-multimedia",
    "https://jobicy.com/api/v2/remote-jobs?count=50&industry=web-app-design",
  ];
  const seen = new Set<string>();
  const results: SyncJobInput[] = [];

  for (const url of queries) {
    const data = await fetchJson<JobicyResponse>(url);
    for (const offer of data.jobs ?? []) {
      if (seen.has(String(offer.id))) continue;
      seen.add(String(offer.id));

      const location = locationFromParts([
        offer.jobGeo ?? "",
        offer.jobType ?? "",
      ]);
      const job = toBoardJob({
        externalKey: `board:jobicy:${offer.id}`,
        role: offer.jobTitle,
        company: offer.companyName ?? "Unknown",
        location,
        workMode: workModeFromText(location, true),
        postedDate: parseIsoDate(offer.pubDate),
        sourceName: "Jobicy",
        applyUrl: offer.url,
      });
      if (job) results.push(job);
    }
  }

  return results;
}

export async function fetchRemoteOk(): Promise<SyncJobInput[]> {
  const data = await fetchJson<Array<RemoteOkJob | Record<string, string>>>(
    "https://remoteok.com/api"
  );
  const results: SyncJobInput[] = [];

  for (const entry of data) {
    if (!entry || typeof entry !== "object" || !("position" in entry)) continue;

    const offer = entry as RemoteOkJob;
    const role = offer.position ?? "";
    const postedDate = offer.epoch
      ? new Date(offer.epoch * 1000).toISOString()
      : parseIsoDate(offer.date ?? null);
    const applyUrl =
      offer.url ??
      (offer.slug ? `https://remoteok.com/remote-jobs/${offer.slug}` : "");
    if (!applyUrl) continue;

    const location = locationFromParts([offer.location ?? "Remote"]);
    const job = toBoardJob({
      externalKey: `board:remoteok:${offer.id ?? offer.slug ?? applyUrl}`,
      role,
      company: offer.company ?? "Unknown",
      location,
      workMode: workModeFromText(location, true),
      postedDate,
      sourceName: "RemoteOK",
      applyUrl,
    });
    if (job) results.push(job);
  }

  return results;
}

export async function fetchEuRemoteJobs(): Promise<SyncJobInput[]> {
  const xml = await fetchText("https://euremotejobs.com/feed/");
  const results: SyncJobInput[] = [];

  for (const item of parseRssItems(xml)) {
    const postedDate = parseIsoDate(item.pubDate);
    const job = toBoardJob({
      externalKey: `board:euremotejobs:${item.link}`,
      role: item.title,
      company: "Unknown",
      location: "Remote EU",
      workMode: "remote",
      postedDate,
      sourceName: "EU Remote Jobs",
      applyUrl: item.link,
    });
    if (job) results.push(job);
  }

  return results;
}
