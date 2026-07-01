import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getJson } from "serpapi";

import { createClient } from "@/lib/supabase/server";
import { getShopsForGender, splitShops, findMatchingShop, type Shop } from "@/lib/shops";
import type { SearchProduct } from "@/lib/types";
import {
  SEARCH_QUERY_MODEL,
  SEARCH_QUERY_SYSTEM_PROMPT,
  buildSearchQueryUserMessage,
  parseSearchTerm,
} from "@/lib/search-query-prompt";

export const dynamic = "force-dynamic";

const RESULTS_PER_SHOP = 2;
const GENERAL_SEARCH_NUM = 30;

type SerpShoppingResult = {
  title?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  link?: string;
  product_link?: string;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
  product_id?: string;
};

type SearchOutcome =
  | { kind: "general"; data: Record<string, unknown> }
  | { kind: "niche"; shop: Shop; data: Record<string, unknown> };

function toProduct(result: SerpShoppingResult, shop: Shop): SearchProduct | null {
  const url = result.link || result.product_link;
  if (!url || !result.thumbnail || !result.title) return null;
  return {
    title: result.title,
    shop: result.source || shop.name,
    price: result.price || "",
    url,
    image_url: result.thumbnail,
    rating: typeof result.rating === "number" ? result.rating : null,
    reviews: typeof result.reviews === "number" ? result.reviews : null,
    shop_logo: `https://logo.clearbit.com/${shop.domain}`,
    product_id: result.product_id || null,
  };
}

/** Best-effort EUR amount for budget filtering — prefers SerpAPI's own parse. */
function extractPriceValue(result: SerpShoppingResult): number | null {
  if (typeof result.extracted_price === "number") return result.extracted_price;
  if (!result.price) return null;
  const cleaned = result.price
    .replace(/[^0-9.,]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * The `serpapi` package rejects with the raw response body (a JSON string)
 * on any non-200 response, rather than an Error — so a bad key or an
 * exhausted plan quota shows up here as a rejected string, not `.message`.
 */
function describeSerpError(reason: unknown): string {
  if (typeof reason === "string") {
    try {
      const parsed = JSON.parse(reason);
      if (parsed && typeof parsed.error === "string") return parsed.error;
    } catch {
      // not JSON — fall through to the raw string
    }
    return reason;
  }
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json(
      { error: "Search is not configured." },
      { status: 500 },
    );
  }

  let body: {
    query?: unknown;
    gender?: unknown;
    filters?: unknown;
    budgetMax?: unknown;
    shopLimit?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }
  const gender = typeof body.gender === "string" ? body.gender : null;
  const filters = Array.isArray(body.filters)
    ? body.filters.filter((f): f is string => typeof f === "string")
    : [];
  const budgetMax = typeof body.budgetMax === "number" ? body.budgetMax : null;

  // Step 1 — one cheap Haiku call to turn the free-text query into a tight
  // German search term. Degrades to the raw query if Anthropic is unavailable.
  let baseTerm = query;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: SEARCH_QUERY_MODEL,
        max_tokens: 300,
        system: SEARCH_QUERY_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildSearchQueryUserMessage({ query, gender, filters }),
          },
        ],
      });
      let text = "";
      for (const block of message.content) {
        if (block.type === "text") text += block.text;
      }
      baseTerm = parseSearchTerm(text, query);
    } catch (err) {
      console.error(
        "Search query optimizer error:",
        err instanceof Anthropic.APIError
          ? `${err.status} ${err.message}`
          : err instanceof Error
            ? err.message
            : "Unknown error",
      );
    }
  }

  // Step 2 — gender-based shop list, capped by the user's shop-limit slider,
  // then split into the big/mainstream shops (covered by one general search)
  // and the niche shops (still need a targeted query each, since they rarely
  // surface in a general Google Shopping search).
  const allShops = getShopsForGender(gender);
  const shopLimit =
    typeof body.shopLimit === "number" && Number.isFinite(body.shopLimit)
      ? Math.max(1, Math.min(Math.floor(body.shopLimit), allShops.length))
      : allShops.length;
  const shops = allShops.slice(0, shopLimit);
  const { big: bigShops, niche: nicheShops } = splitShops(shops);

  const genderWord = gender === "male" ? "herren" : "damen";

  // Step 3 — one general search covers every big shop at once; one targeted
  // search per niche shop. All in parallel.
  const searchPromises: Promise<SearchOutcome>[] = [];
  if (bigShops.length > 0) {
    searchPromises.push(
      getJson({
        engine: "google_shopping",
        api_key: process.env.SERPAPI_KEY,
        q: `${baseTerm} ${genderWord}`,
        gl: "de",
        hl: "de",
        num: GENERAL_SEARCH_NUM,
        currency: "EUR",
      }).then((data) => ({ kind: "general" as const, data })),
    );
  }
  for (const shop of nicheShops) {
    searchPromises.push(
      getJson({
        engine: "google_shopping",
        api_key: process.env.SERPAPI_KEY,
        q: `${baseTerm} ${shop.name} ${genderWord}`,
        gl: "de",
        hl: "de",
        num: 5,
        currency: "EUR",
      }).then((data) => ({ kind: "niche" as const, shop, data })),
    );
  }

  const settled = await Promise.allSettled(searchPromises);

  // Step 4 — parse, verify each result actually belongs to one of our
  // shops, budget-filter, dedupe by URL, cap per shop, shuffle.
  const results: SearchProduct[] = [];
  const seenUrls = new Set<string>();
  const takenPerShop = new Map<string, number>();
  const shopErrors: string[] = [];

  function tryAdd(result: SerpShoppingResult, shop: Shop) {
    if ((takenPerShop.get(shop.name) ?? 0) >= RESULTS_PER_SHOP) return;
    const product = toProduct(result, shop);
    if (!product || seenUrls.has(product.url)) return;
    const price = extractPriceValue(result);
    if (budgetMax != null && price != null && price > budgetMax) return;
    seenUrls.add(product.url);
    results.push(product);
    takenPerShop.set(shop.name, (takenPerShop.get(shop.name) ?? 0) + 1);
  }

  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") {
      shopErrors.push(describeSerpError(outcome.reason));
      continue;
    }
    const outcomeValue = outcome.value;
    if (typeof outcomeValue.data.error === "string") {
      shopErrors.push(outcomeValue.data.error);
      continue;
    }
    const shoppingResults: SerpShoppingResult[] = Array.isArray(
      outcomeValue.data.shopping_results,
    )
      ? (outcomeValue.data.shopping_results as SerpShoppingResult[])
      : [];

    if (outcomeValue.kind === "general") {
      // Only keep results that actually match one of our known big shops —
      // discard anything from a shop we didn't ask for.
      for (const result of shoppingResults) {
        const matched = findMatchingShop(result, bigShops);
        if (matched) tryAdd(result, matched);
      }
    } else {
      // Verify this niche result really is the shop we searched for.
      for (const result of shoppingResults) {
        const matched = findMatchingShop(result, [outcomeValue.shop]);
        if (matched) tryAdd(result, outcomeValue.shop);
      }
    }
  }

  // Every search errored (bad key, exhausted quota, SerpAPI outage) —
  // surface a real error instead of silently reporting zero results.
  const totalSearches = searchPromises.length;
  if (results.length === 0 && totalSearches > 0 && shopErrors.length === totalSearches) {
    console.error("All SerpAPI searches failed:", shopErrors[0]);
    return NextResponse.json(
      { error: "Search provider error. Check the SerpAPI key and plan quota." },
      { status: 502 },
    );
  }
  if (shopErrors.length > 0) {
    console.error(
      `${shopErrors.length}/${totalSearches} SerpAPI searches failed:`,
      shopErrors[0],
    );
  }

  const shuffled = shuffle(results);

  return NextResponse.json({
    results: shuffled,
    summary: `${query} — ${shuffled.length} Produkte gefunden`,
    total: shuffled.length,
  });
}
