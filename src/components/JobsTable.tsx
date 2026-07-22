"use client";

import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import type { JobSortKey, SortDirection } from "@/lib/job-sort";
import { isJobPostedToday } from "@/lib/job-dates";
import { formatDisplayLocation } from "@/lib/location";
import { StatusDropdown } from "./StatusDropdown";
import { PostedTodayBadge } from "./PostedTodayBadge";
import { ClosedBadge } from "./ClosedBadge";
import { IconChevronDown } from "./icons";

interface JobsTableProps {
  jobs: Job[];
  sortKey: JobSortKey | null;
  sortDir: SortDirection;
  onSortChange: (key: JobSortKey) => void;
  onStatusChange: (id: string, status: JobStatus | null) => void;
  visitedIds: Set<string>;
  pressedId: string | null;
  onRowOpen: (id: string) => void;
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
        className={`inline-flex items-center gap-1 transition-colors hover:text-black ${
          active ? "text-black" : ""
        }`}
      >
        {label}
        <IconChevronDown
          className={`h-3 w-3 transition-transform ${
            active
              ? `text-black ${sortDir === "desc" ? "rotate-180" : ""}`
              : "text-gray-300"
          }`}
        />
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
  visitedIds,
  pressedId,
  onRowOpen,
}: JobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-gray-500">
        No jobs to show.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
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
              label="Location"
              column="location"
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
              label="Posted"
              column="latencyDays"
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={onSortChange}
            />
            <th className="px-4 py-3">Source</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const visited = visitedIds.has(job.id);
            const pressed = pressedId === job.id;
            // Pressed keeps the same fill/hover and shape as any other row —
            // only the bottom divider stroke is recolored to mark it.
            return (
              <tr
                key={job.id}
                onClick={() => {
                  onRowOpen(job.id);
                  window.open(job.applyUrl, "_blank", "noopener,noreferrer");
                }}
                className={`cursor-pointer border-b transition-colors hover:bg-lime-100 ${
                  pressed ? "border-lime-deep" : "border-gray-100"
                } ${job.possiblyClosed ? "opacity-70" : ""}`}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown
                    status={job.status}
                    onChange={(s) => onStatusChange(job.id, s)}
                  />
                </td>
                <td
                  className={`max-w-[280px] px-4 py-3 font-medium ${visited ? "text-gray-500" : "text-black"}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {job.status === null && !visited && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                    )}
                    <span className="truncate" title={job.role}>
                      {job.role}
                    </span>
                    {isJobPostedToday(job) ? <PostedTodayBadge /> : null}
                    {job.possiblyClosed ? <ClosedBadge /> : null}
                  </span>
                </td>
                <td
                  className="max-w-[160px] truncate px-4 py-3 text-gray-700"
                  title={job.company}
                >
                  {job.company}
                </td>
                <td
                  className="max-w-[160px] truncate px-4 py-3 text-gray-600"
                  title={formatDisplayLocation(job.location)}
                >
                  {formatDisplayLocation(job.location)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {WORK_MODE_LABELS[job.workMode]}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatLatency(job.latencyDays)}
                </td>
                <td className="px-4 py-3 text-gray-600">{job.sourceName}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
