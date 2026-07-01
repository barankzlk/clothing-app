import type { Profile, SearchProduct } from "@/lib/types";
import { humanizeTag } from "@/lib/utils";

/** Default model for the stylist. Overridable via ANTHROPIC_MODEL env var. */
export const SEARCH_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const CURATED_SHOPS =
  "H&M (hm.com/de_de), Zara (zara.com/de), ASOS (asos.com/de, ships to Germany), " +
  "Oh Polly (ohpolly.com, ships to Germany), Club L London (clubllondon.com, ships to Germany), " +
  "Massimo Dutti (massimodutti.com/de), Mango (mango.com/de), Meshki (meshki.com, ships to Germany), " +
  "COS (cos.com/de_de), House of CB (houseofcb.com, ships to Germany), " +
  "Sézane (sezane.com/de-de), Toteme (toteme-studio.com, ships to Germany), " +
  "Loulou de Saison (louloudesaison.com, ships to Germany)";

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
    line("Budget", `max €${budgetMax} per item`),
    line("Occasion", occasion),
    line("Additional style notes", profile.style_notes),
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a personal fashion stylist and shopping assistant. You help find real, currently available clothing items online.

User profile:
${profileLines}

Your task: Search the web for real, currently in-stock products matching the user's request.
Only search these shops — do not suggest any other retailer: ${CURATED_SHOPS}.
For every shop, link its German-market storefront when one exists (a .de domain, or a "/de" or "de_de" locale path); if a shop has no dedicated German site, use its main international site and only include the item if that shop ships to Germany. Never link a page that doesn't ship to Germany.
Only return items that are currently in stock and within the budget of €${budgetMax}. Always include direct product page URLs. If an item doesn't have a clear size match for the user, skip it.

After researching, respond with ONLY a single JSON object (no markdown, no prose, no code fences) in exactly this shape:
{
  "results": [
    {
      "title": "Product name",
      "shop": "Shop name",
      "price": "€XX,XX",
      "url": "https://...",
      "image_url": "https://... or null",
      "reason": "One sentence on why this matches the user's style and measurements",
      "in_stock": true
    }
  ],
  "search_summary": "Brief one-line summary of what was found"
}

Return at least 15 results if you can find them (search across all the listed shops to reach this), and at most 18. Every URL must be a real, direct product page you found via web search — never invent URLs. If you find nothing suitable, return an empty "results" array and explain briefly in "search_summary".`;
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

/** Coerce parsed JSON into a clean, validated product list (max 18). */
export function normalizeProducts(parsed: unknown): {
  results: SearchProduct[];
  search_summary: string;
} {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const rawResults = Array.isArray(obj.results) ? obj.results : [];
  const summary =
    typeof obj.search_summary === "string" ? obj.search_summary : "";

  const results: SearchProduct[] = [];
  for (const item of rawResults) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    // A product is only useful with a title and a real http(s) URL.
    if (!title || !/^https?:\/\//i.test(url)) continue;

    results.push({
      title,
      shop: typeof r.shop === "string" ? r.shop.trim() : "Shop",
      price: typeof r.price === "string" ? r.price.trim() : "",
      url,
      image_url:
        typeof r.image_url === "string" && /^https?:\/\//i.test(r.image_url)
          ? r.image_url.trim()
          : null,
      reason: typeof r.reason === "string" ? r.reason.trim() : "",
      in_stock: r.in_stock === false ? false : true,
    });
    if (results.length >= 18) break;
  }

  return { results, search_summary: summary };
}
