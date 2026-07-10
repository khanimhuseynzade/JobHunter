import { filters } from "../../../config/filters";

const rolePatterns = filters.matchPatterns.map((role) =>
  role
    .toLowerCase()
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim()
);

/** Returns true when a job title matches the hunt profile roles. */
export function matchesRole(title: string): boolean {
  const normalized = title.toLowerCase().replace(/\//g, " ").replace(/\s+/g, " ");
  return rolePatterns.some((pattern) => normalized.includes(pattern));
}

export function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const posted = new Date(isoDate).getTime();
  if (Number.isNaN(posted)) return null;
  return Math.max(0, Math.floor((Date.now() - posted) / 86400000));
}

export function isWithinMaxAge(postedDate: string | null): boolean {
  const days = daysSince(postedDate);
  if (days === null) return true;
  return days <= filters.maxAgeDays;
}

export function inferWorkMode(input: {
  fullyRemote?: boolean;
  hybridDesc?: string | null;
  locationText?: string;
}): "remote" | "hybrid" | "on_site" {
  if (input.fullyRemote) return "remote";
  if (input.hybridDesc?.trim()) return "hybrid";
  const text = (input.locationText ?? "").toLowerCase();
  if (text.includes("remote")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  return "on_site";
}

export function formatLocation(parts: string[]): string {
  const unique = [
    ...new Set(
      parts
        .map((part) => (part == null ? "" : String(part)).trim())
        .filter(Boolean)
    ),
  ];
  return unique.join(" · ") || "Unknown";
}
