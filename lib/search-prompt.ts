import type { Profile, SearchProduct } from "@/lib/types";
import { humanizeTag } from "@/lib/utils";

/**
 * Default model. Haiku 4.5 keeps each search cheap (~1/3 the token cost of
 * Sonnet). Overridable via ANTHROPIC_MODEL.
 */
export const SEARCH_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

/** Maximum products returned to the client. */
export const MAX_RESULTS = 24;

/**
 * Curated whitelist of well-known shops. Web search is hard-restricted to these
 * domains (via the tool's allowed_domains), so results never come from random
 * shops. The model picks which of these fit the product type + budget.
 */
export const CURATED_SHOPS = [
  { name: "Zalando", domain: "zalando.de" },
  { name: "About You", domain: "aboutyou.de" },
  { name: "ASOS", domain: "asos.com" },
  { name: "Otto", domain: "otto.de" },
  { name: "H&M", domain: "hm.com" },
  { name: "Zara", domain: "zara.com" },
  { name: "Mango", domain: "mango.com" },
  { name: "Breuninger", domain: "breuninger.com" },
  { name: "Massimo Dutti", domain: "massimodutti.com" },
  { name: "Meshki", domain: "meshki.com" },
  { name: "NA-KD", domain: "na-kd.com" },
] as const;

/** Domains passed to the web_search tool's allowed_domains filter. */
export const ALLOWED_DOMAINS = CURATED_SHOPS.map((s) => s.domain);

const SHOP_NAMES = CURATED_SHOPS.map((s) => s.name).join(", ");

/**
 * Short, result-first system prompt (well under 200 words). The goal is to
 * always return real products that appear in the web-search results — no
 * URL second-guessing, no empty lists.
 */
export function buildSystemPrompt({
  profile,
  budgetMax,
  occasionFilter,
}: {
  profile: Profile;
  budgetMax: number;
  occasionFilter?: string | null;
}): string {
  const styles = (profile.style_tags ?? []).slice(0, 4).map(humanizeTag).join(", ");
  const sizes = [
    profile.clothing_size_top ? `top ${profile.clothing_size_top}` : null,
    profile.clothing_size_bottom ? `bottom ${profile.clothing_size_bottom}` : null,
    profile.shoe_size_eu ? `shoe EU ${profile.shoe_size_eu}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const occasion =
    occasionFilter && occasionFilter !== "any" ? `, occasion ${humanizeTag(occasionFilter)}` : "";

  const shopper =
    `Shopper: ${profile.gender ? humanizeTag(profile.gender) : "any"}` +
    `${sizes ? `, ${sizes}` : ""}${styles ? `, style ${styles}` : ""}` +
    `, budget up to €${budgetMax}/item${occasion}.`;

  return `You are a fashion search assistant for a shopper in Germany. Search the web for the requested item available to buy in Germany/EU and return the real products that appear in the search results.

${shopper}

Rules:
- ONLY use these well-known shops: ${SHOP_NAMES}. Never return products from any other shop. Pick the ones that best fit the product type and budget — premium pieces from Breuninger / Massimo Dutti; everyday basics from H&M / Zalando / Otto / About You; trend & going-out from Meshki / NA-KD / ASOS; Zara / Mango for the middle.
- Return every relevant product the search results show, with its actual URL, title, price in EUR, and shop name. If a product appears in search results, it exists — return it. Do NOT second-guess or verify URLs; just return what you found.
- Prefer items within budget, but always return at least 20 products. Never return an empty list — broaden the search if needed.
- Keep "reason" to at most 10 words.

Respond with ONLY this JSON, nothing else (no markdown, no commentary):
{"results":[{"title":"...","shop":"...","price":"€XX,XX","url":"https://...","image_url":"https://... or null","reason":"max 10 words"}]}`;
}

/** Clamp a reason string to at most 10 words. */
function trimReason(reason: string): string {
  const words = reason.trim().split(/\s+/);
  if (words.length <= 10) return reason.trim();
  return words.slice(0, 10).join(" ") + "…";
}

function toProduct(r: Record<string, unknown>): SearchProduct | null {
  const url = typeof r.url === "string" ? r.url.trim() : "";
  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!title || !/^https?:\/\//i.test(url)) return null;
  return {
    title,
    shop: typeof r.shop === "string" ? r.shop.trim() : "Shop",
    price: typeof r.price === "string" ? r.price.trim() : "",
    url,
    image_url:
      typeof r.image_url === "string" && /^https?:\/\//i.test(r.image_url)
        ? r.image_url.trim()
        : null,
    reason: typeof r.reason === "string" ? trimReason(r.reason) : "",
  };
}

/**
 * Parse the model's response into products. Tries a full JSON parse first, then
 * falls back to salvaging individual product objects from the text — so a
 * response truncated by max_tokens still yields the complete products it did
 * emit instead of zero.
 */
export function parseSearchResults(text: string): SearchProduct[] {
  const out: SearchProduct[] = [];
  const seen = new Set<string>();

  const push = (r: Record<string, unknown>) => {
    const p = toProduct(r);
    if (p && !seen.has(p.url)) {
      seen.add(p.url);
      out.push(p);
    }
  };

  // 1. Full JSON parse (strip a ```json fence if present).
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const candidates = [
    fence?.[1]?.trim(),
    first !== -1 && last > first ? text.slice(first, last + 1) : null,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try {
      const obj = JSON.parse(c) as { results?: unknown };
      const arr = Array.isArray(obj.results) ? obj.results : [];
      for (const item of arr) {
        if (item && typeof item === "object") push(item as Record<string, unknown>);
      }
      if (out.length > 0) break;
    } catch {
      // fall through to salvage
    }
  }

  // 2. Salvage: extract flat product objects even from a truncated array.
  if (out.length === 0) {
    const objects = text.match(/\{[^{}]*"url"\s*:\s*"https?:\/\/[^"]+"[^{}]*\}/gi);
    if (objects) {
      for (const o of objects) {
        try {
          push(JSON.parse(o) as Record<string, unknown>);
        } catch {
          // skip malformed fragment
        }
      }
    }
  }

  return out.slice(0, MAX_RESULTS);
}
