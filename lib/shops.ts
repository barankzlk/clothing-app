/**
 * Shops we run Google Shopping (SerpAPI) searches against, one query per
 * shop. `domain` is used both to build the per-shop search query and as the
 * fallback for the Clearbit logo lookup when a result doesn't clearly name
 * its own domain.
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
