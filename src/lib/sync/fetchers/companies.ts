import type { CompanyConfig } from "../../../../config/companies";
import type { SyncJobInput } from "../types";
import {
  formatLocation,
  inferWorkMode,
  isWithinMaxAge,
  matchesRole,
} from "../match";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
}

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories?: {
    location?: string;
    commitment?: string;
  };
  workplaceType?: string;
}

interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  publishedAt: string;
  location?: string;
  isRemote?: boolean;
}

async function fetchGreenhouse(
  company: CompanyConfig,
  boardSlug: string
): Promise<SyncJobInput[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs`,
    { headers: { Accept: "application/json", "User-Agent": "Board/1.0" } }
  );
  if (!res.ok) {
    throw new Error(`Greenhouse ${boardSlug}: ${res.status}`);
  }

  const data = (await res.json()) as { jobs?: GreenhouseJob[] };
  return (data.jobs ?? [])
    .filter((job) => matchesRole(job.title))
    .filter((job) => isWithinMaxAge(job.updated_at))
    .map((job) => ({
      externalKey: `company:greenhouse:${boardSlug}:${job.id}`,
      role: job.title,
      company: company.name,
      location: job.location?.name ?? "Unknown",
      workMode: inferWorkMode({ locationText: job.location?.name ?? "" }),
      postedDate: new Date(job.updated_at).toISOString(),
      latencyDays: null,
      sourceType: "company" as const,
      sourceName: `${company.name} careers`,
      applyUrl: job.absolute_url,
    }));
}

async function fetchLever(
  company: CompanyConfig,
  boardSlug: string
): Promise<SyncJobInput[]> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${boardSlug}?mode=json`,
    { headers: { Accept: "application/json", "User-Agent": "Board/1.0" } }
  );
  if (!res.ok) {
    throw new Error(`Lever ${boardSlug}: ${res.status}`);
  }

  const data = (await res.json()) as LeverPosting[];
  return data
    .filter((job) => matchesRole(job.text))
    .filter((job) => isWithinMaxAge(new Date(job.createdAt).toISOString()))
    .map((job) => {
      const location = formatLocation([
        job.categories?.location ?? "",
        job.workplaceType ?? "",
      ]);
      return {
        externalKey: `company:lever:${boardSlug}:${job.id}`,
        role: job.text,
        company: company.name,
        location,
        workMode: inferWorkMode({
          fullyRemote: job.workplaceType?.toLowerCase() === "remote",
          locationText: location,
        }),
        postedDate: new Date(job.createdAt).toISOString(),
        latencyDays: null,
        sourceType: "company" as const,
        sourceName: `${company.name} careers`,
        applyUrl: job.hostedUrl,
      };
    });
}

async function fetchAshby(
  company: CompanyConfig,
  boardSlug: string
): Promise<SyncJobInput[]> {
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${boardSlug}`,
    { headers: { Accept: "application/json", "User-Agent": "Board/1.0" } }
  );
  if (!res.ok) {
    throw new Error(`Ashby ${boardSlug}: ${res.status}`);
  }

  const data = (await res.json()) as { jobs?: AshbyJob[] };
  return (data.jobs ?? [])
    .filter((job) => matchesRole(job.title))
    .filter((job) => isWithinMaxAge(job.publishedAt))
    .map((job) => ({
      externalKey: `company:ashby:${boardSlug}:${job.id}`,
      role: job.title,
      company: company.name,
      location: job.location ?? "Unknown",
      workMode: inferWorkMode({
        fullyRemote: job.isRemote,
        locationText: job.location ?? "",
      }),
      postedDate: new Date(job.publishedAt).toISOString(),
      latencyDays: null,
      sourceType: "company" as const,
      sourceName: `${company.name} careers`,
      applyUrl: job.jobUrl,
    }));
}

export async function fetchCompanyJobs(
  company: CompanyConfig
): Promise<SyncJobInput[]> {
  if (!company.ats) return [];

  const { provider, boardSlug } = company.ats;
  if (provider === "greenhouse") return fetchGreenhouse(company, boardSlug);
  if (provider === "lever") return fetchLever(company, boardSlug);
  return fetchAshby(company, boardSlug);
}
