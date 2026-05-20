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
  type Node,
  type NodeProps,
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspace } from "@/lib/store/use-workspace";
import { useTheme } from "@/components/ThemeProvider";
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

/* ── Node data type ── */
type ScreenNodeData = {
  screenName: string;
  html: string;
  isStreaming: boolean;
  streamChunks: string[];
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
          boxShadow: SHADOW_SKELETON,
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.wsAccent, animation: "wfPulse 1.4s ease infinite" }} />
          <span style={{ fontFamily: SANS, fontSize: 13, color: C.text2, fontWeight: 500, letterSpacing: "-0.01em" }}>{data.genStep || "Preparing..."}</span>
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.text4 }}>This may take a moment</span>
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

      {/* Iframe card */}
      <div style={{
        borderRadius: 16, overflow: "hidden", position: "relative",
        pointerEvents: data.isStreaming ? "none" : data.isActive ? "auto" : "none",
        outline: data.isActive && !data.isStreaming ? `2px dashed ${C.wsAccent}` : "none",
        outlineOffset: data.isActive ? 4 : 0,
        boxShadow: data.isActive ? SHADOW_CARD_ACTIVE : SHADOW_CARD,
        contain: "layout style paint",
        willChange: "transform",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}>
        <LiveIframe
          key={id}
          screenId={id}
          html={data.html}
          isStreaming={data.isStreaming}
          streamChunks={data.streamChunks}
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
          <div style={{
            position: "absolute", inset: 0, borderRadius: 16,
            background: "var(--card)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
          }}>
            {/* Shimmer skeleton blocks */}
            <div style={{ width: "80%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 12, padding: 24 }}>
              {/* Nav bar skeleton */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div className="sk" style={{ width: 28, height: 28, borderRadius: 8, background: "var(--muted)" }} />
                <div className="sk2" style={{ width: 80, height: 10, borderRadius: 5, background: "var(--muted)" }} />
                <div style={{ flex: 1 }} />
                <div className="sk3" style={{ width: 50, height: 10, borderRadius: 5, background: "var(--muted)" }} />
              </div>
              {/* Title skeleton */}
              <div className="sk" style={{ width: "60%", height: 14, borderRadius: 7, background: "var(--muted)" }} />
              <div className="sk2" style={{ width: "40%", height: 10, borderRadius: 5, background: "var(--muted)" }} />
              {/* Card skeletons */}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <div className="sk" style={{ flex: 1, height: 60, borderRadius: 10, background: "var(--muted)" }} />
                <div className="sk2" style={{ flex: 1, height: 60, borderRadius: 10, background: "var(--muted)" }} />
              </div>
              <div className="sk3" style={{ width: "100%", height: 40, borderRadius: 10, background: "var(--muted)" }} />
              <div style={{ display: "flex", gap: 10 }}>
                <div className="sk2" style={{ flex: 2, height: 80, borderRadius: 10, background: "var(--muted)" }} />
                <div className="sk" style={{ flex: 1, height: 80, borderRadius: 10, background: "var(--muted)" }} />
              </div>
            </div>
            {/* Status text */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.wsAccent, animation: "wfPulse 1.4s ease infinite" }} />
              <span style={{ fontFamily: SANS, fontSize: 12, color: C.text3, fontWeight: 500 }}>
                Generating...
              </span>
            </div>
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
  streamChunks: Map<string, string[]>;
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

/* ── Inner canvas (inside ReactFlowProvider) ── */
function CanvasInner({ streamChunks, streamTick, onIframeRef, fitViewRef, applyWheelRef, focusScreenRef }: CanvasProps) {
  const { state, dispatch } = useWorkspace();
  const { app, isGenerating, genStep, activeScreenId } = state;
  const { theme } = useTheme();
  const { fitView, setViewport, getViewport } = useReactFlow();
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

  /* React Flow colorMode from app theme */
  const colorMode: ColorMode = theme === "dark" ? "dark" : "light";

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
     React Flow handles wheel over its own pane natively. */
  const applyWheel = useCallback((w: WheelInput) => {
    const v = getViewport();
    if (w.ctrlKey || w.metaKey) {
      // Cursor-anchored zoom. Trackpad pinch fires small deltaY repeatedly;
      // mouse-wheel-with-ctrl fires deltaY of ~100 per tick. The exp() factor
      // gives smooth zoom in both cases.
      const factor = Math.exp(-w.deltaY * 0.01);
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor));
      const k = nextZoom / v.zoom;
      const nx = w.clientX - (w.clientX - v.x) * k;
      const ny = w.clientY - (w.clientY - v.y) * k;
      setViewport({ x: nx, y: ny, zoom: nextZoom });
    } else {
      setViewport({
        x: v.x - w.deltaX * PAN_ON_SCROLL_SPEED,
        y: v.y - w.deltaY * PAN_ON_SCROLL_SPEED,
        zoom: v.zoom,
      });
    }
  }, [getViewport, setViewport]);

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
      dispatch({ type: "SET_ACTIVE_SCREEN", id: screenId });
      dispatch({ type: "SELECT_ELEMENT", element });
      if (element) onIframeRef(iframeMapRef.current.get(screenId) ?? null);
    },
    [dispatch, onIframeRef]
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
          streamChunks: [...(streamChunks.get(screen.id) ?? [])],
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
          screenName: "", html: "", isStreaming: false, streamChunks: [],
          isActive: false, isSkeleton: true, vpW: CANVAS_W, vpH: CANVAS_H, contentHeight: CANVAS_H, genStep,
          onElementSelected: () => { }, onHtmlUpdated: () => { }, onIframeMount: () => { },
          onContentHeight: () => { },
        },
        style: { background: "transparent", border: "none", padding: 0, width: CANVAS_W, height: CANVAS_H + LABEL_H, pointerEvents: "none" as const },
        selected: false, draggable: false, connectable: false,
      });
    }
    return result;
  }, [app.screens, activeScreenId, streamChunks, streamTick, isGenerating, genStep, contentHeights, handleElementSelected, handleHtmlUpdated, handleIframeMount, handleContentHeight]);

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
    <div className="h-full w-full overflow-hidden">
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
        style={{ background: "var(--canvas-bg)" }}
      >
        <Background variant={BackgroundVariant.Dots} color={"var(--canvas-dot)"} gap={50} size={2} />
        <Controls showInteractive={false} style={{ display: 'none' }} />
      </ReactFlow>

      {/* Generating overlay — shown when generating and no screens yet */}
      {isGenerating && app.screens.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto max-w-md rounded-3xl border border-foreground/8 bg-card/85 px-14 py-12 text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="mb-5 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 rounded-full bg-[#0d99ff]"
                  style={{ animation: `wfPulse 1.4s ease ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {genStep || "Starting generation"}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground/70">
              Designing your app — this usually takes 30–60 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {!isGenerating && app.screens.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto max-w-sm rounded-3xl border border-foreground/8 bg-card/80 px-10 py-8 text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
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
