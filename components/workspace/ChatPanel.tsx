"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";
import { uuid } from "@/lib/store";
import type { Message, AgentStep } from "@/lib/types";

/* ── Constants ──────────────────────────────────────────────── */
const MAX_IMAGE_DIM = 1024;
const MAX_CHARS = 2000;

/* ── Image utils ────────────────────────────────────────────── */
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
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Helpers ────────────────────────────────────────────────── */
function stepsElapsed(steps: AgentStep[]): string {
  if (steps.length < 2) return "";
  const secs = (steps[steps.length - 1].timestamp - steps[0].timestamp) / 1000;
  return secs < 60 ? `${Math.round(secs)}s` : `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
}

function fmtElapsed(ms: number): string {
  const s = ms / 1000;
  return s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

/** Re-renders once a second while active so live elapsed timers keep ticking. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function cleanLabel(step: AgentStep) {
  const l = step.label.toLowerCase();
  if (l.includes("fast apply failed")) return "Retried with full generation";
  if (l.includes("regenerating full screen")) return "Regenerating screen";
  return step.label;
}

/* ── Typewriter ─────────────────────────────────────────────── */
function useTypewriter(text: string, speed = 10) {
  const [displayed, setDisplayed] = useState("");
  const prev = useRef("");
  useEffect(() => {
    if (!text || text.length < prev.current.length) { setDisplayed(text); prev.current = text; return; }
    if (text === prev.current) return;
    prev.current = text;
    let i = displayed.length;
    setDisplayed(text.slice(0, i));
    const t = setInterval(() => {
      i++;
      if (i >= text.length) { setDisplayed(text); clearInterval(t); }
      else setDisplayed(text.slice(0, i));
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]); // eslint-disable-line
  return displayed;
}

/* ── Step row ───────────────────────────────────────────────── */
function StepRow({ step, live, now }: { step: AgentStep; live: boolean; now: number }) {
  const running = step.status === "running" && live;
  const secs = running ? Math.floor((now - step.timestamp) / 1000) : 0;
  const reasoningRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = reasoningRef.current;
    if (el) el.scrollTop = el.scrollHeight; // keep latest reasoning in view
  }, [step.reasoning]);
  return (
    <div className="flex items-start gap-2 py-[3px]">
      {running ? (
        <span className="mt-[3px] size-[5px] shrink-0 animate-pulse rounded-full bg-ws-accent" />
      ) : (
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="mt-[3px] shrink-0 text-ws-accent/70">
          <path d="M2 5.5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-medium leading-snug text-white/60">
          {cleanLabel(step)}
          {running && secs >= 2 && <span className="ml-1 font-normal tabular-nums text-white/30">{secs}s</span>}
        </span>
        {step.detail && <p className="text-[10px] leading-snug text-white/30 mt-0.5">{step.detail}</p>}
        {step.reasoning && (
          <pre
            ref={reasoningRef}
            className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap rounded bg-white/[0.04] px-2 py-1 font-mono text-[10px] leading-snug text-white/40"
          >
            {step.reasoning}
          </pre>
        )}
      </div>
    </div>
  );
}

/* ── Thinking block ─────────────────────────────────────────── */
function ThinkingBlock({ steps, live }: { steps: AgentStep[]; live: boolean }) {
  const [open, setOpen] = useState(false);
  const now = useNow(live);
  useEffect(() => { setOpen(live); }, [live]);
  if (!steps.length) return null;

  const elapsed = live
    ? (now - steps[0].timestamp >= 1000 ? fmtElapsed(now - steps[0].timestamp) : "")
    : stepsElapsed(steps);
  const current = steps.findLast(s => s.status === "running");
  const visible = steps.filter(s => s.status !== "error");

  if (live) {
    return (
      <div className="mb-1">
        <button onClick={() => setOpen(p => !p)} className="flex items-center gap-2 rounded-md px-1 py-1 text-[11px] text-white/40 transition-colors hover:text-white/60">
          <span className="flex gap-[3px]">
            {[0, 150, 300].map(d => (
              <span key={d} className="size-[5px] animate-pulse rounded-full bg-ws-accent" style={{ animationDelay: `${d}ms` }} />
            ))}
          </span>
          <span className="text-white/50">{current ? cleanLabel(current) : "Thinking…"}</span>
          {elapsed && <span className="text-white/25">{elapsed}</span>}
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" className={`text-white/20 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && visible.length > 0 && (
          <div className="ml-3 mt-0.5 border-l border-white/[0.07] pl-3">
            {visible.map(s => <StepRow key={s.id} step={s} live now={now} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button onClick={() => setOpen(p => !p)} className="flex items-center gap-1.5 rounded-md px-1 py-[3px] text-[11px] text-foreground/85 transition-colors hover:text-foreground">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="shrink-0">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1" />
          <path d="M5 3.5v2l1.2 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span>{elapsed ? `Thought for ${elapsed}` : "Thought"}</span>
        <svg width="7" height="7" viewBox="0 0 10 10" fill="none" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && visible.length > 0 && (
        <div className="ml-3 mt-0.5 border-l border-white/[0.07] pl-3">
          {visible.map(s => <StepRow key={s.id} step={s} live={false} now={now} />)}
        </div>
      )}
    </div>
  );
}

/* ── Chat message ───────────────────────────────────────────── */
function ChatMessage({ msg, live }: { msg: Message; live: boolean }) {
  const isUser = msg.role === "user";
  const text = useTypewriter(msg.content, !isUser && live ? 10 : 0);
  const hasSteps = msg.agentSteps && msg.agentSteps.length > 0;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[90%] rounded-[14px] rounded-br-[4px] bg-white/[0.07] px-3 py-2 text-[13px] leading-[1.65] text-white/80">
          {msg.image && <img src={msg.image} alt="" className="mb-2 max-h-28 rounded-lg" />}
          <p className="m-0 whitespace-pre-wrap break-words">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 pr-2">
      {hasSteps && <ThinkingBlock steps={msg.agentSteps!} live={live} />}
      {msg.content && (
        <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-[1.7] text-white/65">{text}</p>
      )}
      {!msg.content && !hasSteps && (
        <div className="flex items-center gap-2 py-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="size-[5px] animate-pulse rounded-full bg-ws-accent/60" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-white/25">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-[13px] font-medium text-white/40">Ask to edit anything</p>
        <p className="text-[11px] leading-relaxed text-white/22">
          Click an element on the canvas,<br />then describe what to change.
        </p>
      </div>
    </div>
  );
}

/* ── Send button ─────────────────────────────────────────────── */
function SendBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 items-center gap-1.5 rounded-[9px] bg-ws-accent px-3 text-[11px] font-semibold text-[oklch(0.14_0.03_65)] transition-all hover:brightness-110 active:scale-[.97]"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="rotate-90">
        <path d="M12 2.5l1.9 6.2 6.1 1.8-6.1 1.9-1.9 6.1-1.9-6.1-6.1-1.9 6.1-1.8L12 2.5Z" />
      </svg>
      Ask AI
    </button>
  );
}

/* ── Chat Panel ─────────────────────────────────────────────── */
export function ChatPanel({
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

  const [collapsed, setCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeScreen = useMemo(() => app.screens.find(s => s.id === activeScreenId), [app.screens, activeScreenId]);
  const isActive = isGenerating || isSending;
  const canSend = (inputValue.trim() || imageData) && !isActive;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [app.messages.length, app.messages[app.messages.length - 1]?.agentSteps?.length, isSending]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try { setImageData(await resizeImage(file)); } catch { /* ignore */ }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const f = item.getAsFile();
        if (f) handleImageFile(f);
        return;
      }
    }
  }, [handleImageFile]);

  function handleStop() { abortRef.current?.abort(); onStop?.(); }

  async function handleSend() {
    if (!canSend) return;

    const screensWithHtml = app.screens.filter(s => s.html?.trim());
    if (!screensWithHtml.length) {
      dispatch({ type: "ADD_MESSAGE", message: { id: uuid(), role: "assistant", content: "Screens are still loading. Please wait.", timestamp: Date.now() } });
      return;
    }

    const userMsg: Message = { id: uuid(), role: "user", content: inputValue.trim(), ...(imageData ? { image: imageData } : {}), timestamp: Date.now() };
    const aiId = uuid();

    dispatch({ type: "ADD_MESSAGE", message: userMsg });
    dispatch({ type: "ADD_MESSAGE", message: { id: aiId, role: "assistant", content: "", timestamp: Date.now(), agentSteps: [] } });

    const img = imageData;
    const el = selectedElement ? { xpath: selectedElement.xpath, tagName: selectedElement.tagName, textContent: selectedElement.textContent } : null;

    setInputValue(""); setImageData(null);
    dispatch({ type: "SET_SENDING", isSending: true });
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const planId = uuid();

    dispatch({ type: "ADD_AGENT_STEP", messageId: aiId, step: { id: planId, label: "Planning changes", status: "running", timestamp: Date.now() } });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          message: userMsg.content, screens: screensWithHtml,
          designSystem: app.designSystem, platform: app.platform ?? "web",
          messages: app.messages, appName: app.name, appDescription: app.description,
          activeScreenId, projectId: app.id,
          ...(img ? { image: img } : {}), ...(el ? { selectedElement: el } : {}),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let editId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          let d: Record<string, unknown>;
          try { d = JSON.parse(line.slice(6)); } catch { continue; }
          const ev = d.event as string;

          if (ev === "plan") {
            const isMulti = d.multiScreen as boolean;
            const action = d.action as string | undefined;
            dispatch({ type: "UPDATE_MESSAGE", id: aiId, content: d.reply as string });
            dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: planId, updates: { status: "done" } });
            if (action === "create") {
              editId = uuid();
              dispatch({ type: "ADD_AGENT_STEP", messageId: aiId, step: { id: editId, label: `Creating "${d.newScreenName || d.targetScreenName}"`, status: "running", timestamp: Date.now() } });
            } else {
              const pid = d.targetScreenId as string;
              if (pid && pid !== "ALL" && pid !== "NEW" && pid !== activeScreenId) dispatch({ type: "SET_ACTIVE_SCREEN", id: pid });
              if (!isMulti) { editId = uuid(); dispatch({ type: "ADD_AGENT_STEP", messageId: aiId, step: { id: editId, label: `Editing "${d.targetScreenName}"`, status: "running", screenId: pid, timestamp: Date.now() } }); }
            }
          } else if (ev === "screen_created") {
            const sid = d.screenId as string; const sname = d.screenName as string; const html = d.html as string;
            if (sid && html) { dispatch({ type: "UPDATE_SCREEN_HTML", screenId: sid, html }); dispatch({ type: "SET_SCREEN_STREAMING", screenId: sid, isStreaming: false }); streamChunksRef.current.delete(sid); dispatch({ type: "SET_ACTIVE_SCREEN", id: sid }); }
            if (editId) dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: editId, updates: { status: "done", label: `Created "${sname}"` } });
          } else if (ev === "screen_start") {
            if (editId) dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: editId, updates: { status: "done" } });
            editId = uuid();
            const sname = d.screenName as string; const idx = d.index as number; const tot = d.total as number; const sid = d.screenId as string;
            const exists = app.screens.find(s => s.id === sid);
            if (!exists && sid) { dispatch({ type: "ADD_SCREEN", screen: { id: sid, name: sname, html: "", isStreaming: true } }); streamChunksRef.current.set(sid, []); }
            else if (sid) { dispatch({ type: "SET_SCREEN_STREAMING", screenId: sid, isStreaming: true }); streamChunksRef.current.set(sid, []); }
            if (sid && sid !== activeScreenId) dispatch({ type: "SET_ACTIVE_SCREEN", id: sid });
            dispatch({ type: "ADD_AGENT_STEP", messageId: aiId, step: { id: editId, label: exists ? `Editing ${sname} (${idx}/${tot})` : `Creating "${sname}"`, status: "running", screenId: sid, timestamp: Date.now() } });
          } else if (ev === "apply_op") {
            dispatch({ type: "ADD_AGENT_STEP", messageId: aiId, step: { id: uuid(), label: d.description as string, detail: `${d.index}/${d.total}`, status: "done", screenId: d.screenId as string, timestamp: Date.now() } });
            if (editId) dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: editId, updates: { detail: `${d.index}/${d.total} applied` } });
          } else if (ev === "apply_failed") {
            const fb = d.fallback as boolean; const fbSid = d.screenId as string;
            if (fb) {
              if (editId) dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: editId, updates: { status: "done", detail: "Switched approach" } });
              editId = uuid();
              dispatch({ type: "ADD_AGENT_STEP", messageId: aiId, step: { id: editId, label: "Regenerating screen", status: "running", timestamp: Date.now() } });
              if (fbSid) { dispatch({ type: "SET_SCREEN_STREAMING", screenId: fbSid, isStreaming: true }); streamChunksRef.current.set(fbSid, []); }
            } else {
              const ops = d.failedOps as string[];
              if (ops.length) dispatch({ type: "ADD_AGENT_STEP", messageId: aiId, step: { id: uuid(), label: `Retried ${ops.length} change(s)`, status: "done", timestamp: Date.now() } });
            }
          } else if (ev === "html_chunk") {
            const cid = d.screenId as string; const chunk = d.chunk as string;
            let chunks = streamChunksRef.current.get(cid);
            if (!chunks) { chunks = []; streamChunksRef.current.set(cid, chunks); dispatch({ type: "SET_SCREEN_STREAMING", screenId: cid, isStreaming: true }); }
            chunks.push(chunk); forceCanvasUpdate();
            if (editId) dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: editId, updates: { detail: "Streaming…" } });
          } else if (ev === "screen_done") {
            const sid = d.screenId as string; const html = d.html as string;
            if (sid && html) { dispatch({ type: "UPDATE_SCREEN_HTML", screenId: sid, html, pushUndo: true }); dispatch({ type: "SET_SCREEN_STREAMING", screenId: sid, isStreaming: false }); streamChunksRef.current.delete(sid); }
            if (editId) dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: editId, updates: { status: "done" } });
          } else if (ev === "error") {
            throw new Error(d.message as string);
          }
        }
      }
    } catch (err) {
      if (ctrl.signal.aborted) {
        dispatch({ type: "UPDATE_MESSAGE", id: aiId, content: "Stopped." });
        dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: planId, updates: { status: "done", detail: "Stopped" } });
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        dispatch({ type: "UPDATE_MESSAGE", id: aiId, content: msg });
        dispatch({ type: "UPDATE_AGENT_STEP", messageId: aiId, stepId: planId, updates: { status: "error", detail: msg } });
      }
    } finally {
      abortRef.current = null;
      dispatch({ type: "SET_SENDING", isSending: false });
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  /* ── Collapsed strip ── */
  if (collapsed) {
    return (
      <div className="flex w-11 shrink-0 flex-col items-center gap-2 border-r border-white/[0.06] bg-[oklch(0.115_0.004_280)] pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="flex size-8 items-center justify-center rounded-lg text-white/25 transition-all hover:bg-white/[0.06] hover:text-white/60"
          title="Open chat"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        {isActive && (
          <span className="size-1.5 animate-pulse rounded-full bg-ws-accent/70" />
        )}
      </div>
    );
  }

  return (
    <div className="flex w-[320px] shrink-0 flex-col border-r border-white/[0.06] bg-[oklch(0.115_0.004_280)]">

      {/* ── Header ── */}
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          {isActive ? (
            <span className="flex items-center gap-[3px]">
              {[0, 120, 240].map(d => (
                <span key={d} className="size-[5px] animate-pulse rounded-full bg-ws-accent" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
          ) : (
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute size-2 rounded-full bg-emerald-500/30" />
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
            {isActive ? "Working" : "Agent"}
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex size-7 items-center justify-center rounded-lg text-white/20 transition-all hover:bg-white/[0.06] hover:text-white/50"
          title="Collapse"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 2L1 7l4 5M1 7h8" />
          </svg>
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {app.messages.length === 0 && !isGenerating ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 pb-8 text-center">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-[12.5px] font-medium text-white/35">Ask to edit anything</p>
              <p className="text-[11px] leading-relaxed text-white/20">
                Click an element on canvas,<br />then describe what to change.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-4 py-4">
            {app.messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                live={isActive && msg.role === "assistant" && i === app.messages.length - 1}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className={`shrink-0 border-t transition-all ${focused ? "border-white/[0.09]" : "border-white/[0.05]"}`}>
        {/* Context chips */}
        {(activeScreen || selectedElement || imageData) && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2">
            {activeScreen && (
              <span className="flex h-[22px] items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.04] px-2 text-[11px] text-white/45">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="shrink-0">
                  <rect x="1.5" y="2" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M4.5 10.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                </svg>
                <span className="max-w-[110px] truncate">{activeScreen.name}</span>
                <button onClick={() => dispatch({ type: "SET_ACTIVE_SCREEN", id: "" })} className="ml-0.5 text-white/25 hover:text-white/55">
                  <svg width="6" height="6" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </span>
            )}
            {selectedElement && (
              <span className="flex h-[22px] items-center gap-1.5 rounded-md border border-ws-accent/20 bg-ws-accent/[0.08] px-2 text-[11px] text-ws-accent/80">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span className="max-w-[90px] truncate">&lt;{selectedElement.tagName}&gt;</span>
                <button onClick={() => dispatch({ type: "SELECT_ELEMENT", element: null })} className="ml-0.5 text-ws-accent/40 hover:text-ws-accent/70">
                  <svg width="6" height="6" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </span>
            )}
            {imageData && (
              <div className="relative">
                <img src={imageData} alt="" className="block h-7 w-9 rounded-lg border border-white/[0.07] object-cover" />
                <button className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-[oklch(0.155_0.004_280)] text-white/40 ring-1 ring-white/[0.08] hover:text-white/70" onClick={() => setImageData(null)}>
                  <svg width="5" height="5" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={e => { if (e.target.value.length <= MAX_CHARS) setInputValue(e.target.value); }}
          onKeyDown={onKey}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={isGenerating ? "Generating…" : "Ask to change or create…"}
          disabled={isActive}
          rows={1}
          className="min-h-[40px] max-h-[96px] w-full resize-none overflow-y-auto bg-transparent px-4 pt-3 pb-1 text-[13px] leading-relaxed text-white/75 outline-none placeholder:text-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          onInput={e => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 96) + "px";
          }}
        />

        {/* Footer row */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isActive}
              className="flex size-7 items-center justify-center rounded-lg text-white/25 transition-all hover:bg-white/[0.06] hover:text-white/55 disabled:opacity-30"
              title="Attach image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }} />
          </div>

          <div className="flex items-center gap-2">
            {inputValue.length > MAX_CHARS * 0.75 && (
              <span className="text-[10px] tabular-nums text-white/20">{inputValue.length}/{MAX_CHARS}</span>
            )}
            {isActive ? (
              <button
                onClick={handleStop}
                className="flex size-8 items-center justify-center rounded-full bg-white/[0.08] text-white/50 transition-all hover:bg-white/[0.12] hover:text-white/80"
                title="Stop"
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1" y="1" width="8" height="8" rx="1.5" />
                </svg>
              </button>
            ) : canSend ? (
              <SendBtn onClick={handleSend} />
            ) : (
              <button disabled className="flex h-8 items-center gap-1.5 rounded-[9px] border border-white/[0.06] bg-white/[0.03] px-3 text-[11px] font-medium text-white/20">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.5l1.9 6.2 6.1 1.8-6.1 1.9-1.9 6.1-1.9-6.1-6.1-1.9 6.1-1.8L12 2.5Z" />
                </svg>
                Ask AI
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
