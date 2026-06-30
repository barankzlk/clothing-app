import type { Profile, SearchProduct } from "@/lib/types";
import { humanizeTag } from "@/lib/utils";

/**
 * Default model. Haiku 4.5 keeps each search cheap (~1/3 the token cost of
 * Sonnet). Overridable via ANTHROPIC_MODEL.
 */
export const SEARCH_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

/** Maximum products returned to the client. */
export const MAX_RESULTS = 16;

/** Below this many verified products, the route runs one extra search round. */
export const MIN_VERIFIED = 6;

/** Well-known popular shops the result set must always include some of. */
const POPULAR_SHOPS =
  "Zalando, ASOS, About You, H&M, Zara, Mango, Uniqlo, COS, Arket, Weekday, " +
  "Breuninger, Otto, Peek & Cloppenburg";

function line(label: string, value: string | number | null | undefined) {
  return value === null || value === undefined || value === ""
    ? null
    : `- ${label}: ${value}`;
}

/** Build the stylist system prompt from the user's profile + search context. */
export function buildSystemPrompt({
  profile,
  budgetMax,
  occasionFilter,
}: {
  profile: Profile;
  budgetMax: number;
  occasionFilter?: string | null;
}): string {
  const styles = (profile.style_tags ?? []).map(humanizeTag).join(", ");
  const fabrics = (profile.fabric_preferences ?? []).map(humanizeTag).join(", ");
  const occasion =
    occasionFilter && occasionFilter !== "any" ? humanizeTag(occasionFilter) : null;

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
    line("Style", styles || null),
    line("Fabric preferences", fabrics || null),
    line("Occasion", occasion),
    line("Notes", profile.style_notes),
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a personal fashion stylist for a user in Germany. Find real, in-stock clothing that ships to Germany / the EU.

User:
${profileLines}

Rules:
- Germany/EU only: prefer .de / German storefronts and pan-EU shops that ship to Germany; exclude US-only items. Prices in EUR.
- Product-first search queries with German + availability terms, e.g. "<product> <style> kaufen Deutschland .de auf Lager". Always add "currently available" / "auf Lager" so unavailable items are filtered out.
- BALANCED SHOP MIX (required, every search): include at least 3-4 items from well-known popular shops (${POPULAR_SHOPS}) AND at least 3-4 items from smaller, niche, or independent shops. Never return only one type.
- Budget: at most €${budgetMax} per item.
- REAL PRODUCTS ONLY: only include an item you have DIRECTLY found in search results, with its title, price, and a real, working direct product-page URL. Never invent or guess URLs. If you cannot find a direct link to the product page, skip it entirely. Do not include products based on general brand knowledge. Skip anything marked out of stock / sold out / nicht verfügbar / ausverkauft.
- Skip items with no clear size match for the user.

Respond with ONLY this JSON (no markdown, no prose, no code fences):
{"results":[{"title":"...","shop":"...","price":"€XX,XX","url":"https://...","image_url":"https://... or null","reason":"max 15 words on why it suits them","in_stock":true}],"search_summary":"one line"}

Return up to ${MAX_RESULTS} items, from as many different shops as possible. If you find nothing suitable, return an empty "results" array.`;
}

/** Extract a JSON object from arbitrary model text. */
export function extractJson(text: string): unknown | null {
  const trimmed = text.trim();

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates: string[] = [];
  if (fence?.[1]) candidates.push(fence[1].trim());

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

/** Clamp a reason string to at most 15 words. */
function trimReason(reason: string): string {
  const words = reason.trim().split(/\s+/);
  if (words.length <= 15) return reason.trim();
  return words.slice(0, 15).join(" ") + "…";
}

/** Coerce parsed JSON into a clean, validated product list (max MAX_RESULTS). */
export function normalizeProducts(parsed: unknown): {
  results: SearchProduct[];
  search_summary: string;
} {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const rawResults = Array.isArray(obj.results) ? obj.results : [];
  const summary =
    typeof obj.search_summary === "string" ? obj.search_summary : "";

  const results: SearchProduct[] = [];
  const seen = new Set<string>();
  for (const item of rawResults) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);

    results.push({
      title,
      shop: typeof r.shop === "string" ? r.shop.trim() : "Shop",
      price: typeof r.price === "string" ? r.price.trim() : "",
      url,
      image_url:
        typeof r.image_url === "string" && /^https?:\/\//i.test(r.image_url)
          ? r.image_url.trim()
          : null,
      reason: typeof r.reason === "string" ? trimReason(r.reason) : "",
      in_stock: r.in_stock === false ? false : true,
      verified: false,
    });
    if (results.length >= MAX_RESULTS) break;
  }

  return { results, search_summary: summary };
}
