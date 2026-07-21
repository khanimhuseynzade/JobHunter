"use client";

import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import { isJobPostedToday } from "@/lib/job-dates";
import { formatDisplayLocation } from "@/lib/location";
import { companyAvatar } from "@/lib/avatar";
import { StatusDropdown } from "./StatusDropdown";
import { PostedTodayBadge } from "./PostedTodayBadge";
import { ClosedBadge } from "./ClosedBadge";
import { IconArrowUpRight } from "./icons";

interface JobCardsProps {
  jobs: Job[];
  onStatusChange: (id: string, status: JobStatus | null) => void;
  onSelect: (job: Job) => void;
}

function formatLatency(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function JobCards({ jobs, onStatusChange, onSelect }: JobCardsProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-gray-500">
        No jobs to show.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => {
        const avatar = companyAvatar(job.company);
        return (
          <div
            key={job.id}
            onClick={() => onSelect(job)}
            className={`cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 ${
              job.possiblyClosed ? "opacity-70" : ""
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bgClass} ${avatar.textClass}`}
                >
                  {avatar.initial}
                </span>
                <div className="min-w-0">
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
              </div>
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-black transition-colors hover:border-lime hover:bg-lime-100"
              >
                <IconArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              {formatDisplayLocation(job.location)} ·{" "}
              {WORK_MODE_LABELS[job.workMode]} · {formatLatency(job.latencyDays)}
            </p>
            <div onClick={(e) => e.stopPropagation()}>
              <StatusDropdown
                status={job.status}
                onChange={(s) => onStatusChange(job.id, s)}
                compact
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
