"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
  NodeToolbar,
  PanOnScrollMode,
  Position,
  useReactFlow,
  useViewport,
  useNodesState,
  type Node,
  type NodeProps,
  type ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspace } from "@/lib/store/use-workspace";
import { LiveIframe } from "./LiveIframe";
import type { IframeWheelInput } from "./LiveIframe";
import { SANS, C, VIEWPORTS } from "@/lib/constants";
import { exportScreenPng } from "@/lib/export-screen-png";
import type { SelectedElement } from "@/lib/store/use-workspace";

const GRID_COLS = 3;
const CARD_GAP = 72;
const LABEL_H = 38;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const PAN_ON_SCROLL_SPEED = 0.8;

/* Stable empty-edges reference. Passing an inline `edges={[]}` makes React
   Flow's StoreUpdater call setEdges on every render (new array reference). */
const NO_EDGES: never[] = [];

/* ── Card shadow tokens — adapt per theme ── */
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
  onCanvasWheel: (event: IframeWheelInput) => void;
};

type ScreenNode = Node<ScreenNodeData, "screen">;

/* ── Custom node ── */
function ScreenNodeComponent({ id, data }: NodeProps<ScreenNode>) {
  const { vpW, vpH, contentHeight } = data;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // Use actual content height when available; fall back to viewport height only during streaming or before report
  const displayH = contentHeight > 0 ? contentHeight : vpH;

  if (data.isSkeleton) {
    return (
      <div style={{ width: vpW, display: "flex", flexDirection: "column", gap: 10, contain: "layout style paint" }}>
        <div style={{ height: 18, width: 132, background: "var(--canvas-node-label)", borderRadius: 4 }} />
        <div style={{
          width: vpW, height: vpH, background: "var(--card)", borderRadius: 16,
          boxShadow: SHADOW_SKELETON, position: "relative", overflow: "hidden",
        }}>
          <GeneratingCard label={data.genStep || "Preparing…"} sublabel="This may take a moment" />
        </div>
      </div>
    );
  }

  return (
    <div className="group/screen" style={{ width: vpW, contain: "layout style paint" }}>
      {/* React Flow's NodeToolbar is rendered outside the zoomed viewport
          transform, so this screen chrome stays legible at fit-view zooms. */}
      <NodeToolbar
        isVisible
        position={Position.Top}
        align="start"
        offset={12}
        className="wf-screen-toolbar nodrag nopan pointer-events-auto"
      >
        <div className="wf-screen-label flex h-9 items-center gap-2.5 px-1">
          <span
            className={`size-2 shrink-0 rounded-full ${data.isActive ? "bg-ws-accent" : "bg-foreground/30"}`}
          />
          <span style={{
            fontFamily: SANS, fontSize: 14, userSelect: "none", letterSpacing: "-0.015em",
            color: data.isActive ? "var(--foreground)" : "var(--muted-foreground)",
            fontWeight: 650,
          }}>
            {data.screenName}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground/75">
            {vpW} × {Math.round(displayH)}
          </span>
          {data.isStreaming && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ws-accent">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.wsAccent, display: "inline-block", animation: "wfPulse 1.4s ease infinite" }} />
              Live
            </span>
          )}
        </div>
      </NodeToolbar>

      {!data.isStreaming && data.html && (
        <NodeToolbar
          isVisible
          position={Position.Top}
          align="end"
          offset={12}
          className="wf-screen-toolbar nodrag nopan pointer-events-auto"
        >
          <button
            aria-label={exportError ? "Retry PNG export" : "Export screen as PNG"}
            title={
              exporting
                ? "Exporting..."
                : exportError || "Export as PNG"
            }
            disabled={exporting}
            onClick={async (e) => {
              e.stopPropagation();
              if (exporting) return;
              setExporting(true);
              setExportError(null);
              try {
                await exportScreenPng(data.html, vpW, data.screenName);
              } catch (err) {
                setExportError("PNG export failed. Click to try again.");
                console.warn("[export-png]", err);
              } finally {
                setExporting(false);
              }
            }}
            className={`group/exp inline-flex h-9 items-center gap-2 rounded-xl px-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.055em] shadow-[0_2px_7px_rgba(25,27,23,0.09),0_14px_34px_-22px_rgba(25,27,23,0.5)] transition-[color,background-color,box-shadow,transform] hover:-translate-y-px hover:shadow-[0_3px_9px_rgba(25,27,23,0.12),0_18px_38px_-22px_rgba(25,27,23,0.58)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-accent/35 disabled:cursor-default disabled:opacity-60 ${
              exportError ? "bg-destructive/10 text-destructive" : "bg-card text-foreground/75 hover:text-foreground"
            }`}
          >
            {exporting ? (
              <>
                <span className="inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-foreground/30 border-t-foreground" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                {/* Image-export icon: picture frame with download arrow */}
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1.5" y="2" width="13" height="9.5" rx="2" />
                  <circle cx="5" cy="5.5" r="1" fill="currentColor" stroke="none" />
                  <path d="M14.5 8.5l-3-2.5-5 4.5" />
                  <path d="M8 14v-2" />
                  <path d="M6 13l2 2 2-2" />
                </svg>
                <span>{exportError ? "Retry export" : "Export"}</span>
              </>
            )}
          </button>
        </NodeToolbar>
      )}

      {/* Iframe card.
          Clipping (overflow:hidden + contain:paint) stays so a streaming
          screen never paints outside its box. The translateZ(0) promotion was
          removed: a force-promoted layer caches its raster at the scale it was
          painted at, so iframe content stayed blurry after zooming in. Without
          the explicit promotion Chrome re-rasterizes at the effective scale —
          crisp screens at every zoom level. */}
      <div
        className="wf-screen-frame"
        data-active={data.isActive && !data.isStreaming ? "true" : "false"}
        style={{
        borderRadius: 16, overflow: "hidden", position: "relative",
        pointerEvents: data.isStreaming ? "none" : data.isActive ? "auto" : "none",
        contain: "layout style paint",
      }}
      >
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
          onCanvasWheel={data.onCanvasWheel}
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
  deltaMode?: number;
  shiftKey?: boolean;
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
    "flex size-8 items-center justify-center rounded-full text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground";

  return (
    <div className="wf-canvas-zoom pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-[18px] border px-1.5 py-1.5">
      <button onClick={() => zoomOut({ duration: 200 })} title="Zoom out" className={btn}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <button
        onClick={onFit}
        title="Fit view"
        className="min-w-[56px] rounded-xl px-1.5 py-1 text-center text-[12px] font-medium tabular-nums text-foreground/65 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        {pct}%
      </button>
      <button onClick={() => zoomIn({ duration: 200 })} title="Zoom in" className={btn}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <span className="mx-0.5 h-4 w-px bg-foreground/10" />
      <button onClick={onFit} title="Fit to screen" className={btn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
        </svg>
      </button>
    </div>
  );
}

/* ── Viewport → CSS vars + zoom flag (Banani-style smooth zoom) ──
   Publishes the live camera zoom as `--canvas-zoom` / `--inverse-zoom` on the
   canvas wrapper, and flags `data-canvas-zooming` while a ZOOM gesture is
   active (cleared ~160ms after the last zoom step). Workspace CSS uses the flag
   to promote node layers to the GPU during the gesture — the transform then
   composites without re-rasterizing every iframe each frame, and re-rasterizes
   once (crisp) when it settles. --inverse-zoom lets chrome (labels/handles)
   stay a constant on-screen size. Isolated leaf: the per-frame `useViewport`
   re-render lands here (returns null), never on the heavy node tree; all writes
   are imperative. */
function ViewportVars({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const { zoom } = useViewport();
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    el.style.setProperty("--canvas-zoom", String(zoom));
    el.style.setProperty("--inverse-zoom", String(1 / zoom));
    el.setAttribute("data-canvas-zooming", "true");
    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => {
      targetRef.current?.removeAttribute("data-canvas-zooming");
    }, 160);
    return () => { if (clearRef.current) clearTimeout(clearRef.current); };
  }, [zoom, targetRef]);
  return null;
}

/* ── Inner canvas (inside ReactFlowProvider) ── */
function CanvasInner({ streamChunks, streamTick, onIframeRef, fitViewRef, applyWheelRef, focusScreenRef }: CanvasProps) {
  const { state, dispatch } = useWorkspace();
  const { app, isGenerating, genStep, activeScreenId } = state;
  const { fitView, setViewport, getViewport, screenToFlowPosition, updateNodeData } = useReactFlow();
  const iframeMapRef = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  /* React Flow-compatible wheel handling for events that cannot reach its
     ZoomPane directly. Called by:
     - iframe bridge postMessage forwarder (cursor inside iframe content)
     - workspace-level window wheel handler (cursor over floating UI)
     React Flow handles wheel over its own pane natively.

     Deltas are accumulated and applied once per animation frame. The zoom
     curve and delta-mode normalization mirror React Flow's XYPanZoom wheel
     handlers, while screenToFlowPosition keeps the flow coordinate beneath
     the cursor fixed when the event originated inside an iframe. */
  const wheelPendingRef = useRef<{
    dx: number; dy: number; zoomDelta: number; clientX: number; clientY: number;
  } | null>(null);
  const wheelRafRef = useRef<number | null>(null);

  const applyWheel = useCallback((w: WheelInput) => {
    const pend = wheelPendingRef.current ?? {
      dx: 0,
      dy: 0,
      zoomDelta: 0,
      clientX: w.clientX,
      clientY: w.clientY,
    };
    const isZoomGesture = w.ctrlKey || w.metaKey;

    if (isZoomGesture) {
      // Keep external wheel input on the same curve React Flow uses internally:
      // https://github.com/xyflow/xyflow/blob/main/packages/system/src/xypanzoom/utils.ts
      const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
      const pinchFactor = w.ctrlKey && isMac ? 10 : 1;
      const deltaModeFactor = w.deltaMode === 1 ? 0.05 : w.deltaMode ? 1 : 0.002;
      pend.zoomDelta += -w.deltaY * deltaModeFactor * pinchFactor;
    } else {
      // Match React Flow's Firefox line-mode normalization and Windows
      // shift+wheel horizontal panning behavior.
      const deltaNormalize = w.deltaMode === 1 ? 20 : 1;
      const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
      if (!isMac && w.shiftKey) {
        pend.dx += w.deltaY * deltaNormalize;
      } else {
        pend.dx += w.deltaX * deltaNormalize;
        pend.dy += w.deltaY * deltaNormalize;
      }
    }
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
      if (p.zoomDelta !== 0) {
        const cursorFlowPosition = screenToFlowPosition({
          x: p.clientX,
          y: p.clientY,
        });
        const nextZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, zoom * Math.pow(2, p.zoomDelta))
        );

        // x/y are relative to the React Flow pane, while clientX/clientY are
        // page coordinates. Anchoring with a flow-space point avoids mixing
        // those coordinate systems and keeps the cursor over the same pixel.
        x += cursorFlowPosition.x * (zoom - nextZoom);
        y += cursorFlowPosition.y * (zoom - nextZoom);
        zoom = nextZoom;
      }
      x -= p.dx * PAN_ON_SCROLL_SPEED;
      y -= p.dy * PAN_ON_SCROLL_SPEED;
      setViewport({ x, y, zoom });
    });
  }, [getViewport, screenToFlowPosition, setViewport]);

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

  // Read activeScreenId through a ref so this callback stays referentially
  // stable — the node reconciler reuses node objects, and stable callbacks let
  // unchanged iframe nodes keep their data reference (no re-render).
  const activeScreenIdRef = useRef(activeScreenId);
  useEffect(() => { activeScreenIdRef.current = activeScreenId; }, [activeScreenId]);

  const handleElementSelected = useCallback(
    (screenId: string, element: SelectedElement | null) => {
      // The bridge re-describes the selection after every edit; dispatching
      // SET_ACTIVE_SCREEN unconditionally would reset the undo-coalescing key
      // mid-drag and spam the undo stack with per-frame entries.
      if (screenId !== activeScreenIdRef.current) {
        dispatch({ type: "SET_ACTIVE_SCREEN", id: screenId });
      }
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

  /* React Flow owns node state (controlled via useNodesState + onNodesChange).
     A reconciling effect syncs app.screens → nodes and REUSES unchanged node
     objects, so (a) heavy iframe nodes don't re-render when an unrelated
     screen's height changes and (b) imperative updateNodeData(streamTick) is
     never clobbered — React Flow's StoreUpdater resets the store to the
     `nodes` prop whenever its reference changes, which the old per-render
     useMemo triggered constantly. */
  const [nodes, setNodes, onNodesChange] = useNodesState<ScreenNode>([]);

  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));

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

      const next: ScreenNode[] = app.screens.map((screen, i) => {
        const row = Math.floor(i / GRID_COLS);
        const col = i % GRID_COLS;
        const ch = contentHeights.get(screen.id);
        const screenH = ch && ch > 0 ? ch : CANVAS_H;
        const x = col * (CANVAS_W + CARD_GAP);
        const y = rowY[row];
        const isActive = screen.id === activeScreenId;
        const isStreaming = screen.isStreaming ?? false;
        const contentHeight = ch ?? 0;

        // Reuse the existing node (its reference, data, and live streamTick)
        // when nothing app-derived changed — avoids re-rendering the iframe.
        const existing = prevById.get(screen.id);
        if (
          existing &&
          !existing.data.isSkeleton &&
          existing.position.x === x &&
          existing.position.y === y &&
          existing.data.screenName === screen.name &&
          existing.data.html === screen.html &&
          existing.data.isStreaming === isStreaming &&
          existing.data.isActive === isActive &&
          existing.data.contentHeight === contentHeight
        ) {
          return existing;
        }

        return {
          id: screen.id,
          type: "screen" as const,
          position: { x, y },
          data: {
            screenName: screen.name,
            html: screen.html,
            isStreaming,
            streamChunksRef: streamChunks,
            streamTick: existing?.data.streamTick ?? 0,
            isActive,
            isSkeleton: false,
            vpW: CANVAS_W,
            vpH: CANVAS_H,
            contentHeight,
            onElementSelected: (el) => handleElementSelected(screen.id, el),
            onHtmlUpdated: (html, editKey) => handleHtmlUpdated(screen.id, html, editKey),
            onIframeMount: (el) => handleIframeMount(screen.id, el),
            onContentHeight: (h) => handleContentHeight(screen.id, h),
            onCanvasWheel: applyWheel,
          },
          style: {
            background: "transparent", border: "none", padding: 0, width: CANVAS_W, height: screenH,
            // During streaming, let pointer events pass through to the canvas so pan/zoom works
            pointerEvents: (isStreaming ? "none" : undefined) as React.CSSProperties["pointerEvents"],
          },
          draggable: false,
          connectable: false,
        };
      });

      // Skeleton for the next screen while generating (once ≥1 screen exists).
      const anyStreaming = app.screens.some((s) => s.isStreaming);
      if (isGenerating && !anyStreaming && app.screens.length > 0) {
        const i = app.screens.length;
        const row = Math.floor(i / GRID_COLS);
        const col = i % GRID_COLS;
        const y = rowY[row] ?? 0;
        const existing = prevById.get("__skeleton__");
        if (existing && existing.data.genStep === genStep && existing.position.y === y) {
          next.push(existing);
        } else {
          next.push({
            id: "__skeleton__",
            type: "screen" as const,
            position: { x: col * (CANVAS_W + CARD_GAP), y },
            data: {
              screenName: "", html: "", isStreaming: false, streamChunksRef: streamChunks, streamTick: 0,
              isActive: false, isSkeleton: true, vpW: CANVAS_W, vpH: CANVAS_H, contentHeight: CANVAS_H, genStep,
              onElementSelected: () => { }, onHtmlUpdated: () => { }, onIframeMount: () => { },
              onContentHeight: () => { }, onCanvasWheel: () => { },
            },
            style: { background: "transparent", border: "none", padding: 0, width: CANVAS_W, height: CANVAS_H + LABEL_H, pointerEvents: "none" as const },
            draggable: false, connectable: false,
          });
        }
      }

      return next;
    });
  }, [app.screens, activeScreenId, streamChunks, isGenerating, genStep, contentHeights, handleElementSelected, handleHtmlUpdated, handleIframeMount, handleContentHeight, applyWheel, CANVAS_H, CANVAS_W, setNodes]);

  // Bump only the streaming nodes when a new chunk arrives — flows through
  // React Flow's own state (no prop clobber now that nodes are RF-owned).
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
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden"
    >
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={NO_EDGES}
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
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={0.7}
          color="var(--canvas-dot)"
        />
        <Controls showInteractive={false} style={{ display: 'none' }} />
      </ReactFlow>

      {/* Publishes zoom CSS vars + the data-canvas-zooming flag (smooth zoom) */}
      <ViewportVars targetRef={wrapperRef} />

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
