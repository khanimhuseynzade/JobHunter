/** Hunt profile — drives both board and company sync filtering. */
export const filters = {
  roles: [
    "Product Designer",
    "Web Designer",
    "AI Designer",
    "UI Engineer",
    "UX/UI Designer",
    "UX Designer",
  ],
  /** Only include listings posted within this many days. */
  maxAgeDays: 30,
  /** Mark as possibly closed if not seen in sync for this many days. */
  staleAfterDays: 45,
} as const;
