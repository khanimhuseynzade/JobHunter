"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { JobStatus } from "@/types";
import { STATUS_LABELS } from "@/types";
import { statusChipClass, statusLabel } from "@/lib/status";
import { IconChevronDown } from "./icons";

const OPTIONS: { value: JobStatus | null; label: string }[] = [
  { value: null, label: "—" },
  { value: "applied", label: STATUS_LABELS.applied },
  { value: "skipped", label: STATUS_LABELS.skipped },
  { value: "reached_out", label: STATUS_LABELS.reached_out },
  { value: "in_progress", label: STATUS_LABELS.in_progress },
  { value: "rejected", label: STATUS_LABELS.rejected },
  { value: "expired", label: STATUS_LABELS.expired },
  { value: "error", label: STATUS_LABELS.error },
];

interface StatusDropdownProps {
  status: JobStatus | null;
  onChange: (status: JobStatus | null) => void;
  compact?: boolean;
}

function menuPosition(
  trigger: HTMLElement,
  menu: HTMLElement | null
): { top: number; left: number } {
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const padding = 8;
  const menuHeight = menu?.offsetHeight ?? 0;
  const menuWidth = Math.max(menu?.offsetWidth ?? 0, 140);

  let top = rect.bottom + gap;
  if (menuHeight > 0 && top + menuHeight > window.innerHeight - padding) {
    const above = rect.top - menuHeight - gap;
    top =
      above >= padding
        ? above
        : Math.max(padding, window.innerHeight - menuHeight - padding);
  }

  let left = rect.left;
  if (left + menuWidth > window.innerWidth - padding) {
    left = window.innerWidth - menuWidth - padding;
  }

  return { top, left: Math.max(padding, left) };
}

export function StatusDropdown({
  status,
  onChange,
  compact,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setCoords(menuPosition(trigger, menuRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <div className="relative" ref={triggerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!open && triggerRef.current) {
            setCoords(menuPosition(triggerRef.current, null));
          }
          setOpen(!open);
        }}
        className="group inline-flex min-h-[44px] items-center focus:outline-none"
      >
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-forest group-focus-visible:ring-offset-2 ${statusChipClass(status)} ${compact ? "min-w-[88px] justify-center" : "min-w-[100px] justify-between"}`}
        >
          <span>{statusLabel(status)}</span>
          <IconChevronDown className="h-3 w-3 opacity-60" />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-50 min-w-[140px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-lime-100"
              >
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusChipClass(opt.value)}`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
