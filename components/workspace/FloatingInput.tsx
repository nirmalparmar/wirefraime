"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";
import { uuid } from "@/lib/store";
import type { Message } from "@/lib/types";

const MAX_IMAGE_DIM = 1024;
const MAX_CHARS = 2000;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
          const scale = MAX_IMAGE_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function FloatingInput({
  streamChunksRef,
  forceCanvasUpdate,
  onStop,
}: {
  streamChunksRef: React.MutableRefObject<Map<string, string[]>>;
  forceCanvasUpdate: () => void;
  onStop?: () => void;
}) {
  const { state, dispatch } = useWorkspace();
  const { app, activeScreenId, isGenerating, isSending, selectedElement } = state;

  const [inputValue, setInputValue] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeScreen = useMemo(
    () => app.screens.find((s) => s.id === activeScreenId),
    [app.screens, activeScreenId]
  );

  const charCount = inputValue.length;

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await resizeImage(file);
      setImageData(dataUrl);
    } catch { /* ignore */ }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageFile(file);
          return;
        }
      }
    },
    [handleImageFile]
  );

  function clearScreenContext() {
    dispatch({ type: "SET_ACTIVE_SCREEN", id: "" });
  }

  async function handleSend() {
    if ((!inputValue.trim() && !imageData) || isSending || isGenerating) return;

    const userMsg: Message = {
      id: uuid(),
      role: "user",
      content: inputValue.trim(),
      ...(imageData ? { image: imageData } : {}),
      timestamp: Date.now(),
    };
    const aiMsgId = uuid();

    dispatch({ type: "ADD_MESSAGE", message: userMsg });
    dispatch({
      type: "ADD_MESSAGE",
      message: { id: aiMsgId, role: "assistant", content: "", timestamp: Date.now(), agentSteps: [] },
    });

    const sentImage = imageData;
    const sentElement = selectedElement
      ? { xpath: selectedElement.xpath, tagName: selectedElement.tagName, textContent: selectedElement.textContent }
      : null;

    setInputValue("");
    setImageData(null);
    dispatch({ type: "SET_SENDING", isSending: true });
    const chatController = new AbortController();
    chatAbortRef.current = chatController;
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const planStepId = uuid();
    dispatch({
      type: "ADD_AGENT_STEP",
      messageId: aiMsgId,
      step: { id: planStepId, label: "Planning changes", status: "running", timestamp: Date.now() },
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: chatController.signal,
        body: JSON.stringify({
          message: userMsg.content,
          screens: app.screens,
          designSystem: app.designSystem,
          platform: app.platform ?? "web",
          messages: app.messages,
          appName: app.name,
          appDescription: app.description,
          activeScreenId,
          projectId: app.id,
          ...(sentImage ? { image: sentImage } : {}),
          ...(sentElement ? { selectedElement: sentElement } : {}),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let editStepId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          let data: Record<string, unknown>;
          try { data = JSON.parse(line.slice(6)); } catch { continue; }
          const event = data.event as string;

          if (event === "plan") {
            const isMulti = data.multiScreen as boolean;
            const action = data.action as string | undefined;
            dispatch({ type: "UPDATE_MESSAGE", id: aiMsgId, content: data.reply as string });
            dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiMsgId, stepId: planStepId, updates: { status: "done" } });

            if (action === "create") {
              editStepId = uuid();
              dispatch({
                type: "ADD_AGENT_STEP",
                messageId: aiMsgId,
                step: { id: editStepId, label: `Creating new screen: "${data.newScreenName || data.targetScreenName}"`, status: "running", timestamp: Date.now() },
              });
            } else {
              const pendingId = data.targetScreenId as string;
              if (pendingId && pendingId !== "ALL" && pendingId !== "NEW" && pendingId !== activeScreenId) {
                dispatch({ type: "SET_ACTIVE_SCREEN", id: pendingId });
              }
              if (!isMulti) {
                editStepId = uuid();
                dispatch({
                  type: "ADD_AGENT_STEP",
                  messageId: aiMsgId,
                  step: { id: editStepId, label: `Applying changes to "${data.targetScreenName}"`, status: "running", screenId: pendingId, timestamp: Date.now() },
                });
              }
            }
          } else if (event === "screen_created") {
            const screenId = data.screenId as string;
            const screenName = data.screenName as string;
            const html = data.html as string;
            if (screenId && html) {
              dispatch({ type: "UPDATE_SCREEN_HTML", screenId, html });
              dispatch({ type: "SET_SCREEN_STREAMING", screenId, isStreaming: false });
              streamChunksRef.current.delete(screenId);
              dispatch({ type: "SET_ACTIVE_SCREEN", id: screenId });
            }
            if (editStepId) {
              dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiMsgId, stepId: editStepId, updates: { status: "done", label: `Created new screen: "${screenName}"` } });
            }
          } else if (event === "screen_start") {
            if (editStepId) {
              dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiMsgId, stepId: editStepId, updates: { status: "done" } });
            }
            editStepId = uuid();
            const screenName = data.screenName as string;
            const idx = data.index as number;
            const total = data.total as number;
            const screenId = data.screenId as string;

            const existingScreen = app.screens.find((s) => s.id === screenId);
            if (!existingScreen && screenId) {
              dispatch({
                type: "ADD_SCREEN",
                screen: { id: screenId, name: screenName, html: "", isStreaming: true },
              });
              streamChunksRef.current.set(screenId, []);
            } else if (screenId) {
              dispatch({ type: "SET_SCREEN_STREAMING", screenId, isStreaming: true });
              streamChunksRef.current.set(screenId, []);
            }

            if (screenId && screenId !== activeScreenId) {
              dispatch({ type: "SET_ACTIVE_SCREEN", id: screenId });
            }
            dispatch({
              type: "ADD_AGENT_STEP",
              messageId: aiMsgId,
              step: { id: editStepId, label: existingScreen ? `Editing ${screenName} (${idx}/${total})` : `Creating "${screenName}"`, status: "running", screenId, timestamp: Date.now() },
            });
          } else if (event === "apply_op") {
            dispatch({
              type: "ADD_AGENT_STEP",
              messageId: aiMsgId,
              step: {
                id: uuid(),
                label: data.description as string,
                detail: `${data.index}/${data.total}`,
                status: "done",
                screenId: data.screenId as string,
                timestamp: Date.now(),
              },
            });
            if (editStepId) {
              dispatch({
                type: "UPDATE_AGENT_STEP",
                messageId: aiMsgId,
                stepId: editStepId,
                updates: { detail: `${data.index}/${data.total} applied` },
              });
            }
          } else if (event === "apply_failed") {
            const isFallback = data.fallback as boolean;
            const failbackScreenId = data.screenId as string;
            if (isFallback) {
              if (editStepId) {
                dispatch({
                  type: "UPDATE_AGENT_STEP",
                  messageId: aiMsgId,
                  stepId: editStepId,
                  updates: { status: "done", detail: "Switched approach" },
                });
              }
              editStepId = uuid();
              dispatch({
                type: "ADD_AGENT_STEP",
                messageId: aiMsgId,
                step: { id: editStepId, label: "Regenerating screen", status: "running", timestamp: Date.now() },
              });
              if (failbackScreenId) {
                dispatch({ type: "SET_SCREEN_STREAMING", screenId: failbackScreenId, isStreaming: true });
                streamChunksRef.current.set(failbackScreenId, []);
              }
            } else {
              const failedOps = data.failedOps as string[];
              if (failedOps.length > 0) {
                dispatch({
                  type: "ADD_AGENT_STEP",
                  messageId: aiMsgId,
                  step: {
                    id: uuid(),
                    label: `Retried ${failedOps.length} change(s)`,
                    status: "done",
                    timestamp: Date.now(),
                  },
                });
              }
            }
          } else if (event === "html_chunk") {
            const chunkScreenId = data.screenId as string;
            const chunk = data.chunk as string;
            let chunks = streamChunksRef.current.get(chunkScreenId);
            if (!chunks) {
              chunks = [];
              streamChunksRef.current.set(chunkScreenId, chunks);
              dispatch({ type: "SET_SCREEN_STREAMING", screenId: chunkScreenId, isStreaming: true });
            }
            chunks.push(chunk);
            forceCanvasUpdate();
            if (editStepId) {
              dispatch({
                type: "UPDATE_AGENT_STEP",
                messageId: aiMsgId,
                stepId: editStepId,
                updates: { detail: "Streaming..." },
              });
            }
          } else if (event === "screen_done") {
            const screenId = data.screenId as string;
            const html = data.html as string;
            if (screenId && html) {
              dispatch({ type: "UPDATE_SCREEN_HTML", screenId, html, pushUndo: true });
              dispatch({ type: "SET_SCREEN_STREAMING", screenId, isStreaming: false });
              streamChunksRef.current.delete(screenId);
            }
            if (editStepId) dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiMsgId, stepId: editStepId, updates: { status: "done" } });
          } else if (event === "error") {
            throw new Error(data.message as string);
          }
        }
      }
    } catch {
      if (chatController.signal.aborted) {
        dispatch({ type: "UPDATE_MESSAGE", id: aiMsgId, content: "Stopped." });
        dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiMsgId, stepId: planStepId, updates: { status: "done", detail: "Stopped by user" } });
      } else {
        dispatch({ type: "UPDATE_MESSAGE", id: aiMsgId, content: "Something went wrong. Please try again." });
        dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiMsgId, stepId: planStepId, updates: { status: "error" } });
      }
    } finally {
      chatAbortRef.current = null;
      dispatch({ type: "SET_SENDING", isSending: false });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const canSend = (inputValue.trim() || imageData) && !isSending && !isGenerating;
  const isDisabled = isGenerating || isSending;
  const isActive = isGenerating || isSending;

  function handleStop() {
    // Stop chat request
    chatAbortRef.current?.abort();
    // Stop generation (from parent)
    onStop?.();
  }

  return (
    <div className="absolute bottom-5 left-1/2 z-30 w-full max-w-[680px] -translate-x-1/2 px-4">
      <div className={`overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all ${inputFocused ? "border-ring/30 bg-background/95 shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]" : "border-border bg-background/80 shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"}`}>
        {/* Screen context chip + selected element chip */}
        {(activeScreen || selectedElement || imageData) && (
          <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3">
            {activeScreen && (
              <div className="flex items-center gap-1.5 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] text-foreground/80 ring-1 ring-border">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0 text-muted-foreground">
                  <rect x="1.5" y="2" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M4.5 10.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                </svg>
                <span className="max-w-[140px] truncate font-medium">{activeScreen.name}</span>
                <button
                  onClick={clearScreenContext}
                  className="grid size-3.5 shrink-0 place-items-center rounded-full text-foreground/30 transition-colors hover:text-foreground/70"
                >
                  <svg width="7" height="7" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}
            {selectedElement && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
                  <rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
                <span className="max-w-[120px] truncate">
                  &lt;{selectedElement.tagName}&gt;
                </span>
                <button
                  onClick={() => dispatch({ type: "SELECT_ELEMENT", element: null })}
                  className="grid size-3.5 shrink-0 place-items-center rounded-full text-blue-500/60 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <svg width="7" height="7" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}
            {imageData && (
              <div className="relative">
                <img src={imageData} alt="" className="block h-8 w-10 rounded-lg border border-border object-cover" />
                <button
                  className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border hover:text-destructive"
                  onClick={() => setImageData(null)}
                >
                  <svg width="6" height="6" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setInputValue(e.target.value); }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={
            isGenerating
              ? "Generating screens..."
              : activeScreen
                ? "What would you like to change or create?"
                : "What would you like to change or create?"
          }
          disabled={isDisabled}
          rows={1}
          className="min-h-[40px] max-h-[120px] w-full resize-none overflow-y-auto bg-transparent px-3.5 pt-3 pb-1.5 text-[14px] leading-relaxed text-foreground/90 outline-none placeholder:text-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-40"
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 120) + "px";
          }}
        />

        {/* Bottom toolbar row */}
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <div className="flex items-center gap-0.5">
            <button
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground/70 disabled:opacity-25"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              title="Attach image"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }} />

            <button
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground/70 disabled:opacity-25"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              title="Upload screenshot"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1.5" y="2" width="13" height="10.5" rx="2" />
                <circle cx="5.5" cy="5.5" r="1.5" />
                <path d="M14.5 9.5l-3.5-3-4 4.5-2-1.5L1.5 12.5" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {charCount > MAX_CHARS * 0.7 && (
              <span className="text-[10px] tabular-nums text-muted-foreground/40">
                {charCount}/{MAX_CHARS}
              </span>
            )}

            {isActive ? (
              <button
                className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground text-background shadow-sm transition-all hover:opacity-80"
                onClick={handleStop}
                title="Stop"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="1" y="1" width="10" height="10" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                className={`grid size-8 shrink-0 place-items-center rounded-xl transition-all ${canSend ? "bg-foreground text-background shadow-sm hover:opacity-80" : "text-foreground/15"}`}
                onClick={handleSend}
                disabled={!canSend}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 13V3M4 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
