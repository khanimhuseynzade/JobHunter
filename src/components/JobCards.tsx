"use client";

import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import { isJobPostedToday } from "@/lib/job-dates";
import { formatDisplayLocation } from "@/lib/location";
import { StatusDropdown } from "./StatusDropdown";
import { PostedTodayBadge } from "./PostedTodayBadge";
import { ClosedBadge } from "./ClosedBadge";

interface JobCardsProps {
  jobs: Job[];
  onStatusChange: (id: string, status: JobStatus | null) => void;
}

function formatLatency(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function JobCards({ jobs, onStatusChange }: JobCardsProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-gray-500">
        No jobs to show.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          onClick={() =>
            window.open(job.applyUrl, "_blank", "noopener,noreferrer")
          }
          className={`cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 ${
            job.possiblyClosed ? "opacity-70" : ""
          }`}
        >
          <div className="mb-2">
            <div className="flex flex-wrap items-center gap-2">
              {job.status === null && (
                <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              )}
              <h3 className="font-medium text-black">{job.role}</h3>
              {isJobPostedToday(job) ? <PostedTodayBadge /> : null}
              {job.possiblyClosed ? <ClosedBadge /> : null}
            </div>
            <p className="text-sm text-gray-600">{job.company}</p>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            {formatDisplayLocation(job.location)} ·{" "}
            {WORK_MODE_LABELS[job.workMode]} · {formatLatency(job.latencyDays)}{" "}
            · {job.sourceName}
          </p>
          <div onClick={(e) => e.stopPropagation()}>
            <StatusDropdown
              status={job.status}
              onChange={(s) => onStatusChange(job.id, s)}
              compact
            />
          </div>
        </div>
      ))}
    </div>
  );
}
