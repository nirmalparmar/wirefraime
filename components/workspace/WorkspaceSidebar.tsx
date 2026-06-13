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

function cleanLabel(step: AgentStep): string {
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
    const t = setInterval(() => {
      i++;
      if (i >= text.length) { setDisplayed(text); clearInterval(t); }
      else setDisplayed(text.slice(0, i));
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]); // eslint-disable-line
  return displayed;
}

/* ── Inline rich text — `code`, **bold**, [links](…) ──────────
   Assistant replies name screens, components, and classes; rendering
   backticks as mono chips (Lovable-style) is most of the perceived
   polish of the chat. Single regex pass, no markdown library. */
const INLINE_TOKEN = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^)\s]+\))/g;

function InlineRich({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_TOKEN)) {
    if (m.index! > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={i++}
          className="rounded-[6px] bg-foreground/[0.055] px-[5px] py-px font-mono text-[0.85em] text-foreground/80"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("**")) {
      nodes.push(
        <strong key={i++} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    } else {
      const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      nodes.push(
        <a
          key={i++}
          href={link![2]}
          className="font-medium text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground/60"
        >
          {link![1]}
        </a>
      );
    }
    last = m.index! + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

/* Assistant prose: blank lines become paragraph rhythm instead of
   raw pre-wrap gaps. */
function RichText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={`m-0 whitespace-pre-wrap break-words text-[14px] leading-[1.7] text-foreground ${i > 0 ? "mt-3" : ""}`}
        >
          <InlineRich text={p} />
        </p>
      ))}
    </>
  );
}

/* ── Reasoning stream — quiet prose that follows its own tail ──
   No mono font, no boxed chrome: the model's thinking reads like a soft
   marginal note (Claude-style), with the top edge fading out as it scrolls. */
function ReasoningStream({ text, live }: { text: string; live: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && live) el.scrollTop = el.scrollHeight;
  }, [text, live]);
  // The server streams a rolling tail — drop the leading partial word.
  const clean = text.replace(/^\S+\s+/, "");
  return (
    <div
      ref={ref}
      className={`mt-1.5 max-h-[96px] overflow-y-auto scrollbar-none ${live ? "wf-fade-top" : ""}`}
    >
      <p className="m-0 whitespace-pre-wrap break-words text-[12px] leading-[1.7] text-foreground/45">
        {clean}
      </p>
    </div>
  );
}

/* ── Step row — minimal timeline entry ───────────────────────── */
function StepRow({ step, live, now }: { step: AgentStep; live: boolean; now: number }) {
  const running = step.status === "running" && live;
  const secs = running ? Math.floor((now - step.timestamp) / 1000) : 0;
  return (
    <div className="flex items-start gap-2.5 py-[5px]">
      <span className="mt-[6px] flex size-[7px] shrink-0 items-center justify-center">
        {running ? (
          <span className="size-[7px] animate-pulse rounded-full bg-ws-accent" />
        ) : (
          <span className="size-[5px] rounded-full bg-foreground/20" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span
            className={
              running
                ? "wf-shimmer-text text-[12px] font-medium leading-snug"
                : "text-[12px] leading-snug text-foreground/60"
            }
          >
            {cleanLabel(step)}
          </span>
          {running && secs >= 3 && (
            <span className="text-[11px] tabular-nums text-foreground/30">{secs}s</span>
          )}
        </div>
        {running && step.detail && (
          <p className="mt-0.5 truncate text-[11px] leading-snug text-foreground/45">{step.detail}</p>
        )}
        {step.reasoning && <ReasoningStream text={step.reasoning} live={running} />}
      </div>
    </div>
  );
}

/* ── Thinking block — Claude-style collapsed reasoning ────────── */
function Chevron({ open, dim }: { open: boolean; dim?: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${dim ? "text-foreground/25" : "text-foreground/35"}`}
    >
      <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const hasError = steps.some(s => s.status === "error");

  if (live) {
    return (
      <div className="mb-1.5 rounded-xl border border-foreground/[0.06] bg-foreground/[0.025] px-3 py-2">
        <button onClick={() => setOpen(p => !p)} className="flex w-full items-center gap-2 text-left">
          <span className="wf-shimmer-text min-w-0 flex-1 truncate text-[12px] font-medium">
            {current ? cleanLabel(current) : "Thinking…"}
          </span>
          {elapsed && (
            <span className="shrink-0 text-[11px] tabular-nums text-foreground/30">{elapsed}</span>
          )}
          <Chevron open={open} />
        </button>
        {open && visible.length > 0 && (
          <div className="mt-1.5 border-t border-foreground/[0.05] pt-1">
            {visible.map(s => <StepRow key={s.id} step={s} live now={now} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 rounded-md py-[3px] text-xs text-foreground/85 transition-colors hover:text-foreground"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
          <circle cx="5" cy="5" r="3.6" stroke="currentColor" strokeWidth="1" />
          <path d="M5 3.4v1.8l1.3 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span>{hasError ? "Stopped while working" : elapsed ? `Thought for ${elapsed}` : "Thought"}</span>
        <Chevron open={open} dim />
      </button>
      {open && visible.length > 0 && (
        <div className="mt-1 px-3 py-1.5">
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
        <div className="max-w-[88%] rounded-[16px] rounded-br-[6px] bg-foreground/[0.05] px-3.5 py-2.5 text-[14px] leading-[1.6] text-foreground">
          {msg.image && <img src={msg.image} alt="" className="mb-2 max-h-28 rounded-lg" />}
          <p className="m-0 whitespace-pre-wrap break-words">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 pr-2">
      {hasSteps && <ThinkingBlock steps={msg.agentSteps!} live={live} />}
      {msg.content && <RichText text={text} />}
      {!msg.content && !hasSteps && (
        <div className="flex items-center gap-1.5 py-1">
          {[0, 150, 300].map(d => (
            <span key={d} className="size-[4px] animate-pulse rounded-full bg-foreground/30" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Prompt input box ───────────────────────────────────────── */
function PromptBox({
  value,
  onChange,
  onSend,
  onStop,
  onPaste,
  onKey,
  onFocus,
  onBlur,
  isActive,
  canSend,
  imageData,
  onClearImage,
  onAttach,
  textareaRef,
  selectedElement,
  activeScreen,
  onClearElement,
  onClearScreen,
  charCount,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  isActive: boolean;
  canSend: boolean;
  imageData: string | null;
  onClearImage: () => void;
  onAttach: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  selectedElement: { tagName: string; textContent?: string } | null;
  activeScreen: { name: string } | null;
  onClearElement: () => void;
  onClearScreen: () => void;
  charCount: number;
}) {
  return (
    <div className="rounded-[22px] border border-foreground/8 bg-card shadow-[0_2px_10px_-3px_rgba(20,20,20,0.08),0_8px_28px_-18px_rgba(20,20,20,0.18)] transition-all focus-within:border-foreground/16 focus-within:shadow-[0_4px_16px_-4px_rgba(20,20,20,0.12),0_12px_36px_-20px_rgba(20,20,20,0.24)]">
      {/* Context chips row (top) */}
      {(imageData || selectedElement || activeScreen) && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-3">
          {activeScreen && (
            <span className="flex h-6 items-center gap-1.5 rounded-lg border border-border/50 shadow bg-white px-2 text-[12px] text-foreground">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
                <rect x="1.5" y="2" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
                <path d="M4.5 10.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              <span className="max-w-[110px] truncate">{activeScreen.name}</span>
              <button onClick={onClearScreen} className="ml-0.5 text-foreground/30 hover:text-foreground/60">
                <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </span>
          )}
          {selectedElement && (
            <span className="flex h-6 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.06] px-2 text-[12px] text-primary/80">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span className="max-w-[80px] truncate">&lt;{selectedElement.tagName}&gt;</span>
              <button onClick={onClearElement} className="ml-0.5 text-primary/30 hover:text-primary/70">
                <svg width="6" height="6" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </span>
          )}
          {imageData && (
            <div className="relative">
              <img src={imageData} alt="" className="block h-7 w-9 rounded-lg border border-border object-cover" />
              <button className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-background text-foreground/40 ring-1 ring-border hover:text-foreground/70" onClick={onClearImage}>
                <svg width="5" height="5" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => { if (e.target.value.length <= MAX_CHARS) onChange(e.target.value); }}
        onKeyDown={onKey}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={isActive ? "Working…" : "Ask wf to change anything…"}
        disabled={isActive}
        rows={1}
        className="min-h-[48px] max-h-[140px] w-full resize-none overflow-y-auto bg-transparent px-4 pt-3.5 pb-0 text-[14px] leading-[1.6] text-foreground outline-none placeholder:text-foreground/30 disabled:cursor-not-allowed"
        onInput={e => {
          const t = e.currentTarget;
          t.style.height = "auto";
          t.style.height = Math.min(t.scrollHeight, 140) + "px";
        }}
      />

      {/* Bottom action row */}
      <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1.5">
        {/* Left: attach */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onAttach}
            disabled={isActive}
            title="Attach image"
            className="btn-fx flex size-8 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Right: char count + send/stop */}
        <div className="flex items-center gap-2">
          {charCount > MAX_CHARS * 0.75 && (
            <span className="text-[11px] tabular-nums text-foreground/30">{charCount}/{MAX_CHARS}</span>
          )}
          {isActive ? (
            <button
              onClick={onStop}
              title="Stop"
              className="flex size-8 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground/50 transition-all hover:bg-foreground/[0.14] hover:text-foreground/80"
            >
              <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                <rect x="1" y="1" width="8" height="8" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={canSend ? onSend : undefined}
              disabled={!canSend}
              title="Send"
              className={`flex size-8 items-center justify-center rounded-full transition-all ${
                canSend
                  ? "bg-foreground text-background hover:opacity-85 active:scale-[.96]"
                  : "bg-foreground/[0.08] text-foreground/25 cursor-not-allowed"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar props ──────────────────────────────────────────── */
export interface WorkspaceSidebarProps {
  streamChunksRef: React.MutableRefObject<Map<string, string[]>>;
  forceCanvasUpdate: () => void;
  onStop?: () => void;
  focusScreen: (id: string) => void;
}

/* ── Workspace sidebar ──────────────────────────────────────── */
export function WorkspaceSidebar({
  streamChunksRef,
  forceCanvasUpdate,
  onStop,
}: WorkspaceSidebarProps) {
  const { state, dispatch } = useWorkspace();
  const { app, activeScreenId, isGenerating, isSending, selectedElement } = state;

  const [inputValue, setInputValue] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeScreen = useMemo(
    () => app.screens.find(s => s.id === activeScreenId),
    [app.screens, activeScreenId]
  );
  const isActive = isGenerating || isSending;
  const canSend = !!((inputValue.trim() || imageData) && !isActive);

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

  function handleStop() {
    abortRef.current?.abort();
    onStop?.();
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

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

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {app.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 pb-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-border bg-muted/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/25">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-foreground/75">Ask to edit anything</p>
              <p className="text-[12px] leading-[1.6] text-foreground/45">
                Click an element on the canvas,<br />then describe what to change.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 px-4 pb-4 pt-5">
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

      {/* ── Prompt box ── */}
      <div className="shrink-0 p-3">
        <PromptBox
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onStop={handleStop}
          onPaste={handlePaste}
          onKey={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          isActive={isActive}
          canSend={canSend}
          imageData={imageData}
          onClearImage={() => setImageData(null)}
          onAttach={() => fileRef.current?.click()}
          textareaRef={textareaRef}
          selectedElement={selectedElement}
          activeScreen={activeScreen ?? null}
          onClearElement={() => dispatch({ type: "SELECT_ELEMENT", element: null })}
          onClearScreen={() => dispatch({ type: "SET_ACTIVE_SCREEN", id: "" })}
          charCount={inputValue.length}
        />
        {/* Hidden file input wired to parent */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}
