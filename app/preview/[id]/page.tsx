"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { WireframeApp, Platform, Screen } from "@/lib/types";
import { VIEWPORTS } from "@/lib/constants";

/* Brand logo — the current Wirefraime mark used across the app (/logo.svg). */
function BrandMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src="/logo.svg" alt="Wirefraime" width={size} height={size} className={`block ${className}`} />;
}

function getViewport(platform: Platform) {
  return VIEWPORTS[platform] ?? VIEWPORTS.web;
}

/* Two-digit plate number — screens are an ordered set, so they're numbered
   like plates in a gallery. */
const plate = (i: number) => String(i + 1).padStart(2, "0");

/* Keep clicks inside the preview. A srcdoc iframe resolves relative/hash hrefs
   against the PARENT page URL, so an in-design link like `#pricing` would
   navigate the iframe to the preview route and boot the whole (sandboxed) app
   inside it — Clerk then throws "Failed to read localStorage". This guard makes
   `#` links scroll within the frame and stops every other navigation (real
   external links open in a new tab instead). */
const PREVIEW_GUARD = `<script>(function(){
  function onClick(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if(!a) return;
    var href = a.getAttribute('href') || '';
    if(href.charAt(0) === '#'){
      e.preventDefault();
      var id = decodeURIComponent(href.slice(1));
      if(!id){ window.scrollTo({top:0,behavior:'smooth'}); return; }
      var t = document.getElementById(id) || document.getElementsByName(id)[0];
      if(t){ t.scrollIntoView({behavior:'smooth',block:'start'}); }
      return;
    }
    e.preventDefault();
    if(/^https?:\\/\\//i.test(href)){ try{ window.open(href,'_blank','noopener'); }catch(_){} }
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', function(e){ e.preventDefault(); }, true);
})();<\/script>`;

function withPreviewGuard(html: string): string {
  if (!html) return html;
  return html.includes("</body>")
    ? html.replace("</body>", PREVIEW_GUARD + "</body>")
    : html + PREVIEW_GUARD;
}

/* ── Tiny icons (stroke = currentColor) ───────────────────────── */
function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const ICON = {
  left: "M15 18l-6-6 6-6",
  right: "M9 18l6-6-6-6",
  close: "M18 6L6 18M6 6l12 12",
  expand: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
};

/* Measure an element's content box — drives fit-to-width scaling. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<WireframeApp | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/share/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setApp(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="workspace-light grid min-h-screen place-items-center bg-background font-sans text-muted-foreground">
        <div className="flex flex-col items-center gap-4">
          <BrandMark size={38} className="animate-pulse" />
          <p className="text-[13px] tracking-wide">Loading preview…</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="workspace-light grid min-h-screen place-items-center bg-background px-6 font-sans text-foreground">
        <div className="max-w-sm text-center">
          <BrandMark size={36} className="mx-auto mb-6" />
          <h1 className="font-serif text-[30px] leading-tight">Nothing to preview</h1>
          <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
            This share link may have expired or never existed. Generate a new one from your workspace.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground transition hover:opacity-90"
          >
            Go to Wirefraime
          </Link>
        </div>
      </div>
    );
  }

  const viewport = getViewport(app.platform);
  const screens = app.screens.filter((s) => s.html);
  const THUMB_W = 440;
  const scale = THUMB_W / viewport.w;
  const thumbH = Math.round(viewport.h * scale);

  return (
    <div className="workspace-light min-h-screen bg-background font-sans text-foreground">
      {/* Ambient accent wash — quiet, top-anchored */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[42vh] bg-[radial-gradient(65%_100%_at_50%_0%,color-mix(in_oklch,var(--ws-accent)_13%,transparent),transparent_70%)]"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3.5">
            <Link href="/" aria-label="Wirefraime home" className="shrink-0 transition hover:opacity-70">
              <BrandMark size={28} />
            </Link>
            <span className="hidden h-7 w-px bg-border sm:block" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Shared preview
              </p>
              <h1 className="truncate font-serif text-[22px] leading-tight tracking-[-0.01em]">
                {app.name}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <span className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] capitalize text-muted-foreground sm:inline-flex">
              {app.platform}
              <span className="text-foreground/30">·</span>
              {screens.length} screen{screens.length !== 1 ? "s" : ""}
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground transition hover:opacity-90"
            >
              Made with Wirefraime
            </Link>
          </div>
        </div>
        {app.description && (
          <div className="mx-auto max-w-[1400px] px-6 pb-4 sm:px-8">
            <p className="max-w-[720px] text-[13.5px] leading-relaxed text-muted-foreground">
              {app.description}
            </p>
          </div>
        )}
      </header>

      {/* Gallery */}
      <main className="relative mx-auto max-w-[1400px] px-6 pb-24 pt-10 sm:px-8">
        {screens.length === 0 ? (
          <div className="py-24 text-center text-[14px] text-muted-foreground">
            No screens to display yet.
          </div>
        ) : (
          <div
            className="grid gap-7"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.min(THUMB_W, 320)}px, 1fr))` }}
          >
            {screens.map((screen, i) => (
              <PlateCard
                key={screen.id}
                screen={screen}
                index={i}
                viewport={viewport}
                scale={scale}
                thumbH={thumbH}
                onOpen={() => setOpenIndex(i)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-7 text-center text-[12.5px] text-muted-foreground">
        Built with{" "}
        <Link href="/" className="font-medium text-foreground transition hover:text-ws-accent">
          Wirefraime
        </Link>
      </footer>

      {openIndex !== null && (
        <Lightbox
          screens={screens}
          index={openIndex}
          setIndex={setOpenIndex}
          viewport={viewport}
          platform={app.platform}
        />
      )}
    </div>
  );
}

/* ── Plate card — a screen presented as a numbered gallery plate ──── */
function PlateCard({
  screen,
  index,
  viewport,
  scale,
  thumbH,
  onOpen,
}: {
  screen: Screen;
  index: number;
  viewport: { w: number; h: number };
  scale: number;
  thumbH: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-ws-accent/45 hover:shadow-[0_24px_50px_-26px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent/60"
    >
      {/* Viewing rail */}
      <div className="flex h-10 items-center gap-2.5 border-b border-border px-3.5">
        <span className="font-sans text-[11px] font-semibold tabular-nums tracking-[0.15em] text-muted-foreground">
          {plate(index)}
        </span>
        <span className="truncate text-[13px] font-medium text-foreground">{screen.name}</span>
        <span className="ml-auto text-muted-foreground opacity-0 transition group-hover:opacity-100 group-hover:text-ws-accent">
          <Icon d={ICON.expand} size={14} />
        </span>
      </div>

      {/* Thumbnail — top of the screen, non-interactive */}
      <div className="relative overflow-hidden bg-white" style={{ height: thumbH }}>
        <iframe
          srcDoc={screen.html}
          sandbox="allow-scripts"
          tabIndex={-1}
          title={screen.name}
          className="block border-0"
          style={{
            width: viewport.w,
            height: viewport.h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
        {/* Hover veil + open affordance */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3.5 py-1.5 text-[12px] font-medium text-foreground shadow-sm backdrop-blur">
            <Icon d={ICON.expand} size={13} />
            Open screen
          </span>
        </div>
      </div>
    </button>
  );
}

/* ── Lightbox — floating viewing frame with toolbar + live screen ──── */
function Lightbox({
  screens,
  index,
  setIndex,
  viewport,
  platform,
}: {
  screens: Screen[];
  index: number;
  setIndex: (i: number | null) => void;
  viewport: { w: number; h: number };
  platform: Platform;
}) {
  const [stageRef, stage] = useSize<HTMLDivElement>();
  const [shown, setShown] = useState(false);
  const screen = screens[index];
  const count = screens.length;

  const close = useCallback(() => setIndex(null), [setIndex]);
  const go = useCallback(
    (dir: -1 | 1) => setIndex((index + dir + count) % count),
    // setIndex from useState is stable; index/count drive the wrap
    [index, count, setIndex]
  );

  // Enter transition (one frame after mount) + body scroll lock
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" && count > 1) go(1);
      else if (e.key === "ArrowLeft" && count > 1) go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, go, count]);

  // Fit screen to the available stage width (never upscale past 1:1).
  const fit = stage.w > 0 ? Math.min(1, stage.w / viewport.w) : 0;
  const frameW = Math.round(viewport.w * fit);
  const frameH = stage.h > 0 ? Math.round(stage.h) : 0;
  const isPhone = platform === "mobile";

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-[100] flex flex-col bg-background/85 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={`${screen.name} preview`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--ws-accent)_16%,transparent),transparent_72%)]"
      />

      {/* Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex items-center gap-3 border-b border-border/70 px-4 py-3 sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-sans text-[11px] font-semibold tabular-nums tracking-[0.15em] text-muted-foreground">
            {plate(index)}
          </span>
          <h2 className="truncate font-serif text-[19px] leading-none tracking-[-0.01em] text-foreground">
            {screen.name}
          </h2>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {count > 1 && (
            <div className="mr-1 flex items-center gap-0.5 rounded-full border border-border bg-card/60 p-0.5">
              <ToolbarBtn label="Previous screen" onClick={() => go(-1)} icon={ICON.left} />
              <span className="px-2 text-[11.5px] font-medium tabular-nums tracking-wide text-muted-foreground">
                {plate(index)} <span className="text-foreground/30">/</span> {plate(count - 1)}
              </span>
              <ToolbarBtn label="Next screen" onClick={() => go(1)} icon={ICON.right} />
            </div>
          )}
          <ToolbarBtn label="Close preview" onClick={close} icon={ICON.close} />
        </div>
      </div>

      {/* Stage */}
      <div
        onClick={close}
        className="relative z-0 flex flex-1 items-stretch justify-center overflow-hidden p-4 sm:p-7"
      >
        <div ref={stageRef} className="relative w-full max-w-[1320px]">
          {frameW > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute left-1/2 top-0 -translate-x-1/2 overflow-hidden border border-border bg-white shadow-[0_50px_130px_-40px_rgba(0,0,0,0.8)] transition-all duration-300 ease-out motion-reduce:transition-none ${
                isPhone ? "rounded-[2.2rem]" : "rounded-2xl"
              } ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
              style={{ width: frameW, height: frameH }}
            >
              <iframe
                key={screen.id}
                srcDoc={withPreviewGuard(screen.html)}
                sandbox="allow-scripts allow-popups"
                title={screen.name}
                className="block origin-top-left border-0"
                style={{
                  width: viewport.w,
                  height: fit > 0 ? Math.round(frameH / fit) : frameH,
                  transform: `scale(${fit})`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex items-center justify-center gap-2 border-t border-border/70 py-3 text-[11.5px] text-muted-foreground"
      >
        <span className="capitalize">{platform}</span>
        <span className="text-foreground/25">·</span>
        <span className="tabular-nums">
          {viewport.w} × {viewport.h}
        </span>
        <span className="text-foreground/25">·</span>
        <span>Scroll inside the frame to explore</span>
      </div>
    </div>
  );
}

function ToolbarBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent/60"
    >
      <Icon d={icon} size={16} />
    </button>
  );
}
