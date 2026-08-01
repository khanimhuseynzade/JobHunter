"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconFilter } from "./icons";

export interface LocationOption {
  location: string;
  count: number;
}

interface FiltersMenuProps {
  showSkipped: boolean;
  onShowSkippedChange: (value: boolean) => void;
  showClosed: boolean;
  onShowClosedChange: (value: boolean) => void;
  locationOptions: LocationOption[];
  selectedLocations: Set<string>;
  onToggleLocation: (location: string) => void;
  onClearLocations: () => void;
}

export function FiltersMenu({
  showSkipped,
  onShowSkippedChange,
  showClosed,
  onShowClosedChange,
  locationOptions,
  selectedLocations,
  onToggleLocation,
  onClearLocations,
}: FiltersMenuProps) {
  const [open, setOpen] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const activeCount =
    Number(showSkipped) + Number(showClosed) + selectedLocations.size;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const visibleLocations = useMemo(() => {
    const needle = locQuery.trim().toLowerCase();
    if (!needle) return locationOptions;
    return locationOptions.filter((opt) =>
      opt.location.toLowerCase().includes(needle)
    );
  }, [locationOptions, locQuery]);

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
        <div className="absolute right-0 z-20 mt-1 min-w-[240px] rounded-xl border border-gray-200 bg-white p-2">
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

          <div className="my-1 border-t border-gray-100" />

          <div className="flex items-center justify-between px-2 pb-1 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Location
            </span>
            {selectedLocations.size > 0 && (
              <button
                type="button"
                onClick={onClearLocations}
                className="text-xs font-medium text-gray-500 hover:text-black"
              >
                Clear
              </button>
            )}
          </div>

          {locationOptions.length > 8 && (
            <input
              type="search"
              value={locQuery}
              onChange={(e) => setLocQuery(e.target.value)}
              placeholder="Filter locations…"
              className="mb-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-black placeholder:text-gray-400"
            />
          )}

          <div className="max-h-56 overflow-y-auto">
            {visibleLocations.length === 0 ? (
              <p className="px-2 py-2 text-xs text-gray-400">
                No locations found
              </p>
            ) : (
              visibleLocations.map((opt) => (
                <label
                  key={opt.location}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-lime-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedLocations.has(opt.location)}
                    onChange={() => onToggleLocation(opt.location)}
                    className="accent-black"
                  />
                  <span className="min-w-0 flex-1 truncate">{opt.location}</span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {opt.count}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
