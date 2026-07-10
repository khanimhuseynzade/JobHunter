import type { SourceType, WorkMode } from "@/types";

export interface SyncJobInput {
  externalKey: string;
  role: string;
  company: string;
  location: string;
  workMode: WorkMode;
  postedDate: string | null;
  latencyDays: number | null;
  sourceType: SourceType;
  sourceName: string;
  applyUrl: string;
}

export interface SyncResult {
  searchType: "boards" | "companies";
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  errors: string[];
}
