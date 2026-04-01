"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { uuid } from "@/lib/store";
import { WorkspaceProvider, useWorkspace } from "@/lib/store/use-workspace";
import type { WireframeApp, DesignSystem, Platform } from "@/lib/types";

import { Toolbar } from "@/components/workspace/Toolbar";
import { CanvasActions } from "@/components/workspace/CanvasActions";
import { Canvas } from "@/components/workspace/Canvas";
import { PropertyPanel } from "@/components/workspace/PropertyPanel";
import { ChatBar } from "@/components/workspace/ChatBar";
import { FloatingInput } from "@/components/workspace/FloatingInput";
import { DesignSystemPanel } from "@/components/workspace/DesignSystemDialog";
import { CodeView } from "@/components/workspace/CodeView";

/* --- Generate function with agent step dispatching --- */

async function runGenerate(
  app: WireframeApp,
  dispatch: ReturnType<typeof useWorkspace>["dispatch"],
  streamChunksRef: React.MutableRefObject<Map<string, string[]>>,
  forceUpdate: () => void,
  signal?: AbortSignal
) {
  // Create a system message to hold agent thinking steps
  const agentMsgId = uuid();
  dispatch({
    type: "ADD_MESSAGE",
    message: {
      id: agentMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      agentSteps: [],
    },
  });

  dispatch({ type: "SET_GENERATING", isGenerating: true, genStep: "Analyzing your app..." });

  // Track step IDs for updates
  let currentStepId: string | null = null;

  function addStep(label: string, detail?: string) {
    // Mark previous step done
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
    return currentStepId;
  }

  let screenCount = 0;

  try {
    addStep("Analyzing your app", `Planning design for "${app.name}"`);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: app.name, description: app.description, projectId: app.id }),
      signal,
    });

    if (!res.ok || !res.body) throw new Error("Generation failed");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let totalScreens = 0;

    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        const event = data.event as string;

        if (event === "step") {
          const label = data.label as string;
          const detail = (data.detail as string) || undefined;
          dispatch({ type: "SET_GEN_STEP", genStep: label });
          addStep(label, detail);
        } else if (event === "design_system") {
          dispatch({
            type: "SET_DESIGN_SYSTEM",
            designSystem: data.designSystem as DesignSystem,
            platform: (data.platform as Platform) ?? "web",
          });
          // Mark DS step done and note it
          if (currentStepId) {
            dispatch({
              type: "UPDATE_AGENT_STEP",
              messageId: agentMsgId,
              stepId: currentStepId,
              updates: { status: "done", detail: "Colors, fonts, layout tokens" },
            });
            currentStepId = null;
          }
        } else if (event === "screen_plan") {
          totalScreens = (data.count as number) || 0;
        } else if (event === "screen_start") {
          const screenId = data.id as string;
          const screenName = data.name as string;
          screenCount++;

          dispatch({ type: "SET_GEN_STEP", genStep: `Designing "${screenName}"...` });
          dispatch({
            type: "ADD_SCREEN",
            screen: { id: screenId, name: screenName, html: "", isStreaming: true },
          });
          streamChunksRef.current.set(screenId, []);

          addStep(
            `Generating "${screenName}"`,
            totalScreens > 0 ? `${screenCount}/${totalScreens}` : undefined
          );
        } else if (event === "html_chunk") {
          const screenId = data.screenId as string;
          const chunk = data.chunk as string;
          const chunks = streamChunksRef.current.get(screenId);
          if (chunks) {
            chunks.push(chunk);
            forceUpdate();
          }
        } else if (event === "screen_done") {
          const screenId = data.screenId as string;
          const html = data.html as string;
          dispatch({ type: "UPDATE_SCREEN_HTML", screenId, html });
          dispatch({ type: "SET_SCREEN_STREAMING", screenId, isStreaming: false });
          streamChunksRef.current.delete(screenId);

          // Mark current screen step done
          if (currentStepId) {
            dispatch({
              type: "UPDATE_AGENT_STEP",
              messageId: agentMsgId,
              stepId: currentStepId,
              updates: { status: "done", screenId },
            });
            currentStepId = null;
          }
        } else if (event === "error") {
          throw new Error((data.message as string) || "Generation failed");
        }
      }
    }

    // Final: mark any running step as done
    if (currentStepId) {
      dispatch({
        type: "UPDATE_AGENT_STEP",
        messageId: agentMsgId,
        stepId: currentStepId,
        updates: { status: "done" },
      });
    }

    // Set summary message
    dispatch({
      type: "UPDATE_MESSAGE",
      id: agentMsgId,
      content: `Generated ${screenCount} screen${screenCount !== 1 ? "s" : ""} with a complete design system. Click any screen to start editing, or describe changes in the chat.`,
    });
  } catch (err) {
    if (signal?.aborted) return;
    console.error("Generate error:", err);
    const errMsg = err instanceof Error ? err.message : "Generation failed";

    // Mark current step as error
    if (currentStepId) {
      dispatch({
        type: "UPDATE_AGENT_STEP",
        messageId: agentMsgId,
        stepId: currentStepId,
        updates: { status: "error", detail: errMsg },
      });
    }

    // Retry once if no screens were generated yet
    if (screenCount === 0 && !signal?.aborted) {
      dispatch({ type: "SET_GEN_STEP", genStep: "Retrying..." });
      addStep("Retrying after error", errMsg);

      try {
        await new Promise((r) => setTimeout(r, 2000));
        if (signal?.aborted) return;

        const retryRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: app.name, description: app.description, projectId: app.id }),
          signal,
        });

        if (!retryRes.ok || !retryRes.body) throw new Error("Retry failed");

        const retryReader = retryRes.body.getReader();
        const retryDecoder = new TextDecoder();
        let retryBuffer = "";

        while (true) {
          if (signal?.aborted) break;
          const { done, value } = await retryReader.read();
          if (done) break;

          retryBuffer += retryDecoder.decode(value, { stream: true });
          const parts = retryBuffer.split("\n\n");
          retryBuffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            let data: Record<string, unknown>;
            try { data = JSON.parse(line.slice(6)); } catch { continue; }
            const event = data.event as string;

            if (event === "step") {
              const label = data.label as string;
              const detail = (data.detail as string) || undefined;
              dispatch({ type: "SET_GEN_STEP", genStep: label });
              addStep(label, detail);
            } else if (event === "design_system") {
              dispatch({
                type: "SET_DESIGN_SYSTEM",
                designSystem: data.designSystem as DesignSystem,
                platform: (data.platform as Platform) ?? "web",
              });
            } else if (event === "screen_start") {
              screenCount++;
              dispatch({
                type: "ADD_SCREEN",
                screen: { id: data.id as string, name: data.name as string, html: "", isStreaming: true },
              });
              streamChunksRef.current.set(data.id as string, []);
              addStep(`Generating "${data.name as string}"`);
            } else if (event === "html_chunk") {
              const chunks = streamChunksRef.current.get(data.screenId as string);
              if (chunks) { chunks.push(data.chunk as string); forceUpdate(); }
            } else if (event === "screen_done") {
              dispatch({ type: "UPDATE_SCREEN_HTML", screenId: data.screenId as string, html: data.html as string });
              dispatch({ type: "SET_SCREEN_STREAMING", screenId: data.screenId as string, isStreaming: false });
              streamChunksRef.current.delete(data.screenId as string);
              if (currentStepId) {
                dispatch({ type: "UPDATE_AGENT_STEP", messageId: agentMsgId, stepId: currentStepId, updates: { status: "done" } });
                currentStepId = null;
              }
            } else if (event === "error") {
              throw new Error((data.message as string) || "Generation failed");
            }
          }
        }

        if (currentStepId) {
          dispatch({ type: "UPDATE_AGENT_STEP", messageId: agentMsgId, stepId: currentStepId, updates: { status: "done" } });
        }
        dispatch({
          type: "UPDATE_MESSAGE",
          id: agentMsgId,
          content: `Generated ${screenCount} screen${screenCount !== 1 ? "s" : ""} with a complete design system.`,
        });
        return; // Retry succeeded
      } catch (retryErr) {
        if (signal?.aborted) return;
        console.error("Retry also failed:", retryErr);
        // Fall through to show final error
      }
    }

    dispatch({
      type: "SET_GEN_STEP",
      genStep: `Error: ${errMsg}. Click Regenerate to try again.`,
    });
    dispatch({
      type: "UPDATE_MESSAGE",
      id: agentMsgId,
      content: `Error: ${errMsg}. Click Regenerate to try again.`,
    });
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
  const streamChunksRef = useRef<Map<string, string[]>>(new Map());
  const [streamTick, setStreamTick] = useState(0);
  const forceUpdate = useCallback(() => setStreamTick((t) => t + 1), []);
  const [dsOpen, setDsOpen] = useState(false);
  const [showCodeView, setShowCodeView] = useState(false);

  const handleIframeRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
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

  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans text-foreground">
      {/* Full-bleed canvas */}
      <Canvas streamChunks={streamChunksRef.current} streamTick={streamTick} onIframeRef={handleIframeRef} />

      {/* Floating top bar — app name */}
      <Toolbar />

      {/* Floating left panel — glass chat/reasoning overlay */}
      <ChatBar />

      {/* Floating right actions */}
      <CanvasActions
        onRegenerate={handleRegenerate}
        onToggleDesignSystem={() => setDsOpen((v) => !v)}
        showDesignSystem={dsOpen}
        showCodeView={showCodeView}
        onToggleCode={() => setShowCodeView((v) => !v)}
      />

      {/* Floating bottom input */}
      <FloatingInput
        streamChunksRef={streamChunksRef}
        forceCanvasUpdate={forceUpdate}
        onStop={() => {
          abortRef.current?.abort();
          streamChunksRef.current.clear();
          dispatch({ type: "SET_GENERATING", isGenerating: false });
        }}
      />

      {/* Property panel overlay */}
      <PropertyPanel iframeRef={iframeRef} />

      {/* Code view overlay */}
      {showCodeView && <CodeView onClose={() => setShowCodeView(false)} />}

      {/* Design System floating panel */}
      <DesignSystemPanel open={dsOpen} onClose={() => setDsOpen(false)} />
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

        // Lazy-load screen HTML from S3
        for (const s of screensMeta) {
          if (s.storageKey) {
            fetch(`/api/projects/${id}/screens/${s.id}/html`)
              .then((r) => r.ok ? r.text() : "")
              .then((html) => {
                if (html) {
                  setApp((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      screens: prev.screens.map((sc) =>
                        sc.id === s.id ? { ...sc, html } : sc
                      ),
                    };
                  });
                }
              })
              .catch(() => {});
          }
        }
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
