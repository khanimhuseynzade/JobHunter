"use client";

import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import { StatusDropdown } from "./StatusDropdown";

interface JobDetailProps {
  job: Job;
  onClose: () => void;
  onStatusChange: (id: string, status: JobStatus | null) => void;
}

export function JobDetail({ job, onClose, onStatusChange }: JobDetailProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/20 md:bg-black/10"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-6 shadow-xl md:bottom-auto md:left-auto md:right-6 md:top-24 md:w-96 md:rounded-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-black">{job.role}</h2>
            <p className="text-gray-600">{job.company}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <dl className="mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Location</dt>
            <dd className="text-black">{job.location}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Work mode</dt>
            <dd className="text-black">{WORK_MODE_LABELS[job.workMode]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Posted</dt>
            <dd className="text-black">
              {job.latencyDays !== null ? `${job.latencyDays}d ago` : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Source</dt>
            <dd className="text-black">{job.sourceName}</dd>
          </div>
          {job.possiblyClosed && (
            <div className="rounded-lg bg-gray-100 px-3 py-2 text-gray-500">
              Possibly closed — not seen in latest sync
            </div>
          )}
        </dl>

        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Status
          </p>
          <StatusDropdown
            status={job.status}
            onChange={(s) => onStatusChange(job.id, s)}
          />
        </div>

        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply
        </a>
      </div>
    </>
  );
}
