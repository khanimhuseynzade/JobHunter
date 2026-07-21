"use client";

import { useState } from "react";
import type { JobStatus } from "@/types";
import { statusChipClass, statusLabel } from "@/lib/status";

export interface EmailSuggestion {
  id: string;
  jobId: string | null;
  company: string | null;
  role: string | null;
  currentStatus: JobStatus | null;
  fromEmail: string;
  subject: string;
  receivedAt: string | null;
  snippet: string;
  suggestedStatus: JobStatus | null;
  confidence: number;
  reasoning: string;
}

interface SuggestionsPanelProps {
  suggestions: EmailSuggestion[];
  onResolved: (
    id: string,
    action: "accept" | "dismiss",
    jobId: string | null,
    status: JobStatus | null
  ) => void;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SuggestionsPanel({
  suggestions,
  onResolved,
}: SuggestionsPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function resolve(id: string, action: "accept" | "dismiss") {
    setBusyId(id);
    const suggestion = suggestions.find((s) => s.id === id);
    try {
      const res = await fetch("/api/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        onResolved(
          id,
          action,
          suggestion?.jobId ?? null,
          action === "accept" ? (suggestion?.suggestedStatus ?? null) : null
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-ochre-200 bg-ochre-100/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ochre-text">
          {suggestions.length} email suggestion
          {suggestions.length === 1 ? "" : "s"}
        </h2>
        <span className="text-xs text-ochre-text/70">
          From your inbox — review before applying
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-3 rounded-xl border border-ochre-200/70 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-black">
                  {s.company ?? "Unknown company"}
                </span>
                {s.role ? (
                  <span className="text-gray-500">· {s.role}</span>
                ) : null}
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${statusChipClass(s.currentStatus)}`}
                  >
                    {statusLabel(s.currentStatus)}
                  </span>
                  <span aria-hidden>→</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${statusChipClass(s.suggestedStatus)}`}
                  >
                    {statusLabel(s.suggestedStatus)}
                  </span>
                </span>
                <span className="text-xs text-gray-400">{s.confidence}%</span>
              </div>
              <p className="mt-1 truncate text-xs text-gray-600">
                <span className="text-gray-400">
                  {formatDate(s.receivedAt)}
                  {formatDate(s.receivedAt) ? " · " : ""}
                </span>
                {s.subject}
              </p>
              {s.reasoning ? (
                <p className="mt-0.5 text-xs italic text-gray-400">
                  {s.reasoning}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => resolve(s.id, "accept")}
                className="rounded-full bg-lime px-3 py-1.5 text-xs font-semibold text-forest transition-colors duration-200 hover:bg-lime-deep disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => resolve(s.id, "dismiss")}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
