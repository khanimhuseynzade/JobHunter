import { filters } from "../../../config/filters";

const rolePatterns = filters.matchPatterns.map((role) => normalizePattern(role));

const excludePatterns = filters.excludePatterns.map((role) =>
  normalizePattern(role)
);

const SENIORITY_PREFIX =
  /^(?:(?:senior|sr|junior|jr|lead|staff|principal|head|associate|mid(?:level)?|entry(?:[\s-]level)?|intern(?:ship)?|director|vp|chief)\.?\s+)+/i;

function normalizePattern(value: string): string {
  return value
    .toLowerCase()
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip seniority / level prefixes so dedupe and matching stay consistent. */
export function stripSeniorityPrefix(title: string): string {
  let result = title.trim();
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(SENIORITY_PREFIX, "").trim();
  }
  return result;
}

export function normalizeTitleForMatch(title: string): string {
  return normalizePattern(stripSeniorityPrefix(title));
}

function isBoundaryChar(char: string | undefined): boolean {
  if (!char) return true;
  return !/\p{L}/u.test(char);
}

function includesPattern(normalized: string, pattern: string): boolean {
  const idx = normalized.indexOf(pattern);
  if (idx === -1) return false;

  const before = idx === 0 ? undefined : normalized[idx - 1];
  const after =
    idx + pattern.length >= normalized.length
      ? undefined
      : normalized[idx + pattern.length];

  return isBoundaryChar(before) && isBoundaryChar(after);
}

function matchesExcludePattern(normalized: string): boolean {
  return excludePatterns.some((pattern) => includesPattern(normalized, pattern));
}

/** Returns true when a job title matches the hunt profile roles. */
export function matchesRole(title: string): boolean {
  const normalized = normalizeTitleForMatch(title);
  if (matchesExcludePattern(normalized)) return false;
  return rolePatterns.some((pattern) => includesPattern(normalized, pattern));
}

export function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const posted = new Date(isoDate).getTime();
  if (Number.isNaN(posted)) return null;
  return Math.max(0, Math.floor((Date.now() - posted) / 86400000));
}

function sourceAllowsUnknownDate(sourceName?: string): boolean {
  const policy =
    (sourceName && filters.sourceDatePolicy[sourceName]) ||
    filters.sourceDatePolicy.default;
  return policy.allowUnknownDate;
}

export function isWithinMaxAge(
  postedDate: string | null,
  sourceName?: string
): boolean {
  const days = daysSince(postedDate);
  if (days === null) return sourceAllowsUnknownDate(sourceName);
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

/** Normalize role text for company+role dedupe keys. */
export function normalizeRoleForDedupe(role: string): string {
  return normalizeTitleForMatch(role);
}
