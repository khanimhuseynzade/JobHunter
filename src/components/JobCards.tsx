"use client";

import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import { StatusDropdown } from "./StatusDropdown";

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
      <div className="rounded-lg border border-gray-200 py-16 text-center text-gray-500">
        No jobs to show.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          onClick={() => onSelect(job)}
          className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 ${
            job.possiblyClosed ? "opacity-50" : ""
          }`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                {job.status === null && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                )}
                <h3 className="font-medium text-black">{job.role}</h3>
              </div>
              <p className="text-sm text-gray-600">{job.company}</p>
            </div>
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-blue-600"
            >
              →
            </a>
          </div>
          <p className="mb-3 text-xs text-gray-500">
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
      ))}
    </div>
  );
}
