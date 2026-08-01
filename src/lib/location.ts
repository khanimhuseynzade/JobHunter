const NOISE =
  /^(remote|hybrid|office|on[-_ ]?site|full[- ]?time|unknown|b2b|permanent|contract)$/i;

const CITY_ALIASES: Record<string, string> = {
  warszawa: "Warsaw",
  warsaw: "Warsaw",
  cracow: "Kraków",
  krakow: "Kraków",
  kraków: "Kraków",
  wroclaw: "Wrocław",
  wrocław: "Wrocław",
};

const COUNTRY_ALIASES: Record<string, string> = {
  poland: "Poland",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  "u.k.": "United Kingdom",
  usa: "USA",
  "united states": "USA",
  "united states of america": "USA",
  ireland: "Ireland",
  germany: "Germany",
  spain: "Spain",
  lithuania: "Lithuania",
  latvia: "Latvia",
  netherlands: "Netherlands",
  "the netherlands": "Netherlands",
  france: "France",
  portugal: "Portugal",
  "czech republic": "Czechia",
  czechia: "Czechia",
  austria: "Austria",
  belgium: "Belgium",
  switzerland: "Switzerland",
  sweden: "Sweden",
  norway: "Norway",
  denmark: "Denmark",
  italy: "Italy",
  romania: "Romania",
  ukraine: "Ukraine",
  estonia: "Estonia",
  finland: "Finland",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
};

const REGION_KEYS = new Set([
  "mazowieckie",
  "małopolskie",
  "malopolskie",
  "dolnośląskie",
  "dolnoslaskie",
  "pomorskie",
  "wielkopolskie",
  "śląskie",
  "slaskie",
  "county dublin",
  "community of madrid",
  "north holland",
  "vilniaus",
]);

const POLISH_CITIES = new Set([
  "Warsaw",
  "Kraków",
  "Wrocław",
  "Gdańsk",
  "Poznań",
  "Łódź",
  "Katowice",
  "Lublin",
  "Szczecin",
]);

function key(value: string): string {
  return value.trim().toLowerCase();
}

function splitParts(location: string): string[] {
  return location
    .split(/\s*[·,]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeCity(part: string): string | null {
  const k = key(part);
  if (!k || NOISE.test(k) || REGION_KEYS.has(k) || COUNTRY_ALIASES[k]) {
    return null;
  }
  if (CITY_ALIASES[k]) return CITY_ALIASES[k];
  // "London Area" → keep as London for cleaner display
  if (k === "london area") return "London";
  return part.trim();
}

function normalizeCountry(part: string): string | null {
  const k = key(part);
  return COUNTRY_ALIASES[k] ?? null;
}

/** True when any part of the location resolves to Poland (country or a Polish city). */
export function isPolandLocation(location: string): boolean {
  const raw = location?.trim();
  if (!raw) return false;

  for (const part of splitParts(raw)) {
    if (normalizeCountry(part) === "Poland") return true;
    const city = normalizeCity(part);
    if (city && POLISH_CITIES.has(city)) return true;
  }
  return false;
}

/** Collapse multi-city/region strings to one city + one country. Prefers Warsaw, Poland. */
export function formatDisplayLocation(location: string): string {
  const raw = location?.trim();
  if (!raw) return "—";

  const parts = splitParts(raw);
  const cities: string[] = [];
  const countries: string[] = [];

  for (const part of parts) {
    const country = normalizeCountry(part);
    if (country) {
      if (!countries.includes(country)) countries.push(country);
      continue;
    }
    const city = normalizeCity(part);
    if (city && !cities.includes(city)) cities.push(city);
  }

  const city =
    cities.find((c) => c === "Warsaw") ?? cities[0] ?? null;
  let country =
    countries.find((c) => c === "Poland") ?? countries[0] ?? null;

  if (!country && city && POLISH_CITIES.has(city)) {
    country = "Poland";
  }

  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;

  // Pure remote / noise-only strings
  if (parts.some((part) => NOISE.test(key(part)))) return "Remote";
  return raw;
}
