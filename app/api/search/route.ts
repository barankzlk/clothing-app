import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_DOMAINS,
  SEARCH_MODEL,
  buildSystemPrompt,
  parseSearchResults,
} from "@/lib/search-prompt";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/style-tags";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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

  // 3. Load the caller's profile.
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

  // 4. Haiku + at most 2 web searches. Output budget must leave room for the
  //    JSON *after* the search/citation blocks (which also consume output
  //    tokens), so 4000 — still only ~1-2ct of Haiku output per search.
  try {
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content:
          `Search for: "${query}". Run at most 2 web searches: "${query} kaufen" ` +
          `and "${query} online shop". Return at least 20 real products from the ` +
          `results as JSON only — no commentary.`,
      },
    ];

    let text = "";
    let stopReason: string | null = null;

    // Resume across web-search `pause_turn` boundaries (up to 3 hops).
    for (let hop = 0; hop < 3; hop++) {
      const message = await anthropic.messages.create({
        model: SEARCH_MODEL,
        max_tokens: 4000,
        system: [
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 2,
            // Hard-restrict results to the curated shop whitelist.
            allowed_domains: ALLOWED_DOMAINS,
          },
        ],
        messages,
      });

      for (const block of message.content) {
        if (block.type === "text") text += block.text;
      }
      stopReason = message.stop_reason;

      if (message.stop_reason === "pause_turn") {
        // Re-send with the assistant's partial turn so the server resumes.
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      break;
    }

    const results = parseSearchResults(text);
    if (results.length === 0) {
      // Surfaces in Vercel function logs to diagnose an empty result set.
      console.error(
        `[search] 0 products. stop_reason=${stopReason} textLen=${text.length} preview=${JSON.stringify(
          text.slice(0, 400),
        )}`,
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
