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

/* ── PNG export helper ── */
async function exportScreenPng(html: string, vpW: number, screenName: string) {
  const slug = screenName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Create a hidden iframe to render the HTML at full resolution
  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${vpW}px;height:100vh;border:none;opacity:0;pointer-events:none;`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = html;
    });

    // Wait for images / fonts to settle
    await new Promise((r) => setTimeout(r, 500));

    const doc = iframe.contentDocument;
    if (!doc?.body) throw new Error("Failed to render screen");

    // Measure actual content height
    const contentH = doc.documentElement.scrollHeight;
    iframe.style.height = `${contentH}px`;
    await new Promise((r) => setTimeout(r, 100));

    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(doc.documentElement, {
      width: vpW,
      height: contentH,
      pixelRatio: 2,
      cacheBust: true,
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slug}.png`;
    a.click();
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
  onHtmlUpdated: (html: string) => void;
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
            title="Export PNG"
            onClick={async (e) => {
              e.stopPropagation();
              if (exporting) return;
              setExporting(true);
              try { await exportScreenPng(data.html, vpW, data.screenName); }
              catch (err) { console.error("PNG export failed:", err); }
              finally { setExporting(false); }
            }}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
              background: exporting ? C.borderSub : "transparent",
              color: C.text4, transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.borderSub; e.currentTarget.style.color = C.text2; }}
            onMouseLeave={(e) => { if (!exporting) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.text4; } }}
          >
            {exporting ? (
              <span style={{ width: 12, height: 12, border: `2px solid ${C.text4}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "wfPulse 0.8s linear infinite" }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13" /><path d="M8 12l4 4 4-4" /><path d="M20 19H4" />
              </svg>
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
        {/* Shimmer overlay while waiting for content */}
        {data.isStreaming && data.streamChunks.length === 0 && !data.html && (
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

/* ── Props ── */
interface CanvasProps {
  streamChunks: Map<string, string[]>;
  streamTick: number;
  onIframeRef: (el: HTMLIFrameElement | null) => void;
}

/* ── Inner canvas (inside ReactFlowProvider) ── */
function CanvasInner({ streamChunks, streamTick, onIframeRef }: CanvasProps) {
  const { state, dispatch } = useWorkspace();
  const { app, isGenerating, genStep, activeScreenId } = state;
  const { theme } = useTheme();
  const { fitView } = useReactFlow();
  const iframeMapRef = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const [contentHeights, setContentHeights] = useState<Map<string, number>>(new Map());

  const vp = VIEWPORTS[app.platform ?? "web"];
  const CANVAS_W = vp.w;
  const CANVAS_H = vp.h;

  /* React Flow colorMode from app theme */
  const colorMode: ColorMode = theme === "dark" ? "dark" : "light";

  /* Push live CSS variable updates to all iframes when design system changes */
  const prevDsRef = useRef(app.designSystem);
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
  }, [app.designSystem]);

  /* Forward IFRAME_WHEEL messages to React Flow for canvas pan/zoom */
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== "IFRAME_WHEEL") return;
      const sourceIframe = Array.from(iframeMapRef.current.values()).find(
        (f) => f.contentWindow === e.source
      );
      if (!sourceIframe) return;

      const flowRoot = sourceIframe.closest(".react-flow");
      const target = flowRoot?.querySelector<HTMLElement>(".react-flow__renderer");
      if (!target) return;

      const rect = sourceIframe.getBoundingClientRect();
      target.dispatchEvent(new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaX: e.data.deltaX ?? 0,
        deltaY: e.data.deltaY ?? 0,
        deltaMode: e.data.deltaMode ?? 0,
        shiftKey: e.data.shiftKey,
        ctrlKey: e.data.ctrlKey,
        altKey: e.data.altKey,
        metaKey: e.data.metaKey,
        clientX: rect.left + (e.data.clientX ?? 0),
        clientY: rect.top + (e.data.clientY ?? 0),
      }));
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleElementSelected = useCallback(
    (screenId: string, element: SelectedElement | null) => {
      dispatch({ type: "SET_ACTIVE_SCREEN", id: screenId });
      dispatch({ type: "SELECT_ELEMENT", element });
      if (element) onIframeRef(iframeMapRef.current.get(screenId) ?? null);
    },
    [dispatch, onIframeRef]
  );

  const handleHtmlUpdated = useCallback(
    (screenId: string, html: string) => {
      dispatch({ type: "UPDATE_SCREEN_HTML", screenId, html, pushUndo: true });
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
          onHtmlUpdated: (html) => handleHtmlUpdated(screen.id, html),
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

  /* Auto-fit when screens first fully load */
  const didFit = useRef(false);
  useEffect(() => {
    if (app.screens.length === 0) didFit.current = false;
  }, [app.screens.length]);

  const fitThreshold = CANVAS_W <= 500 ? 2 : 3;
  useEffect(() => {
    if (!didFit.current && app.screens.length >= fitThreshold && !isGenerating) {
      didFit.current = true;
      setTimeout(() => fitView({ padding: 0.12, duration: 500 }), 100);
    }
  }, [app.screens.length, isGenerating, fitView, fitThreshold]);

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
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <div style={{
            textAlign: "center", padding: "48px 56px", borderRadius: 24, maxWidth: 420,
            background: "color-mix(in oklch, var(--card) 85%, transparent)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            boxShadow: "var(--shadow-card)",
          }}>
            {/* Animated dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: C.wsAccent,
                  animation: `wfPulse 1.4s ease ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 15, color: C.text2, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.01em" }}>
              {genStep || "Starting generation..."}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: C.text4, lineHeight: 1.5 }}>
              Designing your app — this usually takes 30–60 seconds
            </div>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {!isGenerating && app.screens.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            textAlign: "center", padding: "36px 44px", borderRadius: 20,
            background: "color-mix(in oklch, var(--card) 80%, transparent)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            boxShadow: "var(--shadow-card)",
          }}>
            <div style={{ fontFamily: SANS, fontSize: 16, color: C.text3, marginBottom: 6, fontWeight: 500 }}>
              {genStep?.startsWith("Error:") ? genStep : "No screens yet"}
            </div>
            {genStep?.startsWith("Error:") && (
              <p style={{ fontFamily: SANS, fontSize: 12, color: C.text4, marginTop: 4 }}>
                Use the Regenerate button in the toolbar to try again
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
