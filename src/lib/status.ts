import type { JobStatus } from "@/types";
import { STATUS_LABELS } from "@/types";

export const STATUS_CHIP_CLASS: Record<
  JobStatus | "empty",
  string
> = {
  empty: "chip-empty",
  applied: "chip-applied",
  skipped: "chip-skipped",
  reached_out: "chip-reached_out",
  in_progress: "chip-in_progress",
  rejected: "chip-rejected",
  expired: "chip-expired",
  error: "chip-error",
};

export function statusLabel(status: JobStatus | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status];
}

export function statusChipClass(status: JobStatus | null): string {
  return STATUS_CHIP_CLASS[status ?? "empty"];
}
