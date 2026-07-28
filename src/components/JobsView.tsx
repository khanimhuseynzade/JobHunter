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

type RangeKey = "7d" | "30d" | "all";

const RANGE_ORDER: RangeKey[] = ["7d", "30d", "all"];

const RANGE_CONFIG: Record<
  RangeKey,
  {
    days: number | null;
    rangeLabel: string;
    toggleLabel: string;
    goal: number;
    periodTarget: string;
  }
> = {
  "7d": {
    days: 7,
    rangeLabel: "last 7 days",
    toggleLabel: "7d",
    goal: 80,
    periodTarget: "this week's target",
  },
  "30d": {
    days: 30,
    rangeLabel: "last 30 days",
    toggleLabel: "30d",
    goal: 320,
    periodTarget: "this month's target",
  },
  all: {
    days: null,
    rangeLabel: "all time",
    toggleLabel: "All",
    goal: 80,
    periodTarget: "your target",
  },
};

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
  const [range, setRange] = useState<RangeKey>("7d");
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

  // Jobs scoped to the selected range (by firstSeenAt). Shared by the stats
  // card and the table/cards below so the whole view reflects the range.
  const rangedJobs = useMemo(() => {
    const { days } = RANGE_CONFIG[range];
    if (days == null) return jobs;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return jobs.filter((job) => new Date(job.firstSeenAt).getTime() >= cutoff);
  }, [jobs, range]);

  const filteredJobs = useMemo(
    () => filterJobsLocally(rangedJobs, query),
    [rangedJobs, query]
  );

  const visibleJobs = useMemo(() => {
    if (!sortKey) return filteredJobs;
    return sortJobList(filteredJobs, sortKey, sortDir);
  }, [filteredJobs, sortKey, sortDir]);

  // Stats are scoped to the selected range by firstSeenAt (when a job was
  // first tracked). The Job model has no per-status timestamp, so applied/
  // rejected counts reflect jobs first seen within the window.
  const jobStats = useMemo(
    () => ({
      total: rangedJobs.length,
      addedToday: rangedJobs.filter((job) => isToday(job.firstSeenAt)).length,
      applied: rangedJobs.filter((job) => job.status === "applied").length,
      rejected: rangedJobs.filter((job) => job.status === "rejected").length,
    }),
    [rangedJobs]
  );

  const goalStats = useMemo(() => {
    const { goal, periodTarget } = RANGE_CONFIG[range];
    const submitted = jobStats.applied;
    const remaining = Math.max(0, goal - submitted);
    const pct = goal > 0 ? Math.min(100, (submitted / goal) * 100) : 0;
    const helper =
      remaining > 0
        ? `${remaining} more to hit ${periodTarget}`
        : `You've hit ${periodTarget} — nice work`;
    return { goal, submitted, remaining, pct, helper };
  }, [jobStats.applied, range]);

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
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white">
        {/* Header stats block — count, range toggle, email button */}
        <div className="px-6 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Jobs tracked</p>
              <p className="mt-1 text-5xl font-bold leading-none tracking-tight text-black">
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

            {/* Controls: email button + range toggle. Right-aligned stack on
                desktop; wraps below the stats on small screens. */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-3">
              <button
                type="button"
                onClick={handleCheckEmail}
                disabled={checkingEmail}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-lime-100 disabled:opacity-50"
              >
                <IconMail className="h-3.5 w-3.5 text-forest" />
                {checkingEmail ? "Checking email…" : "Check email"}
              </button>

              {/* Segmented range toggle (7d / 30d / All) */}
              <div
                className="inline-flex rounded-full p-0.5"
                style={{ backgroundColor: "#eceeed" }}
                role="tablist"
                aria-label="Stats range"
              >
                {RANGE_ORDER.map((key) => {
                  const active = range === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setRange(key)}
                      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                      style={
                        active
                          ? {
                              backgroundColor: "#fff",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                              color: "#111",
                            }
                          : { color: "#6b7280" }
                      }
                    >
                      {RANGE_CONFIG[key].toggleLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Divider + goal-progress block */}
        <div
          className="mx-6 pb-6"
          style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid #eceeed",
          }}
        >
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-gray-600">
              Applications submitted this period
            </span>
            <span className="text-gray-500">
              <strong className="text-black">{goalStats.submitted}</strong> /{" "}
              {goalStats.goal} goal
            </span>
          </div>
          <div
            className="mt-2 w-full overflow-hidden"
            style={{ height: 10, borderRadius: 6, backgroundColor: "#eceeed" }}
          >
            <div
              style={{
                width: `${goalStats.pct}%`,
                height: "100%",
                borderRadius: 6,
                backgroundColor: "var(--color-lime-deep)",
                transition: "width 200ms ease",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">{goalStats.helper}</p>
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
        Showing {visibleJobs.length} of {rangedJobs.length}
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
