import { filters } from "./filters";

/** LinkedIn guest-search queries — one per role × region (no city filters). */
export interface LinkedInSearch {
  keywords: string;
  location: string;
  /** LinkedIn f_WT=2 — remote only */
  remote?: boolean;
}

const linkedinRegions = ["Poland", "European Union", "United Kingdom"] as const;

export const linkedinSearches: LinkedInSearch[] = filters.searchRoles.flatMap(
  (role) =>
    linkedinRegions.map((location) => ({
      keywords: role,
      location,
    }))
);

/** Max pages per search (25 listings per page). */
export const linkedinMaxPages = 2;
