"use client";

import { useCallback, useEffect, useState } from "react";
import type { Job, JobStatus } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import { getLastSyncLabel } from "@/lib/seed";
import { JobsTable } from "./JobsTable";
import { JobCards } from "./JobCards";
import { JobDetail } from "./JobDetail";

export function JobsView({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [showSkipped, setShowSkipped] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (showSkipped) params.set("showSkipped", "true");
    if (showClosed) params.set("showClosed", "true");
    const [jobsRes, syncRes] = await Promise.all([
      fetch(`/api/jobs?${params}`),
      fetch("/api/sync"),
    ]);
    const data = await jobsRes.json();
    setJobs(data);
    if (syncRes.ok) {
      const sync = await syncRes.json();
      setLastSync(sync.latest);
    }
  }, [showSkipped, showClosed]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function handleStatusChange(id: string, status: JobStatus | null) {
    const res = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      if (selectedJob?.id === id) {
        setSelectedJob(updated);
      }
      if (!showSkipped && status === "skipped") {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-black">
            {jobs.length} jobs
          </h1>
          <p className="text-sm text-gray-500">
            Last updated: {getLastSyncLabel(lastSync)}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showSkipped}
              onChange={(e) => setShowSkipped(e.target.checked)}
              className="accent-blue-600"
            />
            Show skipped
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
              className="accent-blue-600"
            />
            Show possibly closed
          </label>
        </div>
      </div>

      <div className="hidden md:block">
        <JobsTable
          jobs={jobs}
          onStatusChange={handleStatusChange}
          onSelect={setSelectedJob}
        />
      </div>

      <div className="md:hidden">
        <JobCards
          jobs={jobs}
          onStatusChange={handleStatusChange}
          onSelect={setSelectedJob}
        />
      </div>

      {selectedJob && (
        <JobDetail
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
