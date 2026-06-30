import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import { humanizeTag } from "@/lib/utils";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/style-tags";
import type { SearchProduct } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 2000;
const MAX_RESULTS = 24;

const SYSTEM_PROMPT = `You are a fashion shopping assistant. The user is searching for clothing. Search the web and return ONLY real products from these specific shops: H&M, Zara, ASOS, Oh Polly, Club L London, Massimo Dutti, Mango, Meshki, COS, House of CB, Sézane, Toteme, Loulou de Saison.

Rules:
- ALWAYS return at least 20 products
- Only return products that currently exist and are in stock
- Use the exact product URL from the search result - never guess or construct URLs
- All products must ship to Germany/EU
- Return ONLY valid JSON, no text before or after

JSON format:
{
  "results": [
    {
      "title": "product name",
      "shop": "shop name",
      "shop_logo": "https://logo.clearbit.com/shopname.com",
      "price": "€XX",
      "url": "exact product URL",
      "image_url": "product image URL or null",
      "reason": "max 8 words why this fits"
    }
  ],
  "summary": "one line summary"
}`;

/** Clamp a reason to at most 8 words. */
function trimReason(reason: string): string {
  const words = reason.trim().split(/\s+/);
  return words.length <= 8 ? reason.trim() : words.slice(0, 8).join(" ") + "…";
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
    shop_logo:
      typeof r.shop_logo === "string" && /^https?:\/\//i.test(r.shop_logo)
        ? r.shop_logo.trim()
        : null,
  };
}

/**
 * Parse products from the model text. Full JSON parse first, then salvage
 * individual product objects so a response truncated by max_tokens still
 * yields the complete products it emitted.
 */
function parseProducts(text: string): SearchProduct[] {
  const out: SearchProduct[] = [];
  const seen = new Set<string>();
  const push = (r: Record<string, unknown>) => {
    const p = toProduct(r);
    if (p && !seen.has(p.url)) {
      seen.add(p.url);
      out.push(p);
    }
  };

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

export async function POST(request: Request) {
  // Auth.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Search is not configured. Missing ANTHROPIC_API_KEY." },
      { status: 500 },
    );
  }

  // Body.
  let body: { query?: unknown; budgetMax?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json(
      { error: "Please enter something to search for." },
      { status: 400 },
    );
  }

  // Profile (for style tags + budget).
  const { data: profile } = await supabase
    .from("profiles")
    .select("style_tags, budget_max_eur")
    .eq("id", user.id)
    .maybeSingle();

  const requested = Number(body.budgetMax);
  const fallback = profile?.budget_max_eur ?? 150;
  const budget = Math.min(
    BUDGET_MAX,
    Math.max(BUDGET_MIN, Number.isFinite(requested) ? requested : fallback),
  );
  const styles =
    (profile?.style_tags ?? []).map(humanizeTag).join(", ") || "no specific style";

  const userMessage =
    `Find ${query} for someone with these preferences: ${styles}. Budget: €${budget}. Must ship to Germany.\n\n` +
    `Run these 2 web searches:\n` +
    `1. "${query} site:asos.com OR site:hm.com OR site:zara.com OR site:mango.com OR site:cos.com"\n` +
    `2. "${query} site:ohpolly.com OR site:meshki.com.au OR site:massimodutti.com OR site:sezane.com"`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userMessage },
    ];
    let text = "";
    let stopReason: string | null = null;

    // Single call; resume across web-search pause_turn boundaries.
    for (let hop = 0; hop < 3; hop++) {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
        messages,
      });
      for (const block of message.content) {
        if (block.type === "text") text += block.text;
      }
      stopReason = message.stop_reason;
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      break;
    }

    const results = parseProducts(text);
    if (results.length === 0) {
      console.error(
        `[search] 0 products. stop_reason=${stopReason} textLen=${text.length} ` +
          `preview=${JSON.stringify(text.slice(0, 300))}`,
      );
    }
    return NextResponse.json({ results });
  } catch (err) {
    const detail =
      err instanceof Anthropic.APIError
        ? `${err.status} ${err.message}`
        : err instanceof Error
          ? err.message
          : "Unknown error";
    console.error("Anthropic search error:", detail);
    return NextResponse.json(
      { error: "The search couldn't complete. Please try again." },
      { status: 502 },
    );
  }
}
