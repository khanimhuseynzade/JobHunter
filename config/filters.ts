/** Hunt profile — drives LinkedIn queries and board/company title filtering. */
export const filters = {
  /**
   * LinkedIn guest-search keywords — one query per role × region.
   * Includes title variants that surface different result sets on LinkedIn.
   */
  searchRoles: [
    "Product Designer",
    "Digital Product Designer",
    "Mobile Product Designer",
    "UX Designer",
    "UX/UI Designer",
    "UI Designer",
    "Interaction Designer",
    "Design Systems Designer",
    "Experience Designer",
    "Web Designer",
    "AI Designer",
    "AI Product Designer",
    "UI Engineer",
    "Design Engineer",
    "Platform Designer",
  ],

  /**
   * Title fragments for incoming listings — matches when normalized title
   * includes any pattern (covers seniority prefixes and compound titles).
   */
  matchPatterns: [
    "Product Designer",
    "UX Designer",
    "UX/UI Designer",
    "UI Designer",
    "Interaction Designer",
    "Design Systems Designer",
    "Experience Designer",
    "Web Designer",
    "AI Designer",
    "UI Engineer",
    "Design Engineer",
    "Platform Designer",
  ],

  /** Only include listings posted within this many days. */
  maxAgeDays: 30,
  /** Mark as possibly closed if not seen in sync for this many days. */
  staleAfterDays: 45,
} as const;
