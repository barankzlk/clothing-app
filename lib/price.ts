/**
 * Parse a price string like "€49,95", "€49.95", or "€1.249,00" into a number.
 * Returns null when it can't be parsed, so callers can sort unparsable prices
 * to the end regardless of sort direction.
 */
export function parsePrice(price: string): number | null {
  const cleaned = price.replace(/[^0-9.,]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever separator appears last is the decimal point; the other is a
    // thousands separator, e.g. "1.249,00" -> "1249.00", "1,249.00" stays.
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma !== -1) {
    // A single comma is treated as the decimal separator (EU style).
    normalized = cleaned.replace(",", ".");
  }

  const n = Number.parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
}
