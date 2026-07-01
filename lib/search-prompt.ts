import type { Profile, SearchProduct } from "@/lib/types";
import { humanizeTag } from "@/lib/utils";
import { clearbitLogo } from "@/lib/shops";

/** Default model for the stylist. Overridable via ANTHROPIC_MODEL env var. */
export const SEARCH_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

/** Curated shops the stylist is restricted to (all ship to Germany/EU). */
const CURATED_SHOPS =
  "H&M, Zara, ASOS, Oh Polly, Club L London, Massimo Dutti, Mango, Meshki, " +
  "COS, House of CB, Sézane, Toteme, Loulou de Saison";

/** Max products returned to the client — kept modest so the JSON response
 * reliably finishes within the token budget instead of being truncated. */
const MAX_RESULTS = 16;

function line(label: string, value: string | number | null | undefined) {
  return value === null || value === undefined || value === ""
    ? null
    : `- ${label}: ${value}`;
}

/** Build the stylist system prompt from the user's profile + search filters. */
export function buildSystemPrompt({
  profile,
  budgetMax,
  activeFilters,
}: {
  profile: Profile;
  budgetMax: number;
  activeFilters?: string[] | null;
}): string {
  const filters = (activeFilters ?? []).map(humanizeTag).join(", ");

  const profileLines = [
    line("Gender", profile.gender ? humanizeTag(profile.gender) : null),
    line("Height", profile.height_cm ? `${profile.height_cm}cm` : null),
    line("Weight", profile.weight_kg ? `${profile.weight_kg}kg` : null),
    line("Body shape", profile.body_shape ? humanizeTag(profile.body_shape) : null),
    line(
      "Sizes",
      [
        profile.clothing_size_top ? `Top ${profile.clothing_size_top}` : null,
        profile.clothing_size_bottom
          ? `Bottom ${profile.clothing_size_bottom}`
          : null,
        profile.shoe_size_eu ? `Shoes EU ${profile.shoe_size_eu}` : null,
      ]
        .filter(Boolean)
        .join(", ") || null,
    ),
    line("Style filters", filters || null),
    line("Budget", `max €${budgetMax} per item`),
    line("Additional style notes", profile.style_notes),
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a personal fashion stylist and shopping assistant. You help find real, currently available clothing items online that ship to Germany.

User profile:
${profileLines}

Your task: Search the web for real, in-stock products matching the user's request.
Focus on these shops: ${CURATED_SHOPS}.
Only return items within the budget of €${budgetMax}. Always include direct product page URLs. If an item doesn't have a clear size match for the user, skip it.

After researching, respond with ONLY a single JSON object (no markdown, no prose, no code fences) in exactly this shape:
{
  "results": [
    {
      "title": "Product name",
      "shop": "Shop name",
      "price": "€XX,XX",
      "url": "https://...",
      "image_url": "https://... or null",
      "reason": "One sentence on why this matches the user's style and measurements"
    }
  ],
  "summary": "Brief one-line summary of what was found"
}

Return at most ${MAX_RESULTS} results. Every URL must be a real, direct product page you found via web search — never invent URLs. If you find nothing suitable, return an empty "results" array and explain briefly in "summary".`;
}

/** Extract a JSON object from arbitrary model text. */
export function extractJson(text: string): unknown | null {
  const trimmed = text.trim();

  // Prefer a fenced ```json block if present.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates: string[] = [];
  if (fence?.[1]) candidates.push(fence[1].trim());

  // Fall back to the widest brace span.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));
  candidates.push(trimmed);

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Salvage individual product objects directly from raw text — used when a
 * response was truncated (max_tokens) and no single candidate parsed as
 * complete JSON, so a cut-off array still yields the products it did emit.
 */
function salvageProducts(text: string): unknown[] {
  const objects = text.match(/\{[^{}]*"url"\s*:\s*"https?:\/\/[^"]+"[^{}]*\}/gi);
  if (!objects) return [];
  const out: unknown[] = [];
  for (const o of objects) {
    try {
      out.push(JSON.parse(o));
    } catch {
      // skip malformed fragment
    }
  }
  return out;
}

/** Coerce parsed JSON (or salvaged text) into a clean, validated product list. */
export function normalizeProducts(
  parsed: unknown,
  rawText?: string,
): {
  results: SearchProduct[];
  summary: string;
} {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  let rawResults = Array.isArray(obj.results) ? obj.results : [];
  const summary = typeof obj.summary === "string" ? obj.summary : "";

  if (rawResults.length === 0 && rawText) {
    rawResults = salvageProducts(rawText);
  }

  const results: SearchProduct[] = [];
  const seen = new Set<string>();
  for (const item of rawResults) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    // A product is only useful with a title and a real http(s) URL.
    if (!title || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);

    const shop = typeof r.shop === "string" && r.shop.trim() ? r.shop.trim() : "Shop";
    results.push({
      title,
      shop,
      // Computed from our own shop -> domain map (never asked of the model,
      // so it costs no output tokens and never resolves to a wrong guess).
      shop_logo: clearbitLogo(shop),
      price: typeof r.price === "string" ? r.price.trim() : "",
      url,
      image_url:
        typeof r.image_url === "string" && /^https?:\/\//i.test(r.image_url)
          ? r.image_url.trim()
          : null,
      reason: typeof r.reason === "string" ? r.reason.trim() : "",
    });
    if (results.length >= MAX_RESULTS) break;
  }

  return { results, summary };
}
