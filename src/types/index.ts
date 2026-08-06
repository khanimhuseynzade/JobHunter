export type JobStatus =
  | "applied"
  | "skipped"
  | "reached_out"
  | "rejected"
  | "expired"
  | "error";

export type SourceType = "board" | "company";

export type WorkMode = "remote" | "hybrid" | "on_site";

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
  /** Missing from a recent sync but may still reappear (missedSyncs 1..threshold-1). */
  possiblyClosed: boolean;
  /**
   * Gone past the deletion threshold (missedSyncs >= removeAfterMissedSyncs): the
   * listing is treated as closed for good. No-status ones are already deleted at
   * sync time, so on the client this only ever marks statused survivors.
   */
  definitelyClosed: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  applied: "Applied",
  skipped: "Skipped",
  reached_out: "Reached out",
  rejected: "Rejected",
  expired: "Expired",
  error: "Error",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
};
