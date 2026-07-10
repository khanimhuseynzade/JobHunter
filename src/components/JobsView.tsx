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
  const [importOpen, setImportOpen] = useState(false);
  const [importUrls, setImportUrls] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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

  async function handleLinkedInImport() {
    const urls = importUrls
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setImportStatus("Paste at least one LinkedIn job URL.");
      return;
    }

    setImporting(true);
    setImportStatus(null);

    try {
      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();

      if (!res.ok) {
        setImportStatus(data.error ?? "Import failed");
        return;
      }

      setImportStatus(
        `Imported ${data.imported} job${data.imported === 1 ? "" : "s"} (${data.jobsNew} new).`
      );
      setImportUrls("");
      await loadJobs();
    } catch {
      setImportStatus("Import failed — check your connection.");
    } finally {
      setImporting(false);
    }
  }

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
          <button
            type="button"
            onClick={() => setImportOpen((open) => !open)}
            className="text-blue-600 hover:underline"
          >
            {importOpen ? "Hide LinkedIn import" : "Import from LinkedIn"}
          </button>
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

      {importOpen && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm text-gray-600">
            Paste LinkedIn job URLs (one per line). Jobs outside your role
            filter or older than 30 days are skipped.
          </p>
          <textarea
            value={importUrls}
            onChange={(e) => setImportUrls(e.target.value)}
            rows={3}
            placeholder="https://www.linkedin.com/jobs/view/..."
            className="mb-3 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLinkedInImport}
              disabled={importing}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import jobs"}
            </button>
            {importStatus && (
              <p className="text-sm text-gray-600">{importStatus}</p>
            )}
          </div>
        </div>
      )}

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
