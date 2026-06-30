import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import {
  MAX_RESULTS,
  MIN_VERIFIED,
  SEARCH_MODEL,
  buildSystemPrompt,
  extractJson,
  normalizeProducts,
} from "@/lib/search-prompt";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/style-tags";
import type { SearchProduct } from "@/lib/types";

// Web search + verification can take a while; give it room (Vercel Hobby caps
// this at 60s, Pro at 300s).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Probe a product URL. "valid" = reachable 200; "dead" = 404/410 or a redirect
 * to the shop homepage (a classic sign of a hallucinated/expired link);
 * "unknown" = couldn't determine (timeout, bot-block, 5xx) — kept but unbadged.
 */
async function checkUrl(url: string): Promise<"valid" | "dead" | "unknown"> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "dead";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const headers = { "User-Agent": BROWSER_UA, Accept: "*/*" };
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers,
    });
    // Some shops reject HEAD — retry once with GET.
    if ([403, 405, 501].includes(res.status)) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers,
      });
    }

    if (res.status === 404 || res.status === 410) return "dead";

    // Redirected away from a real product path back to the homepage root.
    try {
      const finalPath = new URL(res.url).pathname;
      const hadPath = parsed.pathname && parsed.pathname !== "/";
      if (res.redirected && hadPath && (finalPath === "/" || finalPath === ""))
        return "dead";
    } catch {
      // ignore
    }

    if (res.status >= 200 && res.status < 300) return "valid";
    return "unknown";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timeout);
  }
}

/** Verify a batch of products in parallel; drop dead links, flag verified ones. */
async function verifyProducts(
  products: SearchProduct[],
): Promise<SearchProduct[]> {
  const checked = await Promise.all(
    products.map(async (p) => {
      const status = await checkUrl(p.url);
      if (status === "dead") return null;
      return { ...p, verified: status === "valid" };
    }),
  );
  return checked.filter((p): p is SearchProduct => p !== null);
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

  // 2. Parse the request body.
  let body: { query?: unknown; budgetMax?: unknown; occasionFilter?: unknown };
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
  const occasionFilter =
    typeof body.occasionFilter === "string" ? body.occasionFilter : null;

  // 3. Load the caller's profile from the database.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json(
      { error: "Complete your profile before searching." },
      { status: 400 },
    );
  }

  const requested = Number(body.budgetMax);
  const fallback = profile.budget_max_eur ?? 150;
  const budgetMax = Math.min(
    BUDGET_MAX,
    Math.max(BUDGET_MIN, Number.isFinite(requested) ? requested : fallback),
  );

  const systemPrompt = buildSystemPrompt({ profile, budgetMax, occasionFilter });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // One stylist round = up to 3 web searches, then parse JSON.
  async function runStylist(
    excludeUrls: string[] = [],
  ): Promise<{ results: SearchProduct[]; summary: string }> {
    const exclude =
      excludeUrls.length > 0
        ? ` Do NOT repeat any of these URLs you already returned: ${excludeUrls
            .slice(0, 16)
            .join(", ")}.`
        : "";
    const userText =
      `Find clothing available to buy and ship in Germany for: "${query}".\n` +
      `Run 2-3 different web searches with product-first, Germany-oriented queries ` +
      `(include "kaufen Deutschland", ".de", "auf Lager", "currently available"): a broad one, ` +
      `a style/material one, and a price/occasion-filtered one. Return a BALANCED mix of ` +
      `well-known popular shops AND smaller/niche shops, every item within €${budgetMax}, ` +
      `only real products with working direct URLs.${exclude}\n` +
      `Then return only the JSON object described in your instructions.`;

    const message = await anthropic.messages.create({
      model: SEARCH_MODEL,
      max_tokens: 4096,
      // Cache the (stable) system prompt so repeat searches reuse it.
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        },
      ],
      messages: [{ role: "user", content: userText }],
    });

    let text = "";
    for (const block of message.content) {
      if (block.type === "text") text += block.text;
    }
    const parsed = extractJson(text);
    if (parsed === null) return { results: [], summary: "" };
    const { results, search_summary } = normalizeProducts(parsed);
    return { results, summary: search_summary };
  }

  try {
    // 4. First round + verification.
    const first = await runStylist();
    let products = await verifyProducts(first.results);
    let summary = first.summary;

    // 5. If too few survived verification, do one more search round for more.
    const verifiedCount = products.filter((p) => p.verified).length;
    if (verifiedCount < MIN_VERIFIED) {
      const second = await runStylist(products.map((p) => p.url));
      const more = await verifyProducts(second.results);
      const seen = new Set(products.map((p) => p.url));
      for (const m of more) {
        if (!seen.has(m.url)) {
          products.push(m);
          seen.add(m.url);
        }
      }
      if (!summary) summary = second.summary;
    }

    products = products.slice(0, MAX_RESULTS);
    return NextResponse.json({ results: products, search_summary: summary });
  } catch (err) {
    const detail =
      err instanceof Anthropic.APIError
        ? `${err.status} ${err.message}`
        : err instanceof Error
          ? err.message
          : "Unknown error";
    console.error("Anthropic search error:", detail);
    return NextResponse.json(
      { error: "The stylist couldn't complete the search. Please try again." },
      { status: 502 },
    );
  }
}
