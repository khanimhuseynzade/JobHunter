import { filters } from "./filters";

/** LinkedIn guest-search queries — one per role × region (no city filters). */
export interface LinkedInSearch {
  keywords: string;
  location: string;
  /** LinkedIn f_WT=2 — remote only */
  remote?: boolean;
}

const linkedinRegions = ["Poland", "European Union", "United Kingdom"] as const;

const regionalSearches: LinkedInSearch[] = filters.searchRoles.flatMap(
  (role) =>
    linkedinRegions.map((location) => ({
      keywords: role,
      location,
    }))
);

const remoteSearches: LinkedInSearch[] = filters.linkedInRemoteRoles.map(
  (role) => ({
    keywords: role,
    location: "European Union",
    remote: true,
  })
);

export const linkedinSearches: LinkedInSearch[] = [
  ...regionalSearches,
  ...remoteSearches,
];

/** Max pages per search (25 listings per page). */
export const linkedinMaxPages = 3;

/** Delay between LinkedIn requests to reduce rate-limit failures. */
export const linkedinRequestDelayMs = 750;

/** Retries per LinkedIn page request before skipping that page. */
export const linkedinMaxRetries = 3;
