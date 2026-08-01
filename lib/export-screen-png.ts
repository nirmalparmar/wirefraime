"use client";

const EXPORT_SCALE = 2;
const IMAGE_WAIT_MS = 8_000;
const FONT_WAIT_MS = 8_000;
const SCREENSHOT_TIMEOUT_MS = 60_000;
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw7XWQAAAABJRU5ErkJggg==";

const REVEAL_SELECTOR = [
  ".reveal",
  ".scroll-reveal",
  ".reveal-on-scroll",
  ".animate-on-scroll",
  "[data-reveal]",
  "[data-scroll-reveal]",
  "[data-animate-on-scroll]",
  "[data-aos]",
].join(",");

const REVEAL_CLASSES = [
  "in",
  "visible",
  "show",
  "shown",
  "active",
  "is-visible",
  "is-inview",
  "aos-animate",
];

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function contentHeight(doc: Document) {
  return Math.max(
    doc.documentElement.scrollHeight,
    doc.documentElement.offsetHeight,
    doc.body.scrollHeight,
    doc.body.offsetHeight
  );
}

function prepareLazyImages(doc: Document) {
  for (const source of Array.from(doc.querySelectorAll("source"))) {
    const lazySrcset =
      source.getAttribute("data-srcset") || source.getAttribute("data-lazy-srcset");
    if (!source.getAttribute("srcset") && lazySrcset) {
      source.setAttribute("srcset", lazySrcset);
    }
  }

  for (const image of Array.from(doc.images)) {
    const lazySrc =
      image.getAttribute("data-src") || image.getAttribute("data-lazy-src");
    const lazySrcset =
      image.getAttribute("data-srcset") || image.getAttribute("data-lazy-srcset");

    if (!image.getAttribute("src") && lazySrc) image.src = lazySrc;
    if (!image.getAttribute("srcset") && lazySrcset) image.srcset = lazySrcset;

    image.loading = "eager";
    image.decoding = "sync";
    image.setAttribute("fetchpriority", "high");
  }
}

async function waitForImages(doc: Document) {
  await Promise.all(
    Array.from(doc.images).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
          window.setTimeout(done, IMAGE_WAIT_MS);
        });
      }

      try {
        await image.decode();
      } catch {
        // A failed external image is replaced by the renderer's placeholder.
      }
    })
  );
}

async function waitForFonts(doc: Document) {
  if (!doc.fonts) return;
  await Promise.race([
    doc.fonts.ready.then(() => undefined).catch(() => undefined),
    wait(FONT_WAIT_MS),
  ]);
}

async function triggerViewportObservers(
  iframeWindow: Window,
  doc: Document
) {
  const viewportHeight = Math.max(iframeWindow.innerHeight, 1);
  const lastScrollTop = Math.max(contentHeight(doc) - viewportHeight, 0);
  const step = Math.max(Math.floor(viewportHeight * 0.75), 320);

  for (let scrollTop = 0; scrollTop < lastScrollTop; scrollTop += step) {
    iframeWindow.scrollTo(0, scrollTop);
    await wait(40);
  }

  iframeWindow.scrollTo(0, lastScrollTop);
  await wait(80);
  iframeWindow.scrollTo(0, 0);
}

function forceRevealElements(doc: Document) {
  for (const element of Array.from(
    doc.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
  )) {
    element.classList.add(...REVEAL_CLASSES);
    element.style.setProperty("opacity", "1", "important");
    element.style.setProperty("visibility", "visible", "important");
    element.style.setProperty("transform", "none", "important");
    element.style.setProperty("clip-path", "none", "important");
  }
}

function installExportStyles(doc: Document) {
  const style = doc.createElement("style");
  style.setAttribute("data-png-export", "");
  style.textContent = `
    html { scroll-behavior: auto !important; }
    *, *::before, *::after {
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      caret-color: transparent !important;
    }
  `;
  doc.head.appendChild(style);
}

function shouldIncludeInScreenshot(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return true;

  const tagName = (node as Element).tagName;
  // Computed styles are copied into the screenshot clone. Keeping these nodes
  // makes the browser fetch them again while decoding the SVG foreignObject.
  return !["LINK", "SCRIPT", "NOSCRIPT", "SOURCE"].includes(tagName);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchExportImage(url: string) {
  try {
    const parsed = new URL(url, window.location.href);
    if (
      parsed.protocol === "data:" ||
      parsed.protocol === "blob:" ||
      parsed.origin === window.location.origin
    ) {
      return false;
    }

    const response = await fetch(
      `/api/image-proxy?url=${encodeURIComponent(parsed.href)}`,
      { credentials: "same-origin" }
    );
    if (!response.ok) return false;

    return await blobToDataUrl(await response.blob());
  } catch {
    return false;
  }
}

export async function renderScreenPng(
  html: string,
  viewportWidth: number
): Promise<Blob> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  // Keep the frame inside the top-level viewport so IntersectionObserver-based
  // reveals run. Opacity and pointer-events keep it invisible and inert.
  iframe.style.cssText = [
    "position:fixed",
    "inset:0 auto auto 0",
    `width:${viewportWidth}px`,
    "height:100vh",
    "border:0",
    "opacity:0",
    "pointer-events:none",
    "z-index:-2147483648",
  ].join(";");
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("Export document failed to load"));
      iframe.srcdoc = html;
    });

    const doc = iframe.contentDocument;
    const iframeWindow = iframe.contentWindow;
    if (!doc?.body || !iframeWindow) {
      throw new Error("Export document is not ready");
    }

    installExportStyles(doc);
    prepareLazyImages(doc);
    await triggerViewportObservers(iframeWindow, doc);
    forceRevealElements(doc);
    await Promise.all([waitForFonts(doc), waitForImages(doc)]);
    await wait(100);

    const height = contentHeight(doc);
    const backgroundColor =
      iframeWindow.getComputedStyle(doc.body).backgroundColor || "#ffffff";
    const { domToBlob } = await import("modern-screenshot");
    const sharedOptions = {
      width: viewportWidth,
      height,
      scale: EXPORT_SCALE,
      backgroundColor,
      timeout: SCREENSHOT_TIMEOUT_MS,
      filter: shouldIncludeInScreenshot,
      fetch: {
        requestInit: {
          cache: "force-cache" as RequestCache,
          credentials: "omit" as RequestCredentials,
          mode: "cors" as RequestMode,
        },
        placeholderImage: TRANSPARENT_PIXEL,
      },
      fetchFn: fetchExportImage,
    };

    try {
      return await domToBlob(doc.documentElement, sharedOptions);
    } catch (error) {
      // Web fonts are cosmetic; retrying without embedding them makes export
      // resilient to font CDNs that reject browser fetches.
      console.warn("[export-png] Retrying without embedded web fonts", error);
      return await domToBlob(doc.documentElement, {
        ...sharedOptions,
        font: false,
      });
    }
  } finally {
    iframe.remove();
  }
}

export async function exportScreenPng(
  html: string,
  viewportWidth: number,
  screenName: string
) {
  const slug =
    screenName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "screen";
  const blob = await renderScreenPng(html, viewportWidth);

  if (!blob.size || !blob.type.startsWith("image/")) {
    throw new Error("PNG export produced an empty image");
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${slug}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
