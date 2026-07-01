import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/style-tags";
import { clearbitLogo } from "@/lib/shops";
import { humanizeTag } from "@/lib/utils";
import type { SearchProduct } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";
// 20 products at ~7 fields each (incl. two real URLs) runs ~2000+ tokens on
// its own, before any web-search overhead — 1500 truncated the JSON almost
// every time. This ceiling only caps spend on a response that would otherwise
// run away; billing is per token actually generated, not the ceiling, so this
// isn't a bigger bill on a normal search — it's the difference between a
// truncated dead end and a complete one.
const MAX_TOKENS = 4000;
const MAX_RESULTS = 24;

const SYSTEM_PROMPT =
  "You are a fashion shopping assistant. Search the web and return ONLY real in-stock products from these shops that ship to Germany: H&M, Zara, ASOS, Oh Polly, Club L London, Massimo Dutti, Mango, Meshki, COS, House of CB, Sézane, Toteme, Loulou de Saison. ALWAYS return minimum 20 products. Never invent URLs — only use exact URLs found in search results. Return ONLY JSON: { results: [{ title, shop, shop_logo, price, url, image_url, reason }], summary }";

function toProduct(r: Record<string, unknown>): SearchProduct | null {
  const url = typeof r.url === "string" ? r.url.trim() : "";
  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!title || !/^https?:\/\//i.test(url)) return null;
  const shop = typeof r.shop === "string" && r.shop.trim() ? r.shop.trim() : "Shop";
  return {
    title,
    shop,
    // Computed deterministically from our own shop -> domain map rather than
    // trusting the model's guess, so the logo fallback always resolves.
    shop_logo: clearbitLogo(shop),
    price: typeof r.price === "string" ? r.price.trim() : "",
    url,
    image_url:
      typeof r.image_url === "string" && /^https?:\/\//i.test(r.image_url)
        ? r.image_url.trim()
        : null,
    reason: typeof r.reason === "string" ? r.reason.trim() : "",
  };
}

/**
 * Parse products (and the summary) from the model's text. Tries a full JSON
 * parse first, then salvages individual product objects so a response
 * truncated by max_tokens still yields the complete products it emitted.
 */
function parseSearchResponse(text: string): { results: SearchProduct[]; summary: string } {
  const out: SearchProduct[] = [];
  const seen = new Set<string>();
  let summary = "";

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
      const obj = JSON.parse(c) as { results?: unknown; summary?: unknown };
      const arr = Array.isArray(obj.results) ? obj.results : [];
      for (const item of arr) {
        if (item && typeof item === "object") push(item as Record<string, unknown>);
      }
      if (typeof obj.summary === "string") summary = obj.summary;
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

  return { results: out.slice(0, MAX_RESULTS), summary };
}

export async function POST(request: Request) {
  // 1. Require an authenticated user.
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

  // 2. Parse the request body. `userProfile` is accepted per the API contract
  // but not trusted for sizing — sizes/budget are always re-read from the
  // database below so a tampered client payload can't skew results.
  let body: {
    query?: unknown;
    userProfile?: unknown;
    budgetMax?: unknown;
    activeFilters?: unknown;
  };
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
  const activeFilters = Array.isArray(body.activeFilters)
    ? body.activeFilters.filter((f): f is string => typeof f === "string")
    : [];

  // 3. Server-authoritative profile lookup for sizes + budget.
  const { data: profile } = await supabase
    .from("profiles")
    .select("clothing_size_top, clothing_size_bottom, shoe_size_eu, budget_max_eur")
    .eq("id", user.id)
    .maybeSingle();

  const requested = Number(body.budgetMax);
  const fallback = profile?.budget_max_eur ?? 150;
  const budgetMax = Math.min(
    BUDGET_MAX,
    Math.max(BUDGET_MIN, Number.isFinite(requested) ? requested : fallback),
  );

  const sizes =
    [
      profile?.clothing_size_top ? `top ${profile.clothing_size_top}` : null,
      profile?.clothing_size_bottom ? `bottom ${profile.clothing_size_bottom}` : null,
      profile?.shoe_size_eu ? `shoe EU ${profile.shoe_size_eu}` : null,
    ]
      .filter(Boolean)
      .join(", ") || "not specified";

  const filters =
    activeFilters.length > 0 ? activeFilters.map(humanizeTag).join(", ") : "none";

  const userMessage =
    `Find ${query}, size ${sizes}, budget €${budgetMax}, filters: ${filters}. Germany shipping required.\n\n` +
    `Run these 2 web searches:\n` +
    `1. "${query} site:asos.com OR site:hm.com OR site:zara.com OR site:mango.com OR site:cos.com"\n` +
    `2. "${query} site:ohpolly.com OR site:meshki.com OR site:massimodutti.com OR site:sezane.com OR site:clubllondon.com OR site:houseofcb.com"\n\n` +
    `Output compact JSON with no extra whitespace or line breaks so more products fit in the response.`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
    let text = "";
    let stopReason: string | null = null;

    // Resume across web-search `pause_turn` boundaries (up to 3 hops).
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

    const { results, summary } = parseSearchResponse(text);
    if (results.length === 0) {
      // Surfaces in Vercel function logs to diagnose an empty result set.
      console.error(
        `[search] 0 products. stop_reason=${stopReason} textLen=${text.length} ` +
          `preview=${JSON.stringify(text.slice(0, 300))}`,
      );
    }
    return NextResponse.json({ results, summary });
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
