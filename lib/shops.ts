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

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents, e.g. "é" -> "e"
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Does this SerpAPI shopping result actually belong to one of `candidates`?
 * Checks both the reported seller name and the product URL's hostname,
 * since Google Shopping will happily fill in some unrelated retailer when
 * it doesn't have a great match for what we asked for.
 */
export function findMatchingShop(
  result: { source?: string; link?: string; product_link?: string },
  candidates: Shop[],
): Shop | null {
  const source = result.source ? normalize(result.source) : "";
  let host = "";
  try {
    host = new URL(result.link || result.product_link || "").hostname
      .toLowerCase()
      .replace(/^www\d*\./, "");
  } catch {
    host = "";
  }

  for (const shop of candidates) {
    const shopName = normalize(shop.name);
    if (source && (source.includes(shopName) || shopName.includes(source))) {
      return shop;
    }
    if (host) {
      const domain = shop.domain.toLowerCase().replace(/^www\d*\./, "");
      if (host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`)) {
        return shop;
      }
    }
  }
  return null;
}
