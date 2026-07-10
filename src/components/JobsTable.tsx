"use client";

import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import { StatusDropdown } from "./StatusDropdown";

interface JobsTableProps {
  jobs: Job[];
  onStatusChange: (id: string, status: JobStatus | null) => void;
  onSelect: (job: Job) => void;
}

function formatLatency(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days === 1) return "1d";
  return `${days}d`;
}

function shortSource(name: string): string {
  if (name.length <= 12) return name;
  if (name.includes("Just Join")) return "JJ";
  if (name.includes("No Fluff")) return "NFJ";
  if (name.includes("careers")) return "co";
  return name.slice(0, 8);
}

export function JobsTable({ jobs, onStatusChange, onSelect }: JobsTableProps) {
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
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3">Lat</th>
            <th className="px-4 py-3">Src</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => onSelect(job)}
              className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                job.possiblyClosed ? "opacity-50" : ""
              } ${job.status === null ? "" : ""}`}
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
                  {job.pageId && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-blue-400">
                      page
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700">{job.company}</td>
              <td className="px-4 py-3 text-gray-600">{job.location}</td>
              <td className="px-4 py-3 text-gray-600">
                {WORK_MODE_LABELS[job.workMode]}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {formatLatency(job.latencyDays)}
              </td>
              <td
                className="px-4 py-3 text-gray-500"
                title={job.sourceName}
              >
                {shortSource(job.sourceName)}
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
