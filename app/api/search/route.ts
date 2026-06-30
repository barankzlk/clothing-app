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
  let body: {
    query?: unknown;
    budgetMax?: unknown;
    occasionFilter?: unknown;
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

  const occasionFilter =
    typeof body.occasionFilter === "string" ? body.occasionFilter : null;

  // 3. Load the caller's profile from the database (don't trust client copy).
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

  const systemPrompt = buildSystemPrompt({ profile, budgetMax, occasionFilter });

  // 4. Call Anthropic with the web search tool enabled.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let responseText = "";
  try {
    const message = await anthropic.messages.create({
      model: SEARCH_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          // Room for 2-3 distinct search angles plus a refinement or two.
          max_uses: 8,
        },
      ],
      messages: [
        {
          role: "user",
          content:
            `Find clothing available to buy and ship in Germany for this request: "${query}".\n` +
            `Run 2-3 different web searches with product-focused, Germany-oriented queries ` +
            `(include terms like "kaufen Deutschland", ".de", or "EU") — a broad one, a ` +
            `style/material-specific one, and a price/occasion-filtered one. Surface a diverse ` +
            `set of shops (not just the big chains), keep everything within budget, then return ` +
            `only the JSON object described in your instructions.`,
        },
      ],
    });

    for (const block of message.content) {
      if (block.type === "text") responseText += block.text;
    }
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

  // 5. Parse and normalize the structured result.
  const parsed = extractJson(responseText);
  if (parsed === null) {
    return NextResponse.json(
      { error: "Couldn't read the search results. Please try again." },
      { status: 502 },
    );
  }

  const { results, search_summary } = normalizeProducts(parsed);
  return NextResponse.json({ results, search_summary });
}
