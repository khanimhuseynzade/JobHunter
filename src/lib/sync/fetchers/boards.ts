import type { SyncJobInput } from "../types";
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

export async function fetchNoFluffJobs(): Promise<SyncJobInput[]> {
  const res = await fetch("https://nofluffjobs.com/api/posting?limit=12000", {
    headers: { Accept: "application/json", "User-Agent": "Board/1.0" },
  });

  if (!res.ok) {
    throw new Error(`No Fluff Jobs API failed: ${res.status}`);
  }

  const data = (await res.json()) as NfjResponse;
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
  const res = await fetch("https://justjoin.it/api/offers", {
    headers: { Accept: "application/json", "User-Agent": "Board/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Just Join IT API failed: ${res.status}`);
  }

  const text = await res.text();
  if (!text.trim()) {
    throw new Error("Just Join IT API returned an empty response");
  }

  const data = JSON.parse(text) as Array<{
    id?: string | number;
    slug?: string;
    title?: string;
    companyName?: string;
    publishedAt?: string;
    workplaceType?: string;
    city?: string;
    remoteInterview?: boolean;
  }>;

  const results: SyncJobInput[] = [];

  for (const offer of data) {
    const title = offer.title ?? "";
    if (!matchesRole(title)) continue;

    const postedDate = offer.publishedAt
      ? new Date(offer.publishedAt).toISOString()
      : null;
    if (!isWithinMaxAge(postedDate)) continue;

    const location = formatLocation([
      offer.city ?? "",
      offer.workplaceType ?? "",
    ]);

    const workMode = inferWorkMode({
      fullyRemote:
        offer.workplaceType?.toLowerCase().includes("remote") ?? false,
      locationText: location,
    });

    const id = String(offer.id ?? offer.slug ?? title);
    const slug = offer.slug ?? id;

    results.push({
      externalKey: `board:jjit:${id}`,
      role: title,
      company: offer.companyName ?? "Unknown",
      location,
      workMode,
      postedDate,
      latencyDays: null,
      sourceType: "board",
      sourceName: "Just Join IT",
      applyUrl: `https://justjoin.it/job-offer/${slug}`,
    });
  }

  return results;
}
