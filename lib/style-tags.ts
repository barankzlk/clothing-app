/**
 * Hardcoded domain constants for DRIP. These exact values are used across
 * onboarding, the profile editor, and the search logic. Keep them in sync
 * with the database CHECK constraints in supabase/migrations.
 */

export const AESTHETIC_STYLES = [
  "minimalist",
  "old_money",
  "streetwear",
  "cottagecore",
  "dark_academia",
  "clean_girl",
  "boho",
  "preppy",
  "y2k",
  "business_casual",
  "athleisure",
  "avant_garde",
] as const;

export const VIBE_TAGS = [
  "casual_everyday",
  "date_night",
  "work_office",
  "festival",
  "weekend_chill",
  "formal_event",
  "travel",
] as const;

export const FABRIC_FIT_TAGS = [
  "oversized",
  "fitted",
  "flowy",
  "structured",
  "breathable",
  "sustainable",
  "vintage_inspired",
] as const;

/** Fabric preferences (materials) for the search filter panel. */
export const FABRIC_PREFERENCES = [
  "cotton",
  "linen",
  "silk",
  "wool",
  "cashmere",
  "denim",
  "leather",
  "no_synthetic",
] as const;

export type FabricPreference = (typeof FABRIC_PREFERENCES)[number];

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

/**
 * Filter groups shown on the search page. Selecting any of these drives the
 * "not sure what to search for?" suggestions — they're per-search, ephemeral,
 * and never saved to the profile.
 */
export const SEARCH_FILTER_GROUPS = [
  { label: "Aesthetic", tags: AESTHETIC_STYLES },
  { label: "Occasion", tags: VIBE_TAGS },
  { label: "Fabric & Fit", tags: FABRIC_FIT_TAGS },
  { label: "Materials", tags: FABRIC_PREFERENCES },
  { label: "Colors", tags: COLORS },
] as const;

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
