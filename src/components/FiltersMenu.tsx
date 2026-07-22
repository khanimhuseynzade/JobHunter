"use client";

import { useEffect, useRef, useState } from "react";
import { IconFilter } from "./icons";

interface FiltersMenuProps {
  showSkipped: boolean;
  onShowSkippedChange: (value: boolean) => void;
  showClosed: boolean;
  onShowClosedChange: (value: boolean) => void;
}

export function FiltersMenu({
  showSkipped,
  onShowSkippedChange,
  showClosed,
  onShowClosedChange,
}: FiltersMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeCount = Number(showSkipped) + Number(showClosed);

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
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap bg-transparent px-3 py-2.5 text-sm text-black hover:bg-lime-100"
      >
        <IconFilter className="h-4 w-4 text-gray-500" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-lime text-[10px] font-semibold text-forest">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-xl border border-gray-200 bg-white p-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-lime-100">
            <input
              type="checkbox"
              checked={showSkipped}
              onChange={(e) => onShowSkippedChange(e.target.checked)}
              className="accent-black"
            />
            Show skipped
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-lime-100">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => onShowClosedChange(e.target.checked)}
              className="accent-black"
            />
            Show possibly closed
          </label>
        </div>
      )}
    </div>
  );
}
