"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Job, JobStatus } from "@/types";
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
import { Toast } from "./Toast";
import { statusLabel } from "@/lib/status";
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

function filterJobsLocally(jobs: Job[], query: string): Job[] {
  const needle = query.trim().toLowerCase();

  return jobs.filter((job) => {
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
  const [sortKey, setSortKey] = useState<JobSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const id = Date.now();
    setToast({ id, message });
    toastTimer.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Clear the pressed-row highlight on any pointer press. A row click fires
  // mousedown (clears) before its click handler (re-sets pressedId), so
  // clicking a row keeps it highlighted while clicking anywhere else resets it.
  useEffect(() => {
    function handlePointerDown() {
      setPressedId(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const debouncedQuery = useDebouncedValue(query, 300);

  const loadJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (showSkipped) params.set("showSkipped", "true");
    if (showClosed) params.set("showClosed", "true");
    if (debouncedQuery) params.set("q", debouncedQuery);

    setLoadingJobs(true);
    try {
      const jobsRes = await fetch(`/api/jobs?${params}`);
      const data = await jobsRes.json();
      setJobs(data);
    } finally {
      setLoadingJobs(false);
    }
  }, [showSkipped, showClosed, debouncedQuery]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const sort = params.get("sort");
    const dir = params.get("dir");

    if (q) setQuery(q);
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
    if (sortKey) {
      params.set("sort", sortKey);
      params.set("dir", sortDir);
    }
    if (showSkipped) params.set("showSkipped", "true");
    if (showClosed) params.set("showClosed", "true");

    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [debouncedQuery, sortKey, sortDir, showSkipped, showClosed]);

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

    try {
      const raw = window.localStorage.getItem("jobhunter:visitedIds");
      if (raw) setVisitedIds(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  function handleRowOpen(id: string) {
    setPressedId(id);
    setVisitedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        window.localStorage.setItem(
          "jobhunter:visitedIds",
          JSON.stringify([...next])
        );
      } catch {}
      return next;
    });
  }

  const skipInitialJobsFetch = useRef(true);
  useEffect(() => {
    if (skipInitialJobsFetch.current) {
      skipInitialJobsFetch.current = false;
      return;
    }
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(
    () => filterJobsLocally(jobs, query),
    [jobs, query]
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
      showToast(status ? `Marked as ${statusLabel(status)}` : "Status cleared");
    } else {
      showToast("Couldn't update status — try again");
    }
  }

  async function handleCheckEmail() {
    setCheckingEmail(true);
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
        setLastSync(new Date().toISOString());
        showToast(
          data.skipped
            ? data.skipped
            : `Checked ${data.messagesNew ?? 0} new email${data.messagesNew === 1 ? "" : "s"} · ${data.suggestionsCreated ?? 0} new suggestion${data.suggestionsCreated === 1 ? "" : "s"}`
        );
      } else {
        showToast(data.error ?? "Email check failed");
      }
    } catch {
      showToast("Email check failed");
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
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Last updated:{" "}
            <span key={lastSync} className="animate-flash rounded px-1">
              {getLastSyncLabel(lastSync)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button
            type="button"
            onClick={handleCheckEmail}
            disabled={checkingEmail}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-lime-100 disabled:opacity-50"
          >
            <IconMail className="h-3.5 w-3.5" />
            {checkingEmail ? "Checking email…" : "Check email"}
          </button>
        </div>
      </div>

      <SuggestionsPanel
        suggestions={suggestions}
        onResolved={handleSuggestionResolved}
      />

      <div className="mb-4 flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
        <div className="relative w-full sm:flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role, company, location…"
            className="w-full bg-transparent py-2.5 pl-10 pr-3 text-sm text-black placeholder:text-gray-400"
          />
        </div>
        <FiltersMenu
          showSkipped={showSkipped}
          onShowSkippedChange={setShowSkipped}
          showClosed={showClosed}
          onShowClosedChange={setShowClosed}
        />
      </div>

      <p className="mb-2 text-xs text-gray-500">
        Showing {visibleJobs.length} of {jobs.length}
      </p>

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
            visitedIds={visitedIds}
            pressedId={pressedId}
            onRowOpen={handleRowOpen}
          />
        </div>

        <div className="md:hidden">
          <JobCards
            jobs={visibleJobs}
            onStatusChange={handleStatusChange}
            visitedIds={visitedIds}
            pressedId={pressedId}
            onRowOpen={handleRowOpen}
          />
        </div>
      </div>

      {toast ? <Toast key={toast.id} message={toast.message} /> : null}
    </div>
  );
}
