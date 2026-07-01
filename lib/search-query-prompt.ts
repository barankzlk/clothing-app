import { humanizeTag } from "@/lib/utils";

/** Same cheap Haiku model used for idea suggestions — one short completion. */
export const SEARCH_QUERY_MODEL =
  process.env.ANTHROPIC_SUGGESTION_MODEL || "claude-haiku-4-5";

export const SEARCH_QUERY_SYSTEM_PROMPT =
  "You are a search query optimizer. Given a fashion item and user profile, generate one optimized German search term (2-4 words max) that finds this item on Google Shopping. Return ONLY the search term as plain text, nothing else.";

export function buildSearchQueryUserMessage({
  query,
  gender,
  filters,
}: {
  query: string;
  gender: string | null;
  filters: string[];
}): string {
  const readableFilters = filters.map(humanizeTag).join(", ");
  return `Item: ${query}, Gender: ${gender ?? "unspecified"}, Filters: ${readableFilters || "none"}`;
}

/** Tolerantly clean up the model's plain-text search term response. */
export function parseSearchTerm(text: string, fallback: string): string {
  const firstLine = text.trim().split("\n")[0] ?? "";
  const cleaned = firstLine.trim().replace(/^["'„“]+|["'“”]+$/g, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}
