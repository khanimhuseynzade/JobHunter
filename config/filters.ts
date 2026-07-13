/** Hunt profile — drives LinkedIn queries and board/company title filtering. */

export interface HuntRole {
  /** Primary title fragment used for matching incoming listings. */
  pattern: string;
  /** Extra match aliases (e.g. noun forms recruiters use). */
  aliases?: readonly string[];
  /** LinkedIn-only keyword variants that surface different result sets. */
  linkedInKeywords?: readonly string[];
}

export const huntRoles = [
  {
    pattern: "Product Designer",
    aliases: ["Product Design"],
    linkedInKeywords: ["Digital Product Designer", "Mobile Product Designer"],
  },
  {
    pattern: "UX Designer",
    aliases: ["UX Design", "User Experience Designer"],
  },
  {
    pattern: "UX/UI Designer",
    aliases: ["UI/UX Designer", "UX UI Designer"],
  },
  { pattern: "UI Designer", aliases: ["UI Design"] },
  { pattern: "Interaction Designer" },
  {
    pattern: "Design Systems Designer",
    aliases: ["Design System Designer"],
  },
  { pattern: "Experience Designer" },
  { pattern: "Web Designer" },
  {
    pattern: "AI Designer",
    aliases: ["AI Product Designer"],
    linkedInKeywords: ["AI Product Designer"],
  },
  { pattern: "UI Engineer" },
  { pattern: "Design Engineer" },
  { pattern: "Platform Designer" },
] satisfies HuntRole[];

/** Titles that contain a hunt pattern but are not relevant roles. */
export const excludePatterns = [
  "graphic designer",
  "motion designer",
  "brand designer",
  "visual designer",
  "game designer",
  "level designer",
  "instructional designer",
  "learning designer",
  "sound designer",
  "interior designer",
  "fashion designer",
  "industrial designer",
  "packaging designer",
  "marketing designer",
  "content designer",
] as const;

/** Roles that also get a remote-only LinkedIn search (EU-wide). */
export const linkedInRemoteRoles = [
  "Product Designer",
  "UX Designer",
  "UI Designer",
  "Design Engineer",
] as const;

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

/** All title fragments for incoming listings, longest first for specificity. */
export const matchPatterns = uniqueStrings(
  huntRoles.flatMap((role) => [role.pattern, ...(role.aliases ?? [])])
).sort((a, b) => b.length - a.length);

/** LinkedIn guest-search keywords — primary patterns + extra variants. */
export const searchRoles = uniqueStrings(
  huntRoles.flatMap((role) => [role.pattern, ...(role.linkedInKeywords ?? [])])
);

export const filters = {
  huntRoles,
  excludePatterns,
  matchPatterns,
  searchRoles,
  linkedInRemoteRoles,
  /** Only include listings posted within this many days. */
  maxAgeDays: 30,
  /** Mark as possibly closed when not seen in sync and at least this old. */
  staleAfterDays: 30,
  /**
   * Per-source posted-date policy. Default keeps unknown dates (recall-first).
   * Set allowUnknownDate: false only for sources that always provide dates.
   */
  sourceDatePolicy: {
    default: { allowUnknownDate: true },
    "No Fluff Jobs": { allowUnknownDate: false },
    "Just Join IT": { allowUnknownDate: false },
    LinkedIn: { allowUnknownDate: false },
  } as Record<string, { allowUnknownDate: boolean }>,
} as const;
