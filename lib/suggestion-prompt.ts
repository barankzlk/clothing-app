import { humanizeTag } from "@/lib/utils";

/** Default model for idea suggestions. Cheap, no tools, plain text completion. */
export const SUGGESTION_MODEL =
  process.env.ANTHROPIC_SUGGESTION_MODEL || "claude-haiku-4-5";

const LOCALE_LANGUAGE: Record<string, string> = {
  de: "German",
  pt: "Brazilian Portuguese",
};

/** Build the system prompt asking for a handful of concrete search ideas. */
export function buildSuggestionPrompt(
  tags: string[],
  gender: string | null,
  locale: string | null,
): string {
  const readableTags = tags.map(humanizeTag).join(", ");
  const genderLine =
    gender === "male"
      ? "\nShopping for: menswear."
      : gender === "female"
        ? "\nShopping for: womenswear."
        : "";

  const language = (locale && LOCALE_LANGUAGE[locale]) || "German";

  return `You are a fashion assistant helping someone decide what to search for.

They've selected these style filters: ${readableTags}.${genderLine}

Suggest exactly 6 specific, concrete clothing or accessory items that fit these filters — things a person could literally type into a shop's search bar. Keep each one short: 2-4 words. Be creative and varied: mix garment types, don't just restate the filters, and avoid repeating the same category twice (e.g. don't suggest two dresses).

Write every suggestion in ${language}, since these are typed directly into ${language}-language shop search bars — not in English.

Respond with ONLY a JSON array of 6 strings, no markdown, no prose, no code fences. Example shape (do not reuse these words — invent your own): ["item one", "item two", "item three", "item four", "item five", "item six"]`;
}

/** Tolerantly extract a string array from arbitrary model text. */
export function parseSuggestions(text: string): string[] {
  const trimmed = text.trim();

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates: string[] = [];
  if (fence?.[1]) candidates.push(fence[1].trim());

  const first = trimmed.indexOf("[");
  const last = trimmed.lastIndexOf("]");
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));
  candidates.push(trimmed);

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed)) {
        const strings = parsed.filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0,
        );
        if (strings.length > 0) return strings.slice(0, 8);
      }
    } catch {
      // try next candidate
    }
  }
  return [];
}
