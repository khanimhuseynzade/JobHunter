export type JobStatus = "applied" | "skipped" | "reached_out" | "rejected";

export type SourceType = "board" | "company";

export type WorkMode = "remote" | "hybrid" | "on_site";

export type PageFolder = "inbox" | "jobs" | "companies" | "general";

export interface Job {
  id: string;
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
  status: JobStatus | null;
  possiblyClosed: boolean;
  pageId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface Page {
  id: string;
  title: string;
  body: string;
  folder: PageFolder;
  linkedJobId: string | null;
  linkedCompany: string | null;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  applied: "Applied",
  skipped: "Skipped",
  reached_out: "Reached out",
  rejected: "Rejected",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
};

export const FOLDER_LABELS: Record<PageFolder, string> = {
  inbox: "Inbox",
  jobs: "Jobs",
  companies: "Companies",
  general: "General",
};
