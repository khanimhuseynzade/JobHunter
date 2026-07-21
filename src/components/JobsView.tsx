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
import { SuggestionsPanel, type EmailSuggestion } from "./SuggestionsPanel";
import { FiltersMenu } from "./FiltersMenu";
import { IconMail, IconSearch } from "./icons";

const SORT_KEYS: JobSortKey[] = [
  "status",
  "role",
  "company",
  "location",
  "workMode",
  "latencyDays",
];

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
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkEmailMsg, setCheckEmailMsg] = useState<string | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (showSkipped) params.set("showSkipped", "true");
    if (showClosed) params.set("showClosed", "true");
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (workMode) params.set("workMode", workMode);

    setLoadingJobs(true);
    try {
      const jobsRes = await fetch(`/api/jobs?${params}`);
      const data = await jobsRes.json();
      setJobs(data);
    } finally {
      setLoadingJobs(false);
    }
  }, [showSkipped, showClosed, debouncedQuery, workMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const mode = params.get("workMode");
    const sort = params.get("sort");
    const dir = params.get("dir");

    if (q) setQuery(q);
    if (mode && mode in WORK_MODE_LABELS) setWorkMode(mode as WorkMode);
    if (sort && (SORT_KEYS as string[]).includes(sort)) {
      setSortKey(sort as JobSortKey);
    }
    if (dir === "asc" || dir === "desc") setSortDir(dir);
    if (params.get("showSkipped") === "true") setShowSkipped(true);
    if (params.get("showClosed") === "true") setShowClosed(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (workMode) params.set("workMode", workMode);
    if (sortKey) {
      params.set("sort", sortKey);
      params.set("dir", sortDir);
    }
    if (showSkipped) params.set("showSkipped", "true");
    if (showClosed) params.set("showClosed", "true");

    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [debouncedQuery, workMode, sortKey, sortDir, showSkipped, showClosed]);

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
        if (Array.isArray(data)) {
          setSuggestions(
            [...data].sort((a, b) => b.confidence - a.confidence)
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!checkEmailMsg) return;
    const id = setTimeout(() => setCheckEmailMsg(null), 6000);
    return () => clearTimeout(id);
  }, [checkEmailMsg]);

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
      rejected: jobs.filter((job) => job.status === "rejected").length,
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
      if (!showSkipped && status === "skipped") {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      }
    }
  }

  async function handleCheckEmail() {
    setCheckingEmail(true);
    setCheckEmailMsg(null);
    try {
      const res = await fetch("/api/check-email", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const listRes = await fetch("/api/suggestions");
        if (listRes.ok) {
          const list = await listRes.json();
          if (Array.isArray(list)) {
            setSuggestions(
              [...list].sort((a, b) => b.confidence - a.confidence)
            );
          }
        }
        setCheckEmailMsg(
          data.skipped
            ? data.skipped
            : `Checked ${data.messagesNew ?? 0} new email${data.messagesNew === 1 ? "" : "s"} · ${data.suggestionsCreated ?? 0} new suggestion${data.suggestionsCreated === 1 ? "" : "s"}`
        );
      } else {
        setCheckEmailMsg(data.error ?? "Email check failed");
      }
    } catch {
      setCheckEmailMsg("Email check failed");
    } finally {
      setCheckingEmail(false);
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
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Jobs tracked</p>
          <p className="text-5xl font-bold leading-none tracking-tight text-black">
            {jobStats.total}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
            <span>{jobStats.addedToday} added today</span>
            <span aria-hidden>·</span>
            <span>{jobStats.applied} applied</span>
            <span aria-hidden>·</span>
            <span>{jobStats.rejected} rejected</span>
            {hasLocalFilter && visibleJobs.length !== jobs.length ? (
              <>
                <span aria-hidden>·</span>
                <span>{visibleJobs.length} matching</span>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Last updated: {getLastSyncLabel(lastSync)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button
            type="button"
            onClick={handleCheckEmail}
            disabled={checkingEmail}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <IconMail className="h-3.5 w-3.5" />
            {checkingEmail ? "Checking email…" : "Check email"}
          </button>
          {checkEmailMsg ? (
            <span className="text-xs text-gray-400 transition-opacity">
              {checkEmailMsg}
            </span>
          ) : null}
        </div>
      </div>

      <SuggestionsPanel
        suggestions={suggestions}
        onResolved={handleSuggestionResolved}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role, company, location…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as WorkMode | "")}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-black sm:max-w-[180px]"
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
          <FiltersMenu
            showSkipped={showSkipped}
            onShowSkippedChange={setShowSkipped}
            showClosed={showClosed}
            onShowClosedChange={setShowClosed}
          />
        </div>
      </div>

      <div
        className={`transition-opacity duration-200 ${loadingJobs ? "opacity-50" : ""}`}
      >
        <div className="hidden md:block">
          <JobsTable
            jobs={visibleJobs}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onStatusChange={handleStatusChange}
          />
        </div>

        <div className="md:hidden">
          <JobCards jobs={visibleJobs} onStatusChange={handleStatusChange} />
        </div>
      </div>
    </div>
  );
}
