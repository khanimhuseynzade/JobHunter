export type BoardProvider =
  | "nofluffjobs"
  | "justjoinit"
  | "bulldogjob"
  | "weworkremotely"
  | "jobicy"
  | "remoteok"
  | "euremotejobs"
  | "linkedin";

export interface BoardConfig {
  id: string;
  name: string;
  provider: BoardProvider;
  enabled: boolean;
}

/**
 * Just Join IT category slugs (candidate-api `categories` param).
 * Design roles are concentrated in `ux`, but some listings are filed under
 * `mobile`, `pm`, `ai`, or `other`. There is no `product` category on JJIT.
 */
export const justJoinItCategories = [
  "ux",
  "mobile",
  "pm",
  "ai",
  "other",
] as const;

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
    enabled: true,
  },
  {
    id: "bulldogjob",
    name: "Bulldogjob",
    provider: "bulldogjob",
    enabled: true,
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    provider: "weworkremotely",
    enabled: true,
  },
  {
    id: "jobicy",
    name: "Jobicy",
    provider: "jobicy",
    enabled: true,
  },
  {
    id: "remoteok",
    name: "RemoteOK",
    provider: "remoteok",
    enabled: true,
  },
  {
    id: "euremotejobs",
    name: "EU Remote Jobs",
    provider: "euremotejobs",
    enabled: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    provider: "linkedin",
    enabled: true,
  },
];
