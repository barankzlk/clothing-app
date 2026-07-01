import type { Locale } from "@/lib/i18n/translations";

/** Short one-line shop blurbs shown on the swipe-deck cards. */
const SHOP_DESCRIPTIONS: Record<string, { de: string; pt: string }> = {
  "H&M": {
    de: "Trendige Basics zu unschlagbaren Preisen",
    pt: "Básicos da moda a preços imbatíveis",
  },
  Zara: {
    de: "Aktuelle Trends, schnell und stilvoll",
    pt: "Tendências atuais, rápidas e estilosas",
  },
  ASOS: {
    de: "Riesige Auswahl an Marken und Stilen",
    pt: "Enorme seleção de marcas e estilos",
  },
  "Oh Polly": {
    de: "Bodycon-Kleider und Glamour für Ausgehlooks",
    pt: "Vestidos bodycon e glamour para looks de balada",
  },
  "Club L London": {
    de: "Elegante Partymode aus London",
    pt: "Moda elegante para festas de Londres",
  },
  "Massimo Dutti": {
    de: "Zeitlose, hochwertige Basics",
    pt: "Básicos atemporais e de alta qualidade",
  },
  Mango: {
    de: "Mediterraner Chic für jeden Anlass",
    pt: "Chique mediterrâneo para qualquer ocasião",
  },
  Meshki: {
    de: "Figurbetonte Styles für besondere Anlässe",
    pt: "Estilos justos para ocasiões especiais",
  },
  COS: {
    de: "Minimalistisches Design, durchdachte Schnitte",
    pt: "Design minimalista, cortes bem pensados",
  },
  "House of CB": {
    de: "Glamouröse Couture-inspirierte Looks",
    pt: "Looks glamourosos inspirados em couture",
  },
  Sézane: {
    de: "Französischer Chic mit Seele",
    pt: "Chique francês com personalidade",
  },
  Toteme: {
    de: "Skandinavischer Minimalismus, hochwertige Stoffe",
    pt: "Minimalismo escandinavo, tecidos de qualidade",
  },
  "Loulou de Saison": {
    de: "Verspielte, feminine Einzelstücke",
    pt: "Peças únicas, lúdicas e femininas",
  },
  Uniqlo: {
    de: "Funktionale Basics für den Alltag",
    pt: "Básicos funcionais para o dia a dia",
  },
};

export function getShopDescription(shopName: string, locale: Locale): string {
  const entry = SHOP_DESCRIPTIONS[shopName];
  if (!entry) return "";
  return entry[locale] ?? entry.de;
}
