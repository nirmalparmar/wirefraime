"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { uuid } from "@/lib/store";
import { WorkspaceProvider, useWorkspace } from "@/lib/store/use-workspace";
import type { WireframeApp, DesignSystem, Platform, AgentStep } from "@/lib/types";

import { WorkspaceTopbar } from "@/components/workspace/WorkspaceTopbar";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";
import { Canvas, type WheelInput } from "@/components/workspace/Canvas";
import { PropertyPanel } from "@/components/workspace/PropertyPanel";
import { DesignSystemPanel } from "@/components/workspace/DesignSystemDialog";
import { CodeView } from "@/components/workspace/CodeView";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

/* ── Screen HTML loader with retry ──────────────────────────
   S3 occasionally returns 500 on transient failures; retry 2x with backoff. */
async function loadScreenHtmlWithRetry(
  projectId: string,
  screenId: string,
  attempt = 0
): Promise<string> {
  try {
    const res = await fetch(`/api/projects/${projectId}/screens/${screenId}/html`);
    if (res.ok) return await res.text();
    if (res.status >= 500 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return loadScreenHtmlWithRetry(projectId, screenId, attempt + 1);
    }
    console.warn(`[screen-html] ${screenId} → ${res.status}`);
    return "";
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return loadScreenHtmlWithRetry(projectId, screenId, attempt + 1);
    }
    console.error(`[screen-html] ${screenId} network error:`, err);
    return "";
  }
}

/* ── SSE stream consumer ─────────────────────────────────────
   Unified handler for the /api/generate stream — used by both the
   first attempt and the retry path. */
type GenerateHandlers = {
  step: (label: string, detail?: string) => void;
  designSystem: (ds: DesignSystem, platform: Platform) => void;
  screenPlan: (total: number) => void;
  screenStart: (id: string, name: string) => void;
  htmlChunk: (screenId: string, chunk: string) => void;
  screenDone: (screenId: string, html: string) => void;
  reasoning?: (screenId: string, text: string) => void;
};

async function consumeGenerateStream(
  res: Response,
  signal: AbortSignal | undefined,
  on: GenerateHandlers
): Promise<void> {
  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) return;
    const { done, value } = await reader.read();
    if (done) return;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      let data: Record<string, unknown>;
      try { data = JSON.parse(line.slice(6)); } catch { continue; }

      switch (data.event as string) {
        case "step":
          on.step(data.label as string, data.detail as string | undefined);
          break;
        case "design_system":
          on.designSystem(
            data.designSystem as DesignSystem,
            (data.platform as Platform) ?? "web"
          );
          break;
        case "screen_plan":
          on.screenPlan(
            (data.count as number) ?? (data.total as number) ?? 0
          );
          break;
        case "screen_start":
          on.screenStart(data.id as string, data.name as string);
          break;
        case "html_chunk":
          on.htmlChunk(data.screenId as string, data.chunk as string);
          break;
        case "screen_done":
          on.screenDone(data.screenId as string, data.html as string);
          break;
        case "reasoning":
          on.reasoning?.(data.screenId as string, data.text as string);
          break;
        case "error":
          throw new Error((data.message as string) || "Generation failed");
      }
    }
  }
}

/* --- Generation orchestration --- */

async function runGenerate(
  app: WireframeApp,
  dispatch: ReturnType<typeof useWorkspace>["dispatch"],
  streamChunksRef: React.MutableRefObject<Map<string, string[]>>,
  forceUpdate: () => void,
  signal?: AbortSignal
) {
  const agentMsgId = uuid();
  dispatch({
    type: "ADD_MESSAGE",
    message: { id: agentMsgId, role: "assistant", content: "", timestamp: Date.now(), agentSteps: [] },
  });
  dispatch({ type: "SET_GENERATING", isGenerating: true, genStep: "Analyzing your app..." });

  let currentStepId: string | null = null;
  let screenCount = 0;
  let totalScreens = 0;

  function addStep(label: string, detail?: string) {
    if (currentStepId) {
      dispatch({
        type: "UPDATE_AGENT_STEP",
        messageId: agentMsgId,
        stepId: currentStepId,
        updates: { status: "done" },
      });
    }
    currentStepId = uuid();
    dispatch({
      type: "ADD_AGENT_STEP",
      messageId: agentMsgId,
      step: { id: currentStepId, label, detail, status: "running", timestamp: Date.now() },
    });
  }

  function finalizeStep(updates: Partial<AgentStep>) {
    if (!currentStepId) return;
    dispatch({
      type: "UPDATE_AGENT_STEP",
      messageId: agentMsgId,
      stepId: currentStepId,
      updates,
    });
    currentStepId = null;
  }

  const handlers: GenerateHandlers = {
    step: (label, detail) => {
      dispatch({ type: "SET_GEN_STEP", genStep: label });
      addStep(label, detail);
    },
    designSystem: (ds, platform) => {
      dispatch({ type: "SET_DESIGN_SYSTEM", designSystem: ds, platform });
      finalizeStep({ status: "done", detail: "Colors, fonts, layout tokens" });
    },
    screenPlan: (count) => { totalScreens = count; },
    screenStart: (id, name) => {
      screenCount++;
      dispatch({ type: "SET_GEN_STEP", genStep: `Designing "${name}"...` });
      dispatch({
        type: "ADD_SCREEN",
        screen: { id, name, html: "", isStreaming: true },
      });
      streamChunksRef.current.set(id, []);
      addStep(
        `Generating "${name}"`,
        totalScreens > 0 ? `${screenCount}/${totalScreens}` : undefined
      );
    },
    htmlChunk: (screenId, chunk) => {
      const chunks = streamChunksRef.current.get(screenId);
      if (chunks) {
        chunks.push(chunk);
        forceUpdate();
      }
    },
    screenDone: (screenId, html) => {
      dispatch({ type: "UPDATE_SCREEN_HTML", screenId, html });
      dispatch({ type: "SET_SCREEN_STREAMING", screenId, isStreaming: false });
      streamChunksRef.current.delete(screenId);
      finalizeStep({ status: "done", screenId });
    },
    reasoning: (_screenId, text) => {
      if (!currentStepId) return;
      dispatch({
        type: "UPDATE_AGENT_STEP",
        messageId: agentMsgId,
        stepId: currentStepId,
        updates: { reasoning: text },
      });
    },
  };

  async function callGenerate(): Promise<Response> {
    let referenceImage: string | null = null;
    try {
      referenceImage = sessionStorage.getItem(`wf-ref-image-${app.id}`);
    } catch { /* ignore */ }

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: app.name,
        description: app.description,
        projectId: app.id,
        ...(referenceImage ? { image: referenceImage } : {}),
      }),
      signal,
    });

    // One-shot: clear the reference image so retries/regens don't reuse it unexpectedly.
    try { sessionStorage.removeItem(`wf-ref-image-${app.id}`); } catch { /* ignore */ }
    if (res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      throw Object.assign(
        new Error(errData.error ?? "Screen limit reached. Upgrade your plan to continue."),
        { quota: true }
      );
    }
    if (!res.ok) throw new Error("Generation failed");
    return res;
  }

  function publishSummary() {
    finalizeStep({ status: "done" });
    dispatch({
      type: "UPDATE_MESSAGE",
      id: agentMsgId,
      content: `Generated ${screenCount} screen${screenCount !== 1 ? "s" : ""} with a complete design system. Click any screen to start editing, or describe changes in the chat.`,
    });
  }

  try {
    addStep("Analyzing your app", `Planning design for "${app.name}"`);
    const res = await callGenerate();
    await consumeGenerateStream(res, signal, handlers);
    publishSummary();
  } catch (err) {
    if (signal?.aborted) return;
    console.error("Generate error:", err);
    const errMsg = err instanceof Error ? err.message : "Generation failed";

    finalizeStep({ status: "error", detail: errMsg });

    // Quota: show upgrade message, no retry
    if ((err as { quota?: boolean })?.quota === true) {
      dispatch({ type: "SET_GEN_STEP", genStep: "" });
      dispatch({
        type: "UPDATE_MESSAGE",
        id: agentMsgId,
        content: `${errMsg}\n\nGo to [Billing](/dashboard/billing) to upgrade your plan.`,
      });
      dispatch({ type: "SET_GENERATING", isGenerating: false });
      return;
    }

    // Retry once if nothing was generated yet
    if (screenCount === 0 && !signal?.aborted) {
      dispatch({ type: "SET_GEN_STEP", genStep: "Retrying..." });
      addStep("Retrying after error", errMsg);
      try {
        await new Promise((r) => setTimeout(r, 2000));
        if (signal?.aborted) return;
        const retryRes = await callGenerate();
        await consumeGenerateStream(retryRes, signal, handlers);
        publishSummary();
        return;
      } catch (retryErr) {
        if (signal?.aborted) return;
        console.error("Retry also failed:", retryErr);
      }
    }

    const finalMsg = `Error: ${errMsg}. Click Regenerate to try again.`;
    dispatch({ type: "SET_GEN_STEP", genStep: finalMsg });
    dispatch({ type: "UPDATE_MESSAGE", id: agentMsgId, content: finalMsg });
  } finally {
    if (!signal?.aborted) {
      dispatch({ type: "SET_GENERATING", isGenerating: false });
    }
  }
}

/* --- Workspace shell --- */

function WorkspaceShell() {
  const { state, dispatch } = useWorkspace();
  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fitViewRef = useRef<(() => void) | null>(null);
  const applyWheelRef = useRef<((w: WheelInput) => void) | null>(null);
  const focusScreenRef = useRef<((screenId: string) => void) | null>(null);
  const streamChunksRef = useRef<Map<string, string[]>>(new Map());
  const [streamTick, setStreamTick] = useState(0);
  const forceUpdate = useCallback(() => setStreamTick((t) => t + 1), []);
  const [dsOpen, setDsOpen] = useState(false);
  const [showCodeView, setShowCodeView] = useState(false);

  const handleIframeRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
  }, []);

  // Selecting an element on the canvas hands the right edge back to the
  // Properties panel — close the Design panel so the two never stack.
  useEffect(() => {
    if (state.selectedElement) setDsOpen(false);
  }, [state.selectedElement]);

  const handleFitView = useCallback(() => {
    fitViewRef.current?.();
  }, []);

  const handleFocusScreen = useCallback((id: string) => {
    focusScreenRef.current?.(id);
  }, []);

  /* Lazy-load screen HTML from S3 — watches state so any screen with metadata
     but no html gets fetched. Retries transient failures (S3 hiccups). Tracks
     in-flight + permanently failed requests to avoid duplicate fetches and
     infinite retry loops. */
  const htmlInFlightRef = useRef<Set<string>>(new Set());
  const htmlFailedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const projectId = state.app.id;
    if (!projectId) return;

    for (const screen of state.app.screens) {
      if (screen.html) continue;
      if (screen.isStreaming) continue;
      if (htmlInFlightRef.current.has(screen.id)) continue;
      if (htmlFailedRef.current.has(screen.id)) continue;

      htmlInFlightRef.current.add(screen.id);
      void loadScreenHtmlWithRetry(projectId, screen.id)
        .then((html) => {
          if (html) {
            dispatch({ type: "UPDATE_SCREEN_HTML", screenId: screen.id, html });
          } else {
            // Empty body after retries — mark failed so we don't loop forever
            htmlFailedRef.current.add(screen.id);
          }
        })
        .finally(() => {
          htmlInFlightRef.current.delete(screen.id);
        });
    }
  }, [state.app.id, state.app.screens, dispatch]);

  // Warn before leaving with unsaved work
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (state.isGenerating || state.isSending || state.app.screens.length > 0) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.isGenerating, state.isSending, state.app.screens.length]);

  /* Workspace-wide wheel handling. Three paths:
       1. cursor over React Flow pane → let React Flow handle natively (this is
          the smoothest path for trackpad pan/zoom on the canvas background).
       2. cursor over floating UI (PropertyPanel, chat, toolbar, ...) and pinch
          (ctrl/⌘ + wheel) → forward to canvas zoom via applyWheelRef. Without
          this, pinching over UI would either zoom the entire webpage or do
          nothing.
       3. cursor over floating UI and PLAIN scroll → let it bubble normally so
          chat messages, the property panel, etc. can scroll their content.
     Wheel events that originate inside an iframe never reach this handler —
     they're handled by the bridge's postMessage path. */
  useEffect(() => {
    function isOverScrollableUi(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      // Anything inside a workspace UI element that has scrollable overflow
      let el: Element | null = target;
      while (el && el !== document.body) {
        if (el.classList.contains("react-flow")) return false; // canvas pane
        const cs = (el instanceof HTMLElement) && getComputedStyle(el);
        if (cs && (cs.overflowY === "auto" || cs.overflowY === "scroll" ||
                   cs.overflow === "auto" || cs.overflow === "scroll")) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    }

    function onWheel(e: WheelEvent) {
      const target = e.target as Element | null;
      const overReactFlow = target?.closest(".react-flow");

      if (overReactFlow) {
        // React Flow handles its own pan/zoom; we just block the browser
        // page-zoom fallback for ctrl+wheel.
        if (e.ctrlKey || e.metaKey) e.preventDefault();
        return;
      }

      // Pinch over floating UI → zoom the canvas instead of the page
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        applyWheelRef.current?.({
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          ctrlKey: true,
          metaKey: e.metaKey,
          clientX: e.clientX,
          clientY: e.clientY,
        });
        return;
      }

      // Plain scroll over UI: let it bubble naturally if the UI is scrollable
      // (chat messages, property list). Otherwise treat it as a canvas pan so
      // the user can pan even when their cursor is over a non-scrollable
      // floating overlay.
      if (!isOverScrollableUi(target)) {
        applyWheelRef.current?.({
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          ctrlKey: false,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_" || e.key === "0") {
        e.preventDefault();
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Auto-generate on first load
  const didAutoGenerate = useRef(false);

  useEffect(() => {
    if (didAutoGenerate.current) return;
    if (state.app.screens.length > 0 || state.isGenerating) return;

    didAutoGenerate.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    runGenerate(state.app, dispatch, streamChunksRef, forceUpdate, controller.signal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.app.id]);

  const handleRegenerate = useCallback(() => {
    abortRef.current?.abort();
    streamChunksRef.current.clear();
    dispatch({ type: "CLEAR_FOR_REGEN" });

    const cleanApp: WireframeApp = {
      ...state.app,
      screens: [],
      designSystem: null,
      messages: [],
    };

    const controller = new AbortController();
    abortRef.current = controller;
    runGenerate(cleanApp, dispatch, streamChunksRef, forceUpdate, controller.signal);
  }, [dispatch, state.app, forceUpdate]);

  async function handleShare() {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.app),
    });
    const { url } = await res.json();
    await navigator.clipboard.writeText(window.location.origin + url);
  }

  async function handleExportHtml() {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    for (const screen of state.app.screens) {
      if (screen.html) zip.file(`${slug(screen.name)}.html`, screen.html);
    }
    if (state.app.designSystem) zip.file("design-system.json", JSON.stringify(state.app.designSystem, null, 2));
    const index = `<!DOCTYPE html><html><head><title>${state.app.name}</title></head><body>${state.app.screens.map(s => `<a href="${slug(s.name)}.html">${s.name}</a>`).join("\n")}</body></html>`;
    zip.file("index.html", index);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${slug(state.app.name)}-screens.zip`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportNextjs() {
    const { exportNextjsZip } = await import("@/lib/export-nextjs");
    await exportNextjsZip(state.app);
  }

  return (
    <div className="workspace-light flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* Full-width top bar */}
      <WorkspaceTopbar
        onFocusScreen={handleFocusScreen}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        canUndo={state.undoStack.length > 0}
        canRedo={state.redoStack.length > 0}
        onFitView={handleFitView}
        showCodeView={showCodeView}
        onToggleCode={() => setShowCodeView((v) => !v)}
        showDesignSystem={dsOpen}
        onToggleDesignSystem={() => {
          // Design panel and Properties panel share the right edge — close
          // the selection so they never stack on top of each other.
          if (!dsOpen) dispatch({ type: "SELECT_ELEMENT", element: null });
          setDsOpen((v) => !v);
        }}
        onShare={handleShare}
        onExportHtml={handleExportHtml}
        onExportNextjs={handleExportNextjs}
        onRegenerate={handleRegenerate}
        isGenerating={state.isGenerating}
        screenCount={state.app.screens.length}
        hasDesignSystem={!!state.app.designSystem}
      />

      {/* Content: resizable sidebar + canvas */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
        {/* Left chat sidebar */}
        <ResizablePanel defaultSize="360px" minSize="300px" maxSize="560px">
          <WorkspaceSidebar
            streamChunksRef={streamChunksRef}
            forceCanvasUpdate={forceUpdate}
            focusScreen={handleFocusScreen}
            onStop={() => {
              abortRef.current?.abort();
              streamChunksRef.current.clear();
              dispatch({ type: "SET_GENERATING", isGenerating: false });
            }}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Canvas area with floating overlays */}
        <ResizablePanel minSize="40%" className="relative">
          <Canvas
            streamChunks={streamChunksRef}
            streamTick={streamTick}
            onIframeRef={handleIframeRef}
            fitViewRef={fitViewRef}
            applyWheelRef={applyWheelRef}
            focusScreenRef={focusScreenRef}
          />

          {/* Property panel overlay (hidden while the design panel owns the right edge) */}
          {!dsOpen && <PropertyPanel iframeRef={iframeRef} />}

          {/* Code view overlay */}
          {showCodeView && <CodeView onClose={() => setShowCodeView(false)} />}

          {/* Design System floating panel */}
          <DesignSystemPanel open={dsOpen} onClose={() => setDsOpen(false)} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

/* --- Page --- */

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [app, setApp] = useState<WireframeApp | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) {
          router.push("/dashboard");
          return;
        }
        const data = await res.json();

        // Map DB screens (no html yet) to client Screen shape
        const screensMeta = Array.isArray(data.screens)
          ? (data.screens as Record<string, unknown>[]).map((s) => ({
              id: s.id as string,
              name: s.name as string,
              html: "",
              isStreaming: false,
              storageKey: s.storageKey as string | null,
            }))
          : [];

        // Map DB messages
        const msgs = Array.isArray(data.messages)
          ? (data.messages as Record<string, unknown>[]).map((m) => ({
              id: m.id as string,
              role: m.role as "user" | "assistant",
              content: (m.content as string) ?? "",
              image: m.image as string | undefined,
              agentSteps: m.agentSteps as WireframeApp["messages"][0]["agentSteps"],
              timestamp: new Date(m.createdAt as string).getTime(),
            }))
          : [];

        const wireframeApp: WireframeApp = {
          id: data.id,
          name: data.name,
          description: data.description ?? "",
          platform: data.platform ?? "web",
          designSystem: data.designSystem ?? data.design_system ?? null,
          screens: screensMeta,
          messages: msgs,
          createdAt: new Date(data.createdAt).getTime(),
          updatedAt: new Date(data.updatedAt).getTime(),
        };

        setApp(wireframeApp);
      } catch {
        router.push("/dashboard");
      }
    }
    load();
  }, [id, router]);

  if (!app) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <WorkspaceProvider initialApp={app}>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
