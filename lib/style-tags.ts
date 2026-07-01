/**
 * Hardcoded domain constants for DRIP. These exact values are used across
 * onboarding, the profile editor, and the search logic. Keep them in sync
 * with the database CHECK constraints in supabase/migrations.
 */

/**
 * Search filters are gender-based: a female profile sees a different
 * aesthetic/occasion/fabric-fit set than a male profile. Non-binary /
 * unspecified profiles get the union of both, deduped, so nobody sees an
 * empty filter panel.
 */
export const FEMALE_AESTHETICS = [
  "clean_girl",
  "old_money",
  "cottagecore",
  "dark_academia",
  "boho",
  "preppy",
  "y2k",
  "minimalist",
  "streetwear",
  "business_casual",
  "athleisure",
  "avant_garde",
  "coastal_grandmother",
  "quiet_luxury",
  "mob_wife",
  "ballet_core",
  "coquette",
  "dark_feminine",
  "indie_sleaze",
] as const;

export const MALE_AESTHETICS = [
  "minimalist",
  "streetwear",
  "old_money",
  "business_casual",
  "athleisure",
  "techwear",
  "gorpcore",
  "smart_casual",
  "workwear",
  "preppy",
  "dark_academia",
  "skater",
  "coastal",
] as const;

export const FEMALE_OCCASIONS = [
  "casual_everyday",
  "date_night",
  "work_office",
  "girls_night",
  "festival",
  "weekend_chill",
  "formal_event",
  "travel",
  "brunch",
  "wedding_guest",
] as const;

export const MALE_OCCASIONS = [
  "casual_everyday",
  "work_office",
  "date_night",
  "night_out",
  "festival",
  "weekend_chill",
  "formal_event",
  "travel",
  "gym",
  "sports",
] as const;

export const FEMALE_FABRIC_FIT = [
  "oversized",
  "fitted",
  "flowy",
  "structured",
  "breathable",
  "sustainable",
  "cotton",
  "linen",
  "silk",
  "wool",
  "cashmere",
  "denim",
  "leather",
  "sheer",
  "bodycon",
  "wrap",
] as const;

export const MALE_FABRIC_FIT = [
  "oversized",
  "slim_fit",
  "regular_fit",
  "relaxed_fit",
  "structured",
  "breathable",
  "sustainable",
  "cotton",
  "linen",
  "wool",
  "denim",
  "leather",
  "technical_fabric",
  "fleece",
] as const;

export const COLORS = [
  "black",
  "white",
  "beige",
  "navy",
  "green",
  "brown",
  "red",
  "pink",
] as const;

export type ColorTag = (typeof COLORS)[number];

function dedupe(tags: readonly string[]): string[] {
  return Array.from(new Set(tags));
}

/**
 * Filter groups shown on the search page, chosen by profile gender. Selecting
 * any tag drives the "not sure what to search for?" suggestions — filters are
 * per-search, ephemeral, and never saved to the profile.
 */
export function getSearchFilterGroups(gender: string | null) {
  const aesthetics =
    gender === "male"
      ? MALE_AESTHETICS
      : gender === "female"
        ? FEMALE_AESTHETICS
        : dedupe([...FEMALE_AESTHETICS, ...MALE_AESTHETICS]);
  const occasions =
    gender === "male"
      ? MALE_OCCASIONS
      : gender === "female"
        ? FEMALE_OCCASIONS
        : dedupe([...FEMALE_OCCASIONS, ...MALE_OCCASIONS]);
  const fabricFit =
    gender === "male"
      ? MALE_FABRIC_FIT
      : gender === "female"
        ? FEMALE_FABRIC_FIT
        : dedupe([...FEMALE_FABRIC_FIT, ...MALE_FABRIC_FIT]);

  return [
    { key: "groupAesthetic", tags: aesthetics },
    { key: "groupOccasion", tags: occasions },
    { key: "groupFabricFit", tags: fabricFit },
    { key: "groupColors", tags: COLORS },
  ] as const;
}

export const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export type Gender = (typeof GENDERS)[number]["value"];

/** Body shapes with a simple emoji glyph used by the visual selector. */
export const BODY_SHAPES = [
  { value: "hourglass", label: "Hourglass", glyph: "⧗" },
  { value: "rectangle", label: "Rectangle", glyph: "▭" },
  { value: "pear", label: "Pear", glyph: "🍐" },
  { value: "apple", label: "Apple", glyph: "🍎" },
  { value: "inverted_triangle", label: "Inverted triangle", glyph: "▽" },
] as const;

export type BodyShape = (typeof BODY_SHAPES)[number]["value"];

export const TOP_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

/** EU bottom sizes. */
export const BOTTOM_SIZES = [
  "32",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
] as const;

export const BUDGET_MIN = 10;
export const BUDGET_MAX = 500;
export const BUDGET_STEP = 10;
export const BUDGET_DEFAULT = 150;
