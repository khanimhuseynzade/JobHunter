"use client";

import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import type { JobSortKey, SortDirection } from "@/lib/job-sort";
import { StatusDropdown } from "./StatusDropdown";

interface JobsTableProps {
  jobs: Job[];
  sortKey: JobSortKey | null;
  sortDir: SortDirection;
  onSortChange: (key: JobSortKey) => void;
  onStatusChange: (id: string, status: JobStatus | null) => void;
  onSelect: (job: Job) => void;
}

function formatLatency(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "1d";
  return `${days}d`;
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSortChange,
  className = "",
}: {
  label: string;
  column: JobSortKey;
  sortKey: JobSortKey | null;
  sortDir: SortDirection;
  onSortChange: (key: JobSortKey) => void;
  className?: string;
}) {
  const active = sortKey === column;

  return (
    <th className={`px-4 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onSortChange(column)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-gray-800 ${
          active ? "text-gray-800" : ""
        }`}
      >
        {label}
        {active ? (
          <span className="text-[10px] leading-none text-blue-600">
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        ) : (
          <span className="text-[10px] leading-none text-gray-300">↕</span>
        )}
      </button>
    </th>
  );
}

export function JobsTable({
  jobs,
  sortKey,
  sortDir,
  onSortChange,
  onStatusChange,
  onSelect,
}: JobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 py-16 text-center text-gray-500">
        No jobs to show.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <SortHeader
              label="Status"
              column="status"
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={onSortChange}
            />
            <SortHeader
              label="Role"
              column="role"
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={onSortChange}
            />
            <SortHeader
              label="Company"
              column="company"
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={onSortChange}
            />
            <SortHeader
              label="Mode"
              column="workMode"
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={onSortChange}
            />
            <SortHeader
              label="Lat"
              column="latencyDays"
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={onSortChange}
            />
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => onSelect(job)}
              className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                job.possiblyClosed ? "opacity-50" : ""
              }`}
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <StatusDropdown
                  status={job.status}
                  onChange={(s) => onStatusChange(job.id, s)}
                />
              </td>
              <td className="px-4 py-3 font-medium text-black">
                <span className="flex items-center gap-2">
                  {job.status === null && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  )}
                  {job.role}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700">{job.company}</td>
              <td className="px-4 py-3 text-gray-600">
                {WORK_MODE_LABELS[job.workMode]}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {formatLatency(job.latencyDays)}
              </td>
              <td className="px-4 py-3">
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 hover:text-blue-800"
                >
                  →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
