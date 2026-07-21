"use client";

import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import type { JobSortKey, SortDirection } from "@/lib/job-sort";
import { isJobPostedToday } from "@/lib/job-dates";
import { formatDisplayLocation } from "@/lib/location";
import { companyAvatar } from "@/lib/avatar";
import { StatusDropdown } from "./StatusDropdown";
import { PostedTodayBadge } from "./PostedTodayBadge";
import { ClosedBadge } from "./ClosedBadge";
import { IconArrowUpRight, IconChevronDown } from "./icons";

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
  onSelect,
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
              label="Latency"
              column="latencyDays"
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={onSortChange}
            />
            <th className="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const avatar = companyAvatar(job.company);
            return (
              <tr
                key={job.id}
                onClick={() => onSelect(job)}
                className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                  job.possiblyClosed ? "opacity-70" : ""
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
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                    )}
                    {job.role}
                    {isJobPostedToday(job) ? <PostedTodayBadge /> : null}
                    {job.possiblyClosed ? <ClosedBadge /> : null}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatar.bgClass} ${avatar.textClass}`}
                    >
                      {avatar.initial}
                    </span>
                    {job.company}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatDisplayLocation(job.location)}
                </td>
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
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-black transition-colors hover:border-lime hover:bg-lime-100"
                  >
                    <IconArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
