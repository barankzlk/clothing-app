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

/** All style tags, in display order, grouped by section. */
export const STYLE_TAG_GROUPS = [
  { label: "Aesthetic", tags: AESTHETIC_STYLES },
  { label: "Vibe", tags: VIBE_TAGS },
  { label: "Fabric & Fit", tags: FABRIC_FIT_TAGS },
] as const;

/** Flat list of every valid style tag. */
export const ALL_STYLE_TAGS = [
  ...AESTHETIC_STYLES,
  ...VIBE_TAGS,
  ...FABRIC_FIT_TAGS,
] as const;

export type StyleTag = (typeof ALL_STYLE_TAGS)[number];

/** Fabric preferences for the onboarding/profile multi-select. */
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

/** Occasion filter options used in the search sidebar. */
export const OCCASION_OPTIONS = [
  { value: "any", label: "Any occasion" },
  { value: "casual_everyday", label: "Casual / Everyday" },
  { value: "date_night", label: "Date night" },
  { value: "work_office", label: "Work / Office" },
  { value: "festival", label: "Festival" },
  { value: "weekend_chill", label: "Weekend chill" },
  { value: "formal_event", label: "Formal event" },
  { value: "travel", label: "Travel" },
] as const;

export const BUDGET_MIN = 10;
export const BUDGET_MAX = 500;
export const BUDGET_STEP = 10;
export const BUDGET_DEFAULT = 150;
