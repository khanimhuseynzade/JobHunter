"use client";

import { useEffect, useRef, useState } from "react";
import type { JobStatus } from "@/types";
import { STATUS_LABELS } from "@/types";
import { statusChipClass, statusLabel } from "@/lib/status";
import { IconChevronDown } from "./icons";

const OPTIONS: { value: JobStatus | null; label: string }[] = [
  { value: null, label: "—" },
  { value: "applied", label: STATUS_LABELS.applied },
  { value: "skipped", label: STATUS_LABELS.skipped },
  { value: "reached_out", label: STATUS_LABELS.reached_out },
  { value: "rejected", label: STATUS_LABELS.rejected },
  { value: "expired", label: STATUS_LABELS.expired },
  { value: "error", label: STATUS_LABELS.error },
];

interface StatusDropdownProps {
  status: JobStatus | null;
  onChange: (status: JobStatus | null) => void;
  compact?: boolean;
}

export function StatusDropdown({
  status,
  onChange,
  compact,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 hover:opacity-80 ${statusChipClass(status)} ${compact ? "min-w-[88px] justify-center" : "min-w-[100px] justify-between"}`}
      >
        <span>{statusLabel(status)}</span>
        <IconChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-gray-200 bg-white">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusChipClass(opt.value)}`}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
