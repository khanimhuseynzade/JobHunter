export type BoardProvider = "nofluffjobs" | "justjoinit";

export interface BoardConfig {
  id: string;
  name: string;
  provider: BoardProvider;
  enabled: boolean;
}

/** External job boards — independent from company sync. */
export const boards: BoardConfig[] = [
  {
    id: "nofluffjobs",
    name: "No Fluff Jobs",
    provider: "nofluffjobs",
    enabled: true,
  },
  {
    id: "justjoinit",
    name: "Just Join IT",
    provider: "justjoinit",
    enabled: false, // API endpoint changed; re-enable when fetcher is updated
  },
];
