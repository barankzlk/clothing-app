import { NextResponse } from "next/server";
import { getJson } from "serpapi";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * SerpAPI's `google_shopping` thumbnails are small, compressed proxies —
 * fine for a grid, too blurry once blown up to a fullscreen swipe card. The
 * `google_product` engine (keyed by the shopping result's `product_id`)
 * returns Google's richer immersive product page data, which usually
 * includes much larger source images. This is a best-effort upgrade: if the
 * shape doesn't match (SerpAPI's product-detail schema isn't publicly
 * documented in detail), we just fall back to the original thumbnail.
 */
function findFullResImage(data: Record<string, unknown>): string | null {
  const productResults = data.product_results as Record<string, unknown> | undefined;
  const media = productResults?.media as unknown;
  const images = productResults?.images as unknown;

  const candidates: unknown[] = [
    Array.isArray(media) ? media[0]?.link : undefined,
    Array.isArray(media) ? media[0]?.original : undefined,
    Array.isArray(images) ? images[0]?.link : undefined,
    Array.isArray(images) ? images[0]?.original : undefined,
    Array.isArray(images) ? images[0] : undefined,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json({ image_url: null });
  }

  let body: { productId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ error: "productId is required." }, { status: 400 });
  }

  try {
    const data = await getJson({
      engine: "google_product",
      product_id: productId,
      api_key: process.env.SERPAPI_KEY,
      gl: "de",
      hl: "de",
    });
    return NextResponse.json({ image_url: findFullResImage(data) });
  } catch (err) {
    console.error(
      "Product image lookup failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ image_url: null });
  }
}
