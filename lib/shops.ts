/**
 * Shop -> domain map for the curated shop list, used to build a Clearbit logo
 * URL (https://logo.clearbit.com/<domain>) as an image fallback on product
 * cards. Unknown shops fall back to a slugified "<name>.com" guess.
 */
const SHOP_DOMAINS: Record<string, string> = {
  "h&m": "hm.com",
  hm: "hm.com",
  zara: "zara.com",
  asos: "asos.com",
  "oh polly": "ohpolly.com",
  ohpolly: "ohpolly.com",
  "club l london": "clublondon.co.uk",
  "club l": "clublondon.co.uk",
  "massimo dutti": "massimodutti.com",
  massimodutti: "massimodutti.com",
  mango: "mango.com",
  meshki: "meshki.com",
  cos: "cos.com",
  "house of cb": "houseofcb.com",
  houseofcb: "houseofcb.com",
  "sézane": "sezane.com",
  sezane: "sezane.com",
  "totême": "toteme-studio.com",
  toteme: "toteme-studio.com",
  "loulou de saison": "louloudesaison.com",
};

function slugDomain(shop: string): string {
  // NFD splits accents into base + combining mark; [^a-z0-9] then drops the
  // marks and any punctuation/spaces, leaving e.g. "Sézane" -> "sezane".
  const slug = shop.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : "";
}

/** Best-guess registrable domain for a shop name. */
export function shopDomain(shop: string): string {
  const key = shop.trim().toLowerCase();
  return SHOP_DOMAINS[key] || slugDomain(shop);
}

/** Clearbit logo URL for a shop name (empty string if it can't be derived). */
export function clearbitLogo(shop: string): string {
  const domain = shopDomain(shop);
  return domain ? `https://logo.clearbit.com/${domain}` : "";
}
