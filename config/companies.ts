export type AtsProvider = "greenhouse" | "lever" | "ashby";

export interface CompanyConfig {
  id: string;
  name: string;
  careersUrl: string;
  ats?: {
    provider: AtsProvider;
    boardSlug: string;
  };
}

/**
 * Top companies — independent from board sync.
 * Add `ats` when you know the Greenhouse/Lever/Ashby board slug.
 */
export const companies: CompanyConfig[] = [
  {
    id: "future-mind",
    name: "Future Mind",
    careersUrl: "https://justjoin.it/companies/future-mind",
  },
  {
    id: "docplanner",
    name: "Docplanner",
    careersUrl: "https://careers.docplanner.com",
  },
  {
    id: "revolut",
    name: "Revolut",
    careersUrl: "https://www.revolut.com/careers",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    careersUrl: "https://elevenlabs.io/careers",
  },
  {
    id: "pandadoc",
    name: "PandaDoc",
    careersUrl: "https://www.pandadoc.com/careers",
    ats: { provider: "greenhouse", boardSlug: "pandadoc" },
  },
  {
    id: "booksy",
    name: "Booksy",
    careersUrl: "https://jobs.booksy.com",
  },
  {
    id: "allegro",
    name: "Allegro",
    careersUrl: "https://careers.allegro.eu",
  },
  {
    id: "n8n",
    name: "n8n",
    careersUrl: "https://n8n.io/careers",
  },
  {
    id: "qonto",
    name: "Qonto",
    careersUrl: "https://jobs.lever.co/qonto",
    ats: { provider: "lever", boardSlug: "qonto" },
  },
  {
    id: "remote",
    name: "Remote",
    careersUrl: "https://remote.com/careers",
    ats: { provider: "greenhouse", boardSlug: "remote" },
  },
  {
    id: "contentsquare",
    name: "Contentsquare",
    careersUrl: "https://jobs.lever.co/contentsquare",
    ats: { provider: "lever", boardSlug: "contentsquare" },
  },
  {
    id: "kittl",
    name: "Kittl",
    careersUrl: "https://www.kittl.com/career",
  },
  {
    id: "hostaway",
    name: "Hostaway",
    careersUrl: "https://careers.hostaway.com",
  },
  {
    id: "hellofresh",
    name: "HelloFresh",
    careersUrl: "https://careers.hellofresh.com",
  },
  {
    id: "airhelp",
    name: "AirHelp",
    careersUrl: "https://careers.airhelp.com",
  },
];
