/**
 * Shops we link out to. Instead of asking an LLM to find and verify
 * individual products (which can't reliably know real-time stock), we send
 * the user straight to each shop's own search results page for their query —
 * always live, always accurate stock/availability, zero API cost.
 */
export type Shop = {
  name: string;
  /** Domain used for the Clearbit logo lookup. */
  domain: string;
  /** Build the shop's own search-results URL for a free-text query. */
  searchUrl: (query: string) => string;
};

export const SHOPS: Shop[] = [
  {
    name: "H&M",
    domain: "hm.com",
    searchUrl: (q) =>
      `https://www2.hm.com/de_de/search-results.html?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Zara",
    domain: "zara.com",
    searchUrl: (q) =>
      `https://www.zara.com/de/de/search?searchTerm=${encodeURIComponent(q)}`,
  },
  {
    name: "ASOS",
    domain: "asos.com",
    searchUrl: (q) => `https://www.asos.com/de/search/?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Oh Polly",
    domain: "ohpolly.com",
    searchUrl: (q) => `https://www.ohpolly.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Club L London",
    domain: "clubllondon.com",
    searchUrl: (q) => `https://clubllondon.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Massimo Dutti",
    domain: "massimodutti.com",
    searchUrl: (q) =>
      `https://www.massimodutti.com/de/search?searchTerm=${encodeURIComponent(q)}`,
  },
  {
    name: "Mango",
    domain: "mango.com",
    searchUrl: (q) => `https://shop.mango.com/de/search?kw=${encodeURIComponent(q)}`,
  },
  {
    name: "Meshki",
    domain: "meshki.com",
    searchUrl: (q) => `https://meshki.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "COS",
    domain: "cos.com",
    searchUrl: (q) => `https://www.cos.com/de_de/search.html?q=${encodeURIComponent(q)}`,
  },
  {
    name: "House of CB",
    domain: "houseofcb.com",
    searchUrl: (q) => `https://www.houseofcb.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Sézane",
    domain: "sezane.com",
    searchUrl: (q) => `https://www.sezane.com/de/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Toteme",
    domain: "toteme-studio.com",
    searchUrl: (q) => `https://toteme-studio.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Loulou de Saison",
    domain: "louloudesaison.com",
    searchUrl: (q) =>
      `https://www.louloudesaison.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Uniqlo",
    domain: "uniqlo.com",
    searchUrl: (q) =>
      `https://www.uniqlo.com/de/de/search?q=${encodeURIComponent(q)}`,
  },
];
