import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getJson } from "serpapi";

import { createClient } from "@/lib/supabase/server";
import { getShopsForGender, type Shop } from "@/lib/shops";
import type { SearchProduct } from "@/lib/types";
import {
  SEARCH_QUERY_MODEL,
  SEARCH_QUERY_SYSTEM_PROMPT,
  buildSearchQueryUserMessage,
  parseSearchTerm,
} from "@/lib/search-query-prompt";

export const dynamic = "force-dynamic";

const RESULTS_PER_SHOP = 2;

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
};

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

  // Step 2 — gender-based shop list.
  const shops = getShopsForGender(gender);
  const genderWord = gender === "male" ? "herren" : "damen";

  // Step 3 — one Google Shopping search per shop, in parallel.
  const settled = await Promise.allSettled(
    shops.map(async (shop) => {
      const data = await getJson({
        engine: "google_shopping",
        api_key: process.env.SERPAPI_KEY,
        q: `${baseTerm} ${shop.name} ${genderWord}`,
        gl: "de",
        hl: "de",
        num: 5,
        currency: "EUR",
      });
      return { shop, data };
    }),
  );

  // Step 4 — parse, budget-filter, dedupe by URL, shuffle.
  const results: SearchProduct[] = [];
  const seenUrls = new Set<string>();
  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") {
      console.error("SerpAPI shop search failed:", outcome.reason);
      continue;
    }
    const { shop, data } = outcome.value;
    const shoppingResults: SerpShoppingResult[] = Array.isArray(data.shopping_results)
      ? data.shopping_results
      : [];

    let taken = 0;
    for (const result of shoppingResults) {
      if (taken >= RESULTS_PER_SHOP) break;
      const product = toProduct(result, shop);
      if (!product || seenUrls.has(product.url)) continue;
      const price = extractPriceValue(result);
      if (budgetMax != null && price != null && price > budgetMax) continue;
      seenUrls.add(product.url);
      results.push(product);
      taken++;
    }
  }

  const shuffled = shuffle(results);

  return NextResponse.json({
    results: shuffled,
    summary: `${query} — ${shuffled.length} Produkte gefunden`,
    total: shuffled.length,
  });
}
