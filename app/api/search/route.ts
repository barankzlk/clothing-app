import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import {
  SEARCH_MODEL,
  buildSystemPrompt,
  extractJson,
  normalizeProducts,
} from "@/lib/search-prompt";
import { BUDGET_MAX, BUDGET_MIN } from "@/lib/style-tags";

// Web search + model reasoning can take a while; give it room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// 16 products at ~7 fields each (incl. two real URLs) already runs ~1800+
// tokens on its own, before any web-search overhead. This ceiling only caps
// spend on a response that would otherwise run away — billing is per token
// actually generated, not the ceiling, so this isn't a bigger bill on a
// normal search; it's the difference between a truncated dead end (which
// still costs the full 1500 tokens for zero usable results) and a complete,
// parseable response.
const MAX_TOKENS = 4000;

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
  // but not trusted for sizing — the full profile is always re-read from the
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

  // 3. Load the caller's full profile from the database (don't trust client copy).
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

  // Budget: request override → profile default → sane fallback. Clamped.
  const requested = Number(body.budgetMax);
  const fallback = profile.budget_max_eur ?? 150;
  const budgetMax = Math.min(
    BUDGET_MAX,
    Math.max(BUDGET_MIN, Number.isFinite(requested) ? requested : fallback),
  );

  const systemPrompt = buildSystemPrompt({ profile, budgetMax, activeFilters });

  // 4. Call Anthropic with the web search tool enabled.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Find clothing for this request: "${query}". Remember to return only the JSON object described in your instructions.`,
      },
    ];
    let text = "";
    let stopReason: string | null = null;
    let searchCount = 0;
    const searchErrors: string[] = [];

    // Resume across web-search `pause_turn` boundaries (up to 3 hops).
    for (let hop = 0; hop < 3; hop++) {
      const message = await anthropic.messages.create({
        model: SEARCH_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
        messages,
      });
      for (const block of message.content) {
        if (block.type === "text") text += block.text;
        if (block.type === "server_tool_use" && block.name === "web_search") {
          searchCount++;
        }
        if (block.type === "web_search_tool_result") {
          const content = block.content as unknown;
          if (content && !Array.isArray(content) && typeof content === "object") {
            const err = content as { error_code?: string };
            if (err.error_code) searchErrors.push(err.error_code);
          }
        }
      }
      stopReason = message.stop_reason;
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      break;
    }

    const parsed = extractJson(text);
    const { results, summary } = normalizeProducts(parsed, text);

    if (results.length === 0) {
      const debug = {
        stopReason,
        searchCount,
        searchErrors,
        textLen: text.length,
        textPreview: text.slice(0, 600),
      };
      // Surfaces in Vercel function logs.
      console.error(`[search] 0 products. ${JSON.stringify(debug)}`);
      // Also hand it back to the client so it's visible in the browser
      // console without needing to open the Vercel dashboard.
      return NextResponse.json({ results, summary, debug });
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
      { error: "The stylist couldn't complete the search. Please try again." },
      { status: 502 },
    );
  }
}
