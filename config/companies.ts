export type AtsProvider =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "smartrecruiters";

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
    ats: { provider: "ashby", boardSlug: "docplanner" },
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
    ats: { provider: "ashby", boardSlug: "elevenlabs" },
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
    ats: { provider: "ashby", boardSlug: "n8n" },
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
    ats: { provider: "ashby", boardSlug: "kittl" },
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
    ats: { provider: "greenhouse", boardSlug: "hellofresh" },
  },
  {
    id: "airhelp",
    name: "AirHelp",
    careersUrl: "https://careers.airhelp.com",
  },
  {
    id: "delivery-hero",
    name: "Delivery Hero",
    careersUrl: "https://careers.deliveryhero.com",
    ats: { provider: "smartrecruiters", boardSlug: "DeliveryHero" },
  },
];
