"use client";

import { useMemo, useCallback, useRef, useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
  PanOnScrollMode,
  useReactFlow,
  useViewport,
  type Node,
  type NodeProps,
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspace } from "@/lib/store/use-workspace";
import { LiveIframe } from "./LiveIframe";
import { SERIF, SANS, C, VIEWPORTS } from "@/lib/constants";
import type { SelectedElement } from "@/lib/store/use-workspace";

/* ── PNG export ──
   Uses `modern-screenshot` (maintained fork of dom-to-image). It explicitly
   handles cross-origin stylesheets by fetching their text rather than reading
   `cssRules`, which is what made `html-to-image` crash with SecurityError on
   Google Fonts / external CDNs. */
async function exportScreenPng(html: string, vpW: number, screenName: string) {
  const slug = screenName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "screen";

  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${vpW}px;height:100vh;border:none;opacity:0;pointer-events:none;`;
  document.body.appendChild(iframe);

  try {
    // 1. Render the HTML in a hidden iframe
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("iframe failed to load"));
      iframe.srcdoc = html;
    });

    const doc = iframe.contentDocument;
    if (!doc?.body) throw new Error("iframe document not ready");

    // 2. Wait for fonts + images
    try { await doc.fonts?.ready; } catch { /* fonts API missing */ }
    const imgs = Array.from(doc.images).filter((i) => !i.complete);
    if (imgs.length) {
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((r) => {
              const done = () => r();
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
              setTimeout(done, 3000); // hard cap so a broken image can't stall us
            })
        )
      );
    }
    await new Promise((r) => setTimeout(r, 150));

    // 3. Measure real content height
    const contentH = Math.max(
      doc.documentElement.scrollHeight,
      doc.body.scrollHeight,
      doc.body.offsetHeight
    );
    iframe.style.height = `${contentH}px`;
    await new Promise((r) => setTimeout(r, 80));

    // 4. Render to PNG. `modern-screenshot` reads cross-origin stylesheets
    //    via fetch, not cssRules — no SecurityError.
    const { domToPng } = await import("modern-screenshot");
    const dataUrl = await domToPng(doc.documentElement, {
      width: vpW,
      height: contentH,
      scale: 2,
      backgroundColor: getComputedStyle(doc.body).backgroundColor || "#ffffff",
    });

    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      throw new Error("export produced empty image");
    }

    // 5. Trigger download
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    document.body.removeChild(iframe);
  }
}

const GRID_COLS = 3;
const CARD_GAP = 80;
const LABEL_H = 44;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const PAN_ON_SCROLL_SPEED = 0.8;

/* ── Card shadow tokens — adapt per theme ── */
const SHADOW_CARD = "var(--shadow-card)";
const SHADOW_CARD_ACTIVE = "var(--shadow-card-active)";
const SHADOW_SKELETON = "var(--shadow-card-active)";

/* ── Generating animation ──
   A wireframe that sketches itself: nav → headline → CTA → media → cards
   draw in with staggered strokes, hold, fade, and redraw. Replaces the old
   static gray-block skeleton. */
function GeneratingCard({ label, sublabel }: { label: string; sublabel?: string }) {
  const d = (s: number): React.CSSProperties => ({ animationDelay: `${s}s` });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--card)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
      }}
    >
      <svg
        width="320"
        height="232"
        viewBox="0 0 320 232"
        fill="none"
        style={{ color: "var(--foreground)", maxWidth: "72%", height: "auto" }}
      >
        {/* butt caps: round caps paint a stray dot at the path start while the
            dash is still fully offset (Chrome zero-length-dash artifact) */}
        <g stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45">
          {/* Nav bar */}
          <circle className="wf-draw" pathLength={1} cx="23" cy="19" r="7" style={d(0)} />
          <line className="wf-draw" pathLength={1} x1="42" y1="19" x2="86" y2="19" style={d(0.1)} />
          <line className="wf-draw" pathLength={1} x1="216" y1="19" x2="240" y2="19" style={d(0.18)} />
          <line className="wf-draw" pathLength={1} x1="252" y1="19" x2="276" y2="19" style={d(0.24)} />
          <rect className="wf-draw" pathLength={1} x="288" y="10" width="26" height="18" rx="9" style={d(0.32)} />
          <line className="wf-draw" pathLength={1} x1="8" y1="36" x2="312" y2="36" strokeOpacity="0.18" style={d(0.4)} />

          {/* Headline */}
          <line className="wf-draw" pathLength={1} x1="16" y1="64" x2="206" y2="64" strokeWidth="3" style={d(0.55)} />
          <line className="wf-draw" pathLength={1} x1="16" y1="80" x2="152" y2="80" strokeWidth="3" style={d(0.68)} />
          <line className="wf-draw" pathLength={1} x1="16" y1="102" x2="128" y2="102" strokeOpacity="0.25" style={d(0.8)} />
          <line className="wf-draw" pathLength={1} x1="16" y1="112" x2="104" y2="112" strokeOpacity="0.25" style={d(0.88)} />

          {/* CTA */}
          <rect className="wf-draw" pathLength={1} x="16" y="126" width="76" height="22" rx="11" style={d(1.0)} />

          {/* Media block */}
          <rect className="wf-draw" pathLength={1} x="226" y="54" width="88" height="94" rx="8" style={d(1.12)} />
          <path className="wf-draw" pathLength={1} d="M234 130l20-24 14 14 18-22 22 32" style={d(1.3)} />
          <circle className="wf-draw" pathLength={1} cx="248" cy="78" r="7" style={d(1.4)} />

          {/* Card row */}
          <rect className="wf-draw" pathLength={1} x="16" y="166" width="91" height="54" rx="8" style={d(1.55)} />
          <rect className="wf-draw" pathLength={1} x="115" y="166" width="91" height="54" rx="8" style={d(1.67)} />
          <rect className="wf-draw" pathLength={1} x="214" y="166" width="100" height="54" rx="8" style={d(1.79)} />
          <line className="wf-draw" pathLength={1} x1="26" y1="184" x2="62" y2="184" strokeOpacity="0.3" style={d(1.95)} />
          <line className="wf-draw" pathLength={1} x1="26" y1="198" x2="92" y2="198" strokeOpacity="0.2" style={d(2.02)} />
          <line className="wf-draw" pathLength={1} x1="125" y1="184" x2="161" y2="184" strokeOpacity="0.3" style={d(2.09)} />
          <line className="wf-draw" pathLength={1} x1="125" y1="198" x2="191" y2="198" strokeOpacity="0.2" style={d(2.16)} />
          <line className="wf-draw" pathLength={1} x1="224" y1="184" x2="260" y2="184" strokeOpacity="0.3" style={d(2.23)} />
          <line className="wf-draw" pathLength={1} x1="224" y1="198" x2="295" y2="198" strokeOpacity="0.2" style={d(2.3)} />
        </g>
        {/* Soft fills appearing behind drawn outlines */}
        <g fill="currentColor" fillOpacity="0.05">
          <rect className="wf-fill-in" x="16" y="126" width="76" height="22" rx="11" style={d(1.0)} />
          <rect className="wf-fill-in" x="226" y="54" width="88" height="94" rx="8" style={d(1.12)} />
        </g>
      </svg>

      {(label || sublabel) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          {label && (
            <span
              className="wf-shimmer-text"
              style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em" }}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span style={{ fontFamily: SANS, fontSize: 11, color: C.text4 }}>{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Node data type ── */
type ScreenNodeData = {
  screenName: string;
  html: string;
  isStreaming: boolean;
  streamChunksRef: React.MutableRefObject<Map<string, string[]>>;
  streamTick: number;
  isActive: boolean;
  isSkeleton: boolean;
  vpW: number;
  vpH: number;
  contentHeight: number;
  genStep?: string;
  onElementSelected: (el: SelectedElement | null) => void;
  onHtmlUpdated: (html: string, editKey?: string | null) => void;
  onIframeMount: (el: HTMLIFrameElement | null) => void;
  onContentHeight: (height: number) => void;
};

type ScreenNode = Node<ScreenNodeData, "screen">;

/* ── Custom node ── */
function ScreenNodeComponent({ id, data }: NodeProps<ScreenNode>) {
  const { vpW, vpH, contentHeight } = data;
  const [exporting, setExporting] = useState(false);
  // Use actual content height when available; fall back to viewport height only during streaming or before report
  const displayH = contentHeight > 0 ? contentHeight : vpH;

  if (data.isSkeleton) {
    return (
      <div style={{ width: vpW, display: "flex", flexDirection: "column", gap: 14, contain: "layout style paint" }}>
        <div style={{ height: 14, width: 120, background: C.borderSub, borderRadius: 6 }} />
        <div style={{
          width: vpW, height: vpH, background: "var(--card)", borderRadius: 20,
          boxShadow: SHADOW_SKELETON, position: "relative", overflow: "hidden",
        }}>
          <GeneratingCard label={data.genStep || "Preparing…"} sublabel="This may take a moment" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: vpW, display: "flex", flexDirection: "column", gap: 14, contain: "layout style paint" }}>
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 2 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: data.isActive ? C.text3 : C.text4 }}>
          <rect x="1.5" y="2" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.5 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M7 10v2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span style={{
          fontFamily: SANS, fontSize: 13, userSelect: "none", letterSpacing: "0.01em",
          color: data.isActive ? C.text2 : C.text4,
          fontWeight: 500,
        }}>
          {data.screenName}
        </span>
        <div style={{ flex: 1, height: 0, borderTop: `1px dashed color-mix(in srgb, currentColor 20%, transparent)`, color: C.text4, minWidth: 20 }} />
        {data.isStreaming && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: SANS, fontSize: 11, color: C.wsAccent }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.wsAccent, display: "inline-block", animation: "wfPulse 1.4s ease infinite" }} />
            live
          </span>
        )}
        {!data.isStreaming && data.html && (
          <button
            title={exporting ? "Exporting..." : "Export as PNG"}
            disabled={exporting}
            onClick={async (e) => {
              e.stopPropagation();
              if (exporting) return;
              setExporting(true);
              try {
                await exportScreenPng(data.html, vpW, data.screenName);
              } catch (err) {
                const msg =
                  err instanceof Error
                    ? `${err.name}: ${err.message}\n${err.stack ?? ""}`
                    : typeof err === "string"
                      ? err
                      : (() => {
                          try { return JSON.stringify(err); } catch { return String(err); }
                        })();
                console.error("[export-png]", msg, err);
              } finally {
                setExporting(false);
              }
            }}
            className="group/exp inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground/70 transition shadow-[var(--ws-raised)] hover:text-foreground hover:shadow-[var(--ws-soft)] disabled:cursor-default disabled:opacity-60"
            style={{ fontFamily: SANS }}
          >
            {exporting ? (
              <>
                <span className="inline-block size-3 animate-spin rounded-full border-[1.5px] border-foreground/30 border-t-foreground" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                {/* Image-export icon: picture frame with download arrow */}
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1.5" y="2" width="13" height="9.5" rx="2" />
                  <circle cx="5" cy="5.5" r="1" fill="currentColor" stroke="none" />
                  <path d="M14.5 8.5l-3-2.5-5 4.5" />
                  <path d="M8 14v-2" />
                  <path d="M6 13l2 2 2-2" />
                </svg>
                <span>Export</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Iframe card.
          Clipping (overflow:hidden + contain:paint) stays so a streaming
          screen never paints outside its box. The translateZ(0) promotion was
          removed: a force-promoted layer caches its raster at the scale it was
          painted at, so iframe content stayed blurry after zooming in. Without
          the explicit promotion Chrome re-rasterizes at the effective scale —
          crisp screens at every zoom level. */}
      <div style={{
        borderRadius: 16, overflow: "hidden", position: "relative",
        pointerEvents: data.isStreaming ? "none" : data.isActive ? "auto" : "none",
        border: data.isActive && !data.isStreaming ? `2px solid ${C.wsAccent}` : "none",
        contain: "layout style paint",
      }}>
        <LiveIframe
          key={id}
          screenId={id}
          html={data.html}
          isStreaming={data.isStreaming}
          streamChunks={data.streamChunksRef.current.get(id) || []}
          width={vpW}
          height={displayH}
          onElementSelected={data.onElementSelected}
          onHtmlUpdated={data.onHtmlUpdated}
          onIframeMount={data.onIframeMount}
          onContentHeight={data.onContentHeight}
        />
        {/*
          Shimmer overlay: visible until we have BOTH stream chunks AND
          measurable rendered content (contentHeight > 0). The first ~2s of
          streaming produce a few small <!DOCTYPE><html><head>… chunks that
          render nothing — without this guard the shimmer disappeared and the
          card looked blank for a few seconds before real content started
          appearing.
        */}
        {data.isStreaming && data.contentHeight < 60 && !data.html && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 16, overflow: "hidden" }}>
            <GeneratingCard
              label={`Designing "${data.screenName}"`}
              sublabel="Streaming the design live"
            />
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { screen: ScreenNodeComponent };

/* ── Wheel input shape (shared by bridge postMessage + window forwarder) ── */
export interface WheelInput {
  deltaX: number;
  deltaY: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  clientX: number; // PAGE-space cursor X
  clientY: number; // PAGE-space cursor Y
}

/* ── Props ── */
interface CanvasProps {
  streamChunks: React.MutableRefObject<Map<string, string[]>>;
  streamTick: number;
  onIframeRef: (el: HTMLIFrameElement | null) => void;
  /** Exposed so external buttons (e.g. CanvasActions) can refit the viewport. */
  fitViewRef?: React.MutableRefObject<(() => void) | null>;
  /** Exposed so the workspace-level wheel handler can drive pan/zoom from
   *  events that don't originate inside the React Flow pane. */
  applyWheelRef?: React.MutableRefObject<((w: WheelInput) => void) | null>;
  /** Focus a specific screen node by id, centering + zooming to it. */
  focusScreenRef?: React.MutableRefObject<((screenId: string) => void) | null>;
}

/* ── Bottom-center zoom / fit control bar ──────────────────────
   Lives in its own component so the live `useViewport` re-render is
   isolated from CanvasInner (which mounts the heavy iframes). */
function ZoomBar({ onFit }: { onFit: () => void }) {
  const { zoom } = useViewport();
  const { zoomIn, zoomOut } = useReactFlow();
  const pct = Math.round(zoom * 100);

  const btn =
    "flex size-7 items-center justify-center rounded-lg text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground";

  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-border bg-[var(--surface-glass-strong)] px-1.5 py-1 shadow-[0_2px_10px_-3px_rgba(20,20,20,0.18),0_12px_32px_-18px_rgba(20,20,20,0.30)] backdrop-blur-md">
      <button onClick={() => zoomOut({ duration: 200 })} title="Zoom out" className={btn}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <button
        onClick={onFit}
        title="Fit view"
        className="min-w-[52px] rounded-lg px-1.5 py-1 text-center text-[12px] font-medium tabular-nums text-foreground/65 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        {pct}%
      </button>
      <button onClick={() => zoomIn({ duration: 200 })} title="Zoom in" className={btn}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <button onClick={onFit} title="Fit to screen" className={btn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
        </svg>
      </button>
    </div>
  );
}

/* ── Inner canvas (inside ReactFlowProvider) ── */
function CanvasInner({ streamChunks, streamTick, onIframeRef, fitViewRef, applyWheelRef, focusScreenRef }: CanvasProps) {
  const { state, dispatch } = useWorkspace();
  const { app, isGenerating, genStep, activeScreenId } = state;
  const { fitView, setViewport, getViewport, updateNodeData } = useReactFlow();
  const iframeMapRef = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const [contentHeights, setContentHeights] = useState<Map<string, number>>(new Map());

  // Expose fitView to parent (CanvasActions "Fit to view" button)
  useEffect(() => {
    if (!fitViewRef) return;
    fitViewRef.current = () => {
      try { fitView({ padding: 0.15, duration: 400 }); } catch { /* unmounted */ }
    };
    return () => { if (fitViewRef) fitViewRef.current = null; };
  }, [fitView, fitViewRef]);

  // Expose focus-screen so the Toolbar dropdown can jump to a screen
  useEffect(() => {
    if (!focusScreenRef) return;
    focusScreenRef.current = (screenId: string) => {
      try {
        fitView({ nodes: [{ id: screenId }], padding: 0.2, duration: 500, maxZoom: 0.9 });
      } catch { /* unmounted */ }
      dispatch({ type: "SET_ACTIVE_SCREEN", id: screenId });
    };
    return () => { if (focusScreenRef) focusScreenRef.current = null; };
  }, [fitView, focusScreenRef, dispatch]);

  const vp = VIEWPORTS[app.platform ?? "web"];
  const CANVAS_W = vp.w;
  const CANVAS_H = vp.h;

  /* Workspace is always light — React Flow follows. */
  const colorMode: ColorMode = "light";

  /* Push live CSS variable updates to all iframes when design system changes.
     After pushing, request each iframe to emit current HTML so the auto-save
     effect picks up the new ds-live-override state — without reloading. */
  const prevDsRef = useRef(app.designSystem);
  const dsEmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const ds = app.designSystem;
    if (!ds || ds === prevDsRef.current) {
      prevDsRef.current = ds;
      return;
    }
    prevDsRef.current = ds;

    const vars: Record<string, string> = {
      "--color-primary": ds.colors.primary,
      "--color-secondary": ds.colors.secondary,
      "--color-background": ds.colors.background,
      "--color-surface": ds.colors.surface,
      "--color-text": ds.colors.text,
      "--color-text-muted": ds.colors.textMuted,
      "--color-border": ds.colors.border,
      "--color-success": ds.colors.success,
      "--color-error": ds.colors.error,
    };
    const bodyFont = ds.fonts.primary;

    iframeMapRef.current.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage({ type: "UPDATE_CSS_VARS", vars, bodyFont }, "*");
      } catch { /* cross-origin */ }
    });

    // Debounced emit — capture latest HTML so auto-save persists DS changes.
    // The emit happens via HTML_UPDATED → recentSelfEditsRef cache hit in
    // LiveIframe, so no iframe reload.
    if (dsEmitTimerRef.current) clearTimeout(dsEmitTimerRef.current);
    dsEmitTimerRef.current = setTimeout(() => {
      iframeMapRef.current.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage({ type: "EMIT_HTML", editKey: "ds-sync" }, "*");
        } catch { /* ignore */ }
      });
    }, 800);
  }, [app.designSystem]);

  /* Single source of truth for wheel-based pan/zoom. Called by:
     - iframe bridge postMessage forwarder (cursor inside iframe content)
     - workspace-level window wheel handler (cursor over floating UI)
     React Flow handles wheel over its own pane natively.

     Deltas are ACCUMULATED and applied once per animation frame. Trackpads
     fire wheel events far faster than 60Hz (and the iframe postMessage path
     can deliver several per frame); applying each one individually caused a
     React Flow viewport update per event — the source of the pan/zoom jank. */
  const wheelPendingRef = useRef<{
    dx: number; dy: number; zoomDy: number; clientX: number; clientY: number;
  } | null>(null);
  const wheelRafRef = useRef<number | null>(null);

  const applyWheel = useCallback((w: WheelInput) => {
    const pend = wheelPendingRef.current ?? { dx: 0, dy: 0, zoomDy: 0, clientX: w.clientX, clientY: w.clientY };
    if (w.ctrlKey || w.metaKey) pend.zoomDy += w.deltaY;
    else { pend.dx += w.deltaX; pend.dy += w.deltaY; }
    pend.clientX = w.clientX;
    pend.clientY = w.clientY;
    wheelPendingRef.current = pend;

    if (wheelRafRef.current !== null) return;
    wheelRafRef.current = requestAnimationFrame(() => {
      wheelRafRef.current = null;
      const p = wheelPendingRef.current;
      wheelPendingRef.current = null;
      if (!p) return;

      const v = getViewport();
      let { x, y, zoom } = v;
      if (p.zoomDy !== 0) {
        // Cursor-anchored zoom. exp() keeps trackpad pinch (many small deltas)
        // and ctrl+wheel (~100/tick) equally smooth.
        const factor = Math.exp(-p.zoomDy * 0.01);
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
        const k = nextZoom / zoom;
        x = p.clientX - (p.clientX - x) * k;
        y = p.clientY - (p.clientY - y) * k;
        zoom = nextZoom;
      }
      x -= p.dx * PAN_ON_SCROLL_SPEED;
      y -= p.dy * PAN_ON_SCROLL_SPEED;
      setViewport({ x, y, zoom });
    });
  }, [getViewport, setViewport]);

  // Cancel any pending wheel frame on unmount
  useEffect(() => () => {
    if (wheelRafRef.current !== null) cancelAnimationFrame(wheelRafRef.current);
  }, []);

  // Expose for workspace-level wheel handler
  useEffect(() => {
    if (!applyWheelRef) return;
    applyWheelRef.current = applyWheel;
    return () => { if (applyWheelRef) applyWheelRef.current = null; };
  }, [applyWheel, applyWheelRef]);

  /* IFRAME_WHEEL — bridge forwards wheel events from inside iframes. Convert
     iframe-relative cursor coords to page-relative, then apply. */
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== "IFRAME_WHEEL") return;
      const sourceIframe = Array.from(iframeMapRef.current.values()).find(
        (f) => f.contentWindow === e.source
      );
      if (!sourceIframe) return;

      const rect = sourceIframe.getBoundingClientRect();
      applyWheel({
        deltaX: (e.data.deltaX ?? 0) as number,
        deltaY: (e.data.deltaY ?? 0) as number,
        ctrlKey: !!e.data.ctrlKey,
        metaKey: !!e.data.metaKey,
        clientX: rect.left + (e.data.clientX ?? 0),
        clientY: rect.top + (e.data.clientY ?? 0),
      });
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [applyWheel]);

  const handleElementSelected = useCallback(
    (screenId: string, element: SelectedElement | null) => {
      // The bridge re-describes the selection after every edit; dispatching
      // SET_ACTIVE_SCREEN unconditionally would reset the undo-coalescing key
      // mid-drag and spam the undo stack with per-frame entries.
      if (screenId !== activeScreenId) {
        dispatch({ type: "SET_ACTIVE_SCREEN", id: screenId });
      }
      dispatch({ type: "SELECT_ELEMENT", element });
      if (element) onIframeRef(iframeMapRef.current.get(screenId) ?? null);
    },
    [dispatch, onIframeRef, activeScreenId]
  );

  const handleHtmlUpdated = useCallback(
    (screenId: string, html: string, editKey?: string | null) => {
      dispatch({
        type: "UPDATE_SCREEN_HTML",
        screenId,
        html,
        pushUndo: true,
        editKey: editKey ?? `${screenId}:edit`,
      });
    },
    [dispatch]
  );

  const handleIframeMount = useCallback((screenId: string, el: HTMLIFrameElement | null) => {
    if (el) iframeMapRef.current.set(screenId, el);
    else iframeMapRef.current.delete(screenId);
  }, []);

  const handleContentHeight = useCallback((screenId: string, height: number) => {
    // Ignore non-positive or absurd heights. A misbehaving screen (e.g. a
    // min-h-screen ↔ iframe-height feedback loop) could otherwise report a
    // runaway height that balloons the node and paints over the whole canvas.
    if (!(height > 0) || height > 40000) return;
    setContentHeights((prev) => {
      const existing = prev.get(screenId);
      if (existing && Math.abs(existing - height) < 10) return prev;
      const next = new Map(prev);
      next.set(screenId, height);
      return next;
    });
  }, []);

  /* Map screens → React Flow nodes */
  const nodes: ScreenNode[] = useMemo(() => {
    const rowMaxH: number[] = [];
    for (let i = 0; i < app.screens.length; i++) {
      const row = Math.floor(i / GRID_COLS);
      const ch = contentHeights.get(app.screens[i].id);
      const h = ch && ch > 0 ? ch : CANVAS_H;
      rowMaxH[row] = Math.max(rowMaxH[row] ?? 0, h);
    }

    const rowY: number[] = [0];
    for (let r = 1; r <= rowMaxH.length; r++) {
      rowY[r] = rowY[r - 1] + (rowMaxH[r - 1] ?? CANVAS_H) + CARD_GAP + LABEL_H;
    }

    const result: ScreenNode[] = app.screens.map((screen, i) => {
      const row = Math.floor(i / GRID_COLS);
      const col = i % GRID_COLS;
      const ch = contentHeights.get(screen.id);
      const screenH = ch && ch > 0 ? ch : CANVAS_H;

      return {
        id: screen.id,
        type: "screen" as const,
        position: {
          x: col * (CANVAS_W + CARD_GAP),
          y: rowY[row],
        },
        data: {
          screenName: screen.name,
          html: screen.html,
          isStreaming: screen.isStreaming ?? false,
          streamChunksRef: streamChunks,
          streamTick: 0,
          isActive: screen.id === activeScreenId,
          isSkeleton: false,
          vpW: CANVAS_W,
          vpH: CANVAS_H,
          contentHeight: ch ?? 0,
          onElementSelected: (el) => handleElementSelected(screen.id, el),
          onHtmlUpdated: (html, editKey) => handleHtmlUpdated(screen.id, html, editKey),
          onIframeMount: (el) => handleIframeMount(screen.id, el),
          onContentHeight: (h) => handleContentHeight(screen.id, h),
        },
        style: {
          background: "transparent", border: "none", padding: 0, width: CANVAS_W, height: screenH + LABEL_H,
          // During streaming, let pointer events pass through to the canvas so pan/zoom works
          pointerEvents: (screen.isStreaming ? "none" : undefined) as React.CSSProperties["pointerEvents"],
        },
        selected: false,
        draggable: false,
        connectable: false,
      };
    });

    // Show skeleton for next screen when generating and at least one screen exists already
    const anyStreaming = app.screens.some((s) => s.isStreaming);
    if (isGenerating && !anyStreaming && app.screens.length > 0) {
      const i = app.screens.length;
      const row = Math.floor(i / GRID_COLS);
      const col = i % GRID_COLS;
      result.push({
        id: "__skeleton__",
        type: "screen" as const,
        position: {
          x: col * (CANVAS_W + CARD_GAP),
          y: rowY[row] ?? 0,
        },
        data: {
          screenName: "", html: "", isStreaming: false, streamChunksRef: streamChunks, streamTick: 0,
          isActive: false, isSkeleton: true, vpW: CANVAS_W, vpH: CANVAS_H, contentHeight: CANVAS_H, genStep,
          onElementSelected: () => { }, onHtmlUpdated: () => { }, onIframeMount: () => { },
          onContentHeight: () => { },
        },
        style: { background: "transparent", border: "none", padding: 0, width: CANVAS_W, height: CANVAS_H + LABEL_H, pointerEvents: "none" as const },
        selected: false, draggable: false, connectable: false,
      });
    }
    return result;
  }, [app.screens, activeScreenId, streamChunks, isGenerating, genStep, contentHeights, handleElementSelected, handleHtmlUpdated, handleIframeMount, handleContentHeight, CANVAS_H, CANVAS_W]);

  // Update specific streaming nodes when streamTick changes, without re-evaluating the whole nodes array
  useEffect(() => {
    app.screens.forEach((screen) => {
      if (screen.isStreaming) {
        updateNodeData(screen.id, { streamTick });
      }
    });
  }, [streamTick, app.screens, updateNodeData]);

  /* Auto-fit policy:
       - Fit ONCE when the very first screen appears (so user sees content).
       - Fit ONCE when generation finishes (so all screens visible).
     We deliberately do NOT fit on every new screen — that was causing the
     camera to lurch away from screens still being streamed, making earlier
     completed screens appear to "disappear" during generation. */
  const didFitFirstRef = useRef(false);
  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    const count = app.screens.length;

    if (count === 0) {
      didFitFirstRef.current = false;
      wasGeneratingRef.current = isGenerating;
      return;
    }

    const justFinished = wasGeneratingRef.current && !isGenerating;
    wasGeneratingRef.current = isGenerating;

    const shouldFitFirst = !didFitFirstRef.current;
    if (!shouldFitFirst && !justFinished) return;
    if (shouldFitFirst) didFitFirstRef.current = true;

    const delay = justFinished ? 400 : 220;
    const t = setTimeout(() => {
      try { fitView({ padding: 0.15, duration: 500 }); } catch { /* unmounted */ }
    }, delay);
    return () => clearTimeout(t);
  }, [app.screens.length, isGenerating, fitView]);

  /* Refit ONCE shortly after mount when iframe heights settle. Avoids the
     "screens jump after load" problem on initial workspace open while never
     fighting with the user's panning later. Disabled during generation. */
  const didMountFitRef = useRef(false);
  useEffect(() => {
    if (isGenerating) return;
    if (didMountFitRef.current) return;
    if (app.screens.length === 0) return;
    // Wait for at least one content height to come in before fitting
    const anyHeight = app.screens.some((s) => contentHeights.get(s.id));
    if (!anyHeight) return;
    didMountFitRef.current = true;
    const t = setTimeout(() => {
      try { fitView({ padding: 0.15, duration: 400 }); } catch { /* unmounted */ }
    }, 400);
    return () => clearTimeout(t);
  }, [contentHeights, app.screens, isGenerating, fitView]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
    >
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        onNodeClick={(_, node) => {
          if (node.id !== "__skeleton__") dispatch({ type: "SET_ACTIVE_SCREEN", id: node.id });
        }}
        onPaneClick={() => {
          dispatch({ type: "SELECT_ELEMENT", element: null });
        }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        defaultViewport={{ x: 60, y: 40, zoom: CANVAS_W <= 500 ? 0.75 : CANVAS_W <= 1024 ? 0.4 : 0.3 }}
        zoomOnScroll={false}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        panOnScroll={true}
        panOnScrollSpeed={PAN_ON_SCROLL_SPEED}
        panOnScrollMode={PanOnScrollMode.Free}
        colorMode={colorMode}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#ededed" }}
      >
        <Controls showInteractive={false} style={{ display: 'none' }} />
      </ReactFlow>

      {/* Bottom-center zoom / fit control bar */}
      {app.screens.length > 0 && (
        <ZoomBar onFit={() => { try { fitView({ padding: 0.15, duration: 400 }); } catch { /* unmounted */ } }} />
      )}

      {/* Generating overlay — shown when generating and no screens yet */}
      {isGenerating && app.screens.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="wf-soft-shell pointer-events-auto relative max-w-md overflow-hidden rounded-[1.65rem] px-14 pb-10 pt-12 text-center">
            <div className="relative mx-auto mb-6 h-[180px] w-[260px]">
              <GeneratingCard label="" />
            </div>
            <div className="wf-shimmer-text text-[13px] font-medium tracking-[-0.01em]">
              {genStep || "Starting generation"}
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground/70">
              Designing your app — this usually takes 30–60 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {!isGenerating && app.screens.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="wf-soft-shell pointer-events-auto max-w-sm rounded-[1.65rem] px-10 py-8 text-center">
            <div className="text-sm font-medium text-foreground/85">
              {genStep?.startsWith("Error:") ? genStep : "No screens yet"}
            </div>
            {genStep?.startsWith("Error:") && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Use the Regenerate button to try again.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Public export (wraps with provider) ── */
export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export type FitViewHandle = (() => void) | null;
