/**
 * Shops we run Google Shopping (SerpAPI) searches against. `domain` is used
 * both to build per-shop search queries and to verify a result actually
 * belongs to the shop we think it does (Google Shopping sometimes fills in
 * unrelated retailers when it has no good match for a targeted query).
 */
export type Shop = {
  name: string;
  domain: string;
};

const HM: Shop = { name: "H&M", domain: "hm.com" };
const ZARA: Shop = { name: "Zara", domain: "zara.com" };
const ASOS: Shop = { name: "ASOS", domain: "asos.com" };
const MASSIMO_DUTTI: Shop = { name: "Massimo Dutti", domain: "massimodutti.com" };
const MANGO: Shop = { name: "Mango", domain: "mango.com" };
const COS: Shop = { name: "COS", domain: "cos.com" };
const UNIQLO: Shop = { name: "Uniqlo", domain: "uniqlo.com" };

/** Shown for female and non-binary profiles (and as the default). */
export const FEMALE_SHOPS: Shop[] = [
  HM,
  ZARA,
  ASOS,
  { name: "Oh Polly", domain: "ohpolly.com" },
  { name: "Club L London", domain: "clubllondon.com" },
  MASSIMO_DUTTI,
  MANGO,
  { name: "Meshki", domain: "meshki.com" },
  COS,
  { name: "House of CB", domain: "houseofcb.com" },
  { name: "Sézane", domain: "sezane.com" },
  { name: "Toteme", domain: "toteme-studio.com" },
  { name: "Loulou de Saison", domain: "louloudesaison.com" },
  UNIQLO,
];

/** Shown for male profiles. */
export const MALE_SHOPS: Shop[] = [
  HM,
  ZARA,
  ASOS,
  MASSIMO_DUTTI,
  COS,
  MANGO,
  UNIQLO,
];

export function getShopsForGender(gender: string | null | undefined): Shop[] {
  return gender === "male" ? MALE_SHOPS : FEMALE_SHOPS;
}

/**
 * Big, mainstream shops reliably turn up in a plain (non-targeted) Google
 * Shopping search — so one general search can cover all of them at once
 * instead of one paid SerpAPI call each. Niche shops rarely surface that
 * way and still need a targeted per-shop query.
 */
const BIG_SHOP_NAMES = new Set([
  "H&M",
  "Zara",
  "ASOS",
  "Massimo Dutti",
  "Mango",
  "COS",
  "Uniqlo",
]);

export function splitShops(shops: Shop[]): { big: Shop[]; niche: Shop[] } {
  const big: Shop[] = [];
  const niche: Shop[] = [];
  for (const shop of shops) {
    (BIG_SHOP_NAMES.has(shop.name) ? big : niche).push(shop);
  }
  return { big, niche };
}

/** Lowercase, accent-stripped alphanumeric tokens, e.g. "H&M DE" -> ["h","m","de"]. */
function tokenize(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents, e.g. "é" -> "e"
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Does `needle` appear as a contiguous run inside `haystack`? */
function containsSubsequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Does this SerpAPI shopping result actually belong to one of `candidates`?
 * Checks the product URL's hostname first (authoritative), then falls back
 * to the reported seller name — matched as a whole-word token sequence, not
 * a raw substring, so e.g. "Zaragoza Boutique" doesn't falsely match "Zara"
 * just because the letters appear inside a longer, unrelated word.
 */
export function findMatchingShop(
  result: { source?: string; link?: string; product_link?: string },
  candidates: Shop[],
): Shop | null {
  let host = "";
  try {
    host = new URL(result.link || result.product_link || "").hostname
      .toLowerCase()
      .replace(/^www\d*\./, "");
  } catch {
    host = "";
  }
  if (host) {
    for (const shop of candidates) {
      const domain = shop.domain.toLowerCase().replace(/^www\d*\./, "");
      if (host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`)) {
        return shop;
      }
    }
  }

  if (result.source) {
    const sourceTokens = tokenize(result.source);
    for (const shop of candidates) {
      if (containsSubsequence(sourceTokens, tokenize(shop.name))) return shop;
    }
  }
  return null;
}
