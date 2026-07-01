/**
 * Hardcoded domain constants for YAZ. These exact values are used across
 * onboarding, the profile editor, the search filters, and the search logic.
 * Keep them in sync with the database CHECK constraints in
 * supabase/migrations. Display labels live in lib/i18n/translations.ts.
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

/** Fit descriptors and fabric materials, combined into one filter category. */
export const FABRIC_FIT_TAGS = [
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
] as const;

/** The three filter groups shown on the search page's Filter panel. */
export const FILTER_GROUPS = [
  { label: "Aesthetic", tags: AESTHETIC_STYLES },
  { label: "Occasion", tags: VIBE_TAGS },
  { label: "Fabric & Fit", tags: FABRIC_FIT_TAGS },
] as const;

/** Flat list of every valid search filter tag. */
export const ALL_FILTER_TAGS = [
  ...AESTHETIC_STYLES,
  ...VIBE_TAGS,
  ...FABRIC_FIT_TAGS,
] as const;

export type FilterTag = (typeof ALL_FILTER_TAGS)[number];

export const GENDERS = ["female", "male", "non-binary", "prefer_not_to_say"] as const;

export type Gender = (typeof GENDERS)[number];

/** Body shapes with a simple emoji glyph used by the visual selector. */
export const BODY_SHAPES = [
  { value: "hourglass", glyph: "⧗" },
  { value: "rectangle", glyph: "▭" },
  { value: "pear", glyph: "🍐" },
  { value: "apple", glyph: "🍎" },
  { value: "inverted_triangle", glyph: "▽" },
] as const;

export type BodyShape = (typeof BODY_SHAPES)[number]["value"];

export const TOP_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

/** EU bottom sizes. */
export const BOTTOM_SIZES = ["32", "34", "36", "38", "40", "42", "44", "46"] as const;

export const BUDGET_MIN = 10;
export const BUDGET_MAX = 500;
export const BUDGET_STEP = 10;
export const BUDGET_DEFAULT = 150;
