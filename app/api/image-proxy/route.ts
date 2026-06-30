import { NextResponse, type NextRequest } from "next/server";

// Product images live on shop CDNs (ARKET, Zalando, H&M…) that reject
// cross-site hotlinking. We fetch them server-side with browser-like headers
// and re-serve them same-origin so the browser loads them without issue.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const FETCH_TIMEOUT_MS = 12_000;

/**
 * Block private / internal / metadata hosts to limit SSRF. This catches
 * literal private IPs and loopback/link-local names; it does not resolve DNS,
 * so it won't catch a public hostname that points at an internal IP.
 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::" || h === "::1") return true;
  if (h === "metadata.google.internal" || h.endsWith(".internal")) return true;

  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) {
    return true;
  }

  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 0 || a === 127) return true; // this-host / loopback
    if (a === 10) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }

  return false;
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new NextResponse("Unsupported protocol", { status: 400 });
  }
  if (isBlockedHost(parsed.hostname)) {
    return new NextResponse("Blocked host", { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Many CDNs gate on User-Agent and Referer; mimic a real browser
        // navigating from the image's own origin.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: `${parsed.protocol}//${parsed.host}/`,
      },
    });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return new NextResponse("Not an image", { status: 415 });
  }

  const declaredLength = upstream.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_BYTES) {
    return new NextResponse("Image too large", { status: 413 });
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return new NextResponse("Image too large", { status: 413 });
  }

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      // Cache aggressively at the CDN/browser — product images are immutable.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
