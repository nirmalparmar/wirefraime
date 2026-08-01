import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const ALLOWED_IMAGE_HOSTS = new Set([
  "fastly.picsum.photos",
  "i.pravatar.cc",
  "images.unsplash.com",
  "picsum.photos",
  "plus.unsplash.com",
]);

function parseAllowedUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username ||
    url.password ||
    !ALLOWED_IMAGE_HOSTS.has(url.hostname.toLowerCase())
  ) {
    throw new Error("Image host is not allowed");
  }
  return url;
}

async function fetchImage(sourceUrl: URL) {
  let currentUrl = sourceUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl, {
      cache: "force-cache",
      headers: { Accept: "image/*" },
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error("Image redirected too many times");
      }
      currentUrl = parseAllowedUrl(new URL(location, currentUrl).href);
      continue;
    }

    if (!response.ok) throw new Error("Image download failed");

    const contentType = response.headers.get("content-type")?.split(";")[0];
    if (!contentType?.startsWith("image/")) {
      throw new Error("URL did not return an image");
    }

    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_IMAGE_BYTES) {
      throw new Error("Image is too large");
    }

    if (!response.body) throw new Error("Image response was empty");

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error("Image is too large");
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, contentType };
  }

  throw new Error("Image download failed");
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
  }

  try {
    const { bytes, contentType } = await fetchImage(parseAllowedUrl(rawUrl));
    return new NextResponse(bytes, {
      headers: {
        "Cache-Control": "private, max-age=86400",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image download failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
