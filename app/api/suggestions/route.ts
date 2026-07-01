import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import {
  SUGGESTION_MODEL,
  buildSuggestionPrompt,
  parseSuggestions,
} from "@/lib/suggestion-prompt";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Suggestions are a nice-to-have — degrade quietly instead of erroring.
    return NextResponse.json({ suggestions: [] });
  }

  let body: { tags?: unknown; gender?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string")
    : [];
  if (tags.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }
  const gender = typeof body.gender === "string" ? body.gender : null;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let responseText = "";
  try {
    const message = await anthropic.messages.create({
      model: SUGGESTION_MODEL,
      max_tokens: 300,
      system: buildSuggestionPrompt(tags, gender),
      messages: [{ role: "user", content: "Suggest items." }],
    });
    for (const block of message.content) {
      if (block.type === "text") responseText += block.text;
    }
  } catch (err) {
    console.error(
      "Suggestion error:",
      err instanceof Anthropic.APIError
        ? `${err.status} ${err.message}`
        : err instanceof Error
          ? err.message
          : "Unknown error",
    );
    return NextResponse.json({ suggestions: [] });
  }

  return NextResponse.json({ suggestions: parseSuggestions(responseText) });
}
