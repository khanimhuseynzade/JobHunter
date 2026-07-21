"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Job, JobStatus, WorkMode } from "@/types";
import { WORK_MODE_LABELS } from "@/types";
import { getLastSyncLabel } from "@/lib/seed";
import { isToday } from "@/lib/job-dates";
import {
  sortJobList,
  type JobSortKey,
  type SortDirection,
} from "@/lib/job-sort";
import { JobsTable } from "./JobsTable";
import { JobCards } from "./JobCards";
import { JobDetail } from "./JobDetail";
import { SuggestionsPanel, type EmailSuggestion } from "./SuggestionsPanel";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

function filterJobsLocally(
  jobs: Job[],
  query: string,
  workMode: WorkMode | ""
): Job[] {
  const needle = query.trim().toLowerCase();

  return jobs.filter((job) => {
    if (workMode && job.workMode !== workMode) return false;
    if (!needle) return true;

    return [job.role, job.company, job.location, job.sourceName].some((field) =>
      field.toLowerCase().includes(needle)
    );
  });
}

export function JobsView({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [showSkipped, setShowSkipped] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [query, setQuery] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode | "">("");
  const [sortKey, setSortKey] = useState<JobSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);

  const debouncedQuery = useDebouncedValue(query, 300);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (showSkipped) params.set("showSkipped", "true");
    if (showClosed) params.set("showClosed", "true");
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (workMode) params.set("workMode", workMode);

    const jobsRes = await fetch(`/api/jobs?${params}`);
    const data = await jobsRes.json();
    setJobs(data);
  }, [showSkipped, showClosed, debouncedQuery, workMode]);

  useEffect(() => {
    fetch("/api/sync")
      .then((res) => (res.ok ? res.json() : null))
      .then((sync) => {
        if (sync) setLastSync(sync.latest);
      })
      .catch(() => {});

    fetch("/api/suggestions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setSuggestions(data);
      })
      .catch(() => {});
  }, []);

  const skipInitialJobsFetch = useRef(true);
  useEffect(() => {
    if (skipInitialJobsFetch.current) {
      skipInitialJobsFetch.current = false;
      return;
    }
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(
    () => filterJobsLocally(jobs, query, workMode),
    [jobs, query, workMode]
  );

  const visibleJobs = useMemo(() => {
    if (!sortKey) return filteredJobs;
    return sortJobList(filteredJobs, sortKey, sortDir);
  }, [filteredJobs, sortKey, sortDir]);

  const jobStats = useMemo(
    () => ({
      total: jobs.length,
      addedToday: jobs.filter((job) => isToday(job.firstSeenAt)).length,
      applied: jobs.filter((job) => job.status === "applied").length,
    }),
    [jobs]
  );

  const hasLocalFilter = Boolean(query.trim() || workMode);

  function handleSortChange(key: JobSortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
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

  function handleSuggestionResolved(
    id: string,
    action: "accept" | "dismiss",
    jobId: string | null,
    status: JobStatus | null
  ) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    if (action === "accept" && jobId && status) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status } : j))
      );
      if (selectedJob?.id === jobId) {
        setSelectedJob((prev) => (prev ? { ...prev, status } : prev));
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xl font-semibold text-black">
            <span>{jobStats.total} total</span>
            <span className="font-normal text-gray-300" aria-hidden>
              ·
            </span>
            <span>{jobStats.addedToday} added today</span>
            <span className="font-normal text-gray-300" aria-hidden>
              ·
            </span>
            <span>{jobStats.applied} applied</span>
            {hasLocalFilter && visibleJobs.length !== jobs.length ? (
              <>
                <span className="font-normal text-gray-300" aria-hidden>
                  ·
                </span>
                <span className="text-base font-normal text-gray-500">
                  {visibleJobs.length} matching
                </span>
              </>
            ) : null}
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

      <SuggestionsPanel
        suggestions={suggestions}
        onResolved={handleSuggestionResolved}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search role, company, location…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400"
        />
        <select
          value={workMode}
          onChange={(e) => setWorkMode(e.target.value as WorkMode | "")}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black sm:max-w-[180px]"
        >
          <option value="">All work modes</option>
          {(Object.entries(WORK_MODE_LABELS) as [WorkMode, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            )
          )}
        </select>
      </div>

      <div className="hidden md:block">
        <JobsTable
          jobs={visibleJobs}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          onStatusChange={handleStatusChange}
          onSelect={setSelectedJob}
        />
      </div>

      <div className="md:hidden">
        <JobCards
          jobs={visibleJobs}
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
