const PALETTE = [
  { bg: "bg-dusty-blue", text: "text-white" },
  { bg: "bg-ochre", text: "text-white" },
  { bg: "bg-plum", text: "text-white" },
  { bg: "bg-lime-deep", text: "text-forest" },
  { bg: "bg-forest", text: "text-lime" },
];

export interface CompanyAvatar {
  initial: string;
  bgClass: string;
  textClass: string;
}

export function companyAvatar(company: string): CompanyAvatar {
  const trimmed = company.trim();
  const initial = trimmed ? trimmed[0].toUpperCase() : "?";

  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 31 + trimmed.charCodeAt(i)) | 0;
  }
  const { bg, text } = PALETTE[Math.abs(hash) % PALETTE.length];

  return { initial, bgClass: bg, textClass: text };
}
