"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";
import { uuid } from "@/lib/store";
import type { Message, AgentStep } from "@/lib/types";

/* ── Constants ──────────────────────────────────────────────── */
const MAX_IMAGE_DIM = 1024;
const MAX_CHARS = 2000;
const MAX_IMAGES = 6;

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
          className={`m-0 whitespace-pre-wrap break-words text-[15px] leading-[1.65] tracking-[-0.006em] text-foreground ${i > 0 ? "mt-3.5" : ""}`}
        >
          <InlineRich text={p} />
        </p>
      ))}
    </>
  );
}

/* ── Reasoning stream — GPT/Cursor-style dimmed thinking ──────
   The model's raw reasoning reads as quiet, low-contrast prose that
   follows its own tail, the top edge dissolving as it scrolls. */
function ReasoningStream({ text, live }: { text: string; live: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && live) el.scrollTop = el.scrollHeight;
  }, [text, live]);
  // The server streams a rolling tail — drop the leading partial word.
  const clean = text.replace(/^\S+\s+/, "");
  if (!clean) return null;
  return (
    <div
      ref={ref}
      className={`mt-1.5 max-h-[156px] overflow-y-auto scrollbar-none ${live ? "wf-fade-top" : ""}`}
    >
      <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-[1.6] text-foreground/50">
        {clean}
      </p>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────── */
function Sparkle({ className = "", size = 13 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={`shrink-0 ${className}`}>
      <path d="M8 0c0 4-4 8-8 8 4 0 8 4 8 8 0-4 4-8 8-8-4 0-8-4-8-8Z" fill="currentColor" />
    </svg>
  );
}

/* Timeline node — one dot per reasoning step, keyed off its status. */
function StepNode({ status }: { status: AgentStep["status"] }) {
  if (status === "running") {
    return (
      <span className="relative flex size-[13px] items-center justify-center">
        <span className="absolute inline-flex size-[13px] animate-ping rounded-full bg-ws-accent/35" />
        <span className="relative size-[7px] rounded-full bg-ws-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--ws-accent)_16%,transparent)]" />
      </span>
    );
  }
  if (status === "error") {
    return <span className="size-[7px] rounded-full bg-destructive/70" />;
  }
  return <span className="size-[6px] rounded-full bg-foreground/25" />;
}

/* Small screen glyph for touched-screen rows — a quiet linked-file feel. */
function ScreenIcon({ live }: { live: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={`shrink-0 ${live ? "text-ws-accent" : "text-foreground/40"}`}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 8.6h17" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

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

function CopyIcon({ done }: { done: boolean }) {
  return done ? (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Step row — a node on the reasoning rail + its content ────── */
function StepRow({ step, live, now, last }: { step: AgentStep; live: boolean; now: number; last: boolean }) {
  const running = step.status === "running" && live;
  const secs = running ? Math.floor((now - step.timestamp) / 1000) : 0;
  return (
    <div className="flex gap-3">
      {/* Node + connector rail — fixed-width column keeps the line straight */}
      <div className="flex w-[13px] flex-col items-center">
        <div className="flex h-[19px] items-center justify-center">
          <StepNode status={running ? "running" : step.status} />
        </div>
        {!last && (
          <div
            className={`w-px flex-1 ${
              running ? "bg-gradient-to-b from-ws-accent/35 to-foreground/[0.09]" : "bg-foreground/[0.09]"
            }`}
          />
        )}
      </div>
      {/* Content */}
      <div className={`min-w-0 flex-1 ${last ? "" : "pb-3"}`}>
        <div className="flex items-baseline gap-2">
          <span
            className={
              running
                ? "wf-shimmer-text text-[12.5px] font-medium leading-snug"
                : step.status === "error"
                ? "text-[12.5px] leading-snug text-destructive/75"
                : "text-[12.5px] leading-snug text-foreground/55"
            }
          >
            {cleanLabel(step)}
          </span>
          {running && secs >= 3 && (
            <span className="shrink-0 text-[11px] tabular-nums text-foreground/35">{secs}s</span>
          )}
        </div>
        {step.detail && (
          <p className="mt-0.5 truncate text-[11.5px] leading-snug text-foreground/40">{step.detail}</p>
        )}
        {step.reasoning && <ReasoningStream text={step.reasoning} live={running} />}
      </div>
    </div>
  );
}

/* ── Artifacts — screens the turn created or edited (Cursor file rows) ── */
type Artifact = { screenId: string; name: string; kind: "create" | "edit"; running: boolean };

function deriveArtifacts(steps: AgentStep[], nameById: Map<string, string>): Artifact[] {
  const order: string[] = [];
  const map = new Map<string, Artifact>();
  for (const s of steps) {
    const sid = s.screenId;
    if (!sid || sid === "ALL" || sid === "NEW") continue;
    const quoted = s.label.match(/["“]([^"”]+)["”]/)?.[1];
    const existing = map.get(sid);
    if (!existing) order.push(sid);
    map.set(sid, {
      screenId: sid,
      name: nameById.get(sid) || quoted || existing?.name || "Screen",
      kind: /creat|generat/i.test(s.label) || existing?.kind === "create" ? "create" : "edit",
      running: s.status === "running",
    });
  }
  return order.map((id) => map.get(id)!);
}

function ArtifactChips({ artifacts, onFocus }: { artifacts: Artifact[]; onFocus: (id: string) => void }) {
  if (!artifacts.length) return null;
  return (
    <div className="-mx-1.5 flex flex-col">
      {artifacts.map((a) => (
        <button
          key={a.screenId}
          onClick={() => onFocus(a.screenId)}
          className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-foreground/[0.045]"
        >
          <ScreenIcon live={a.running} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/70 transition-colors group-hover:text-foreground/90">
            {a.name}
          </span>
          {a.running ? (
            <span className="wf-shimmer-text shrink-0 text-[11.5px] font-medium">Designing…</span>
          ) : (
            <span className="shrink-0 text-[11.5px] tabular-nums text-foreground/35">
              {a.kind === "create" ? "Created" : "Edited"}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Message actions — copy the reply ─────────────────────────── */
function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="-ml-1.5 mt-0.5 flex items-center opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 focus-within:opacity-100">
      <button
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        title="Copy"
        className={`flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11.5px] font-medium transition-colors hover:bg-foreground/[0.055] ${
          copied ? "text-foreground/60" : "text-foreground/35 hover:text-foreground/65"
        }`}
      >
        <CopyIcon done={copied} />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/* ── Thinking block — reasoning disclosure ───────────────────────
   Boxless and typographic (Claude-style): one quiet line that shimmers
   while live and collapses to "Thought for Xs" when done. Expanding
   reveals a plain indented rail — no card, no accent tile. */
function ThinkingBlock({ steps, live }: { steps: AgentStep[]; live: boolean }) {
  const [open, setOpen] = useState(false);
  const now = useNow(live);
  useEffect(() => { setOpen(live); }, [live]);
  if (!steps.length) return null;

  const elapsed = live
    ? (now - steps[0].timestamp >= 1000 ? fmtElapsed(now - steps[0].timestamp) : "")
    : stepsElapsed(steps);
  const current = steps.findLast((s) => s.status === "running");
  // While live, hide error rows (transient retries); when done, keep the full trace.
  const visible = steps.filter((s) => s.status !== "error" || !live);

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className="group/th flex max-w-full items-center gap-1.5 text-left"
      >
        <span
          className={`min-w-0 truncate text-[13px] font-medium transition-colors ${
            live ? "wf-shimmer-text" : "text-foreground/45 group-hover/th:text-foreground/70"
          }`}
        >
          {live
            ? current ? cleanLabel(current) : "Thinking"
            : elapsed ? `Thought for ${elapsed}` : "Thought"}
        </span>
        <Chevron open={open} dim />
      </button>
      {open && visible.length > 0 && (
        <div className="mt-2.5">
          {visible.map((s, i) => (
            <StepRow key={s.id} step={s} live={live} now={now} last={i === visible.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Chat message ───────────────────────────────────────────── */
function ChatMessage({
  msg,
  live,
  onFocusScreen,
  nameById,
}: {
  msg: Message;
  live: boolean;
  onFocusScreen: (id: string) => void;
  nameById: Map<string, string>;
}) {
  const isUser = msg.role === "user";
  const text = useTypewriter(msg.content, !isUser && live ? 10 : 0);
  const hasSteps = !!(msg.agentSteps && msg.agentSteps.length > 0);

  if (isUser) {
    const imgs = msg.images?.length ? msg.images : msg.image ? [msg.image] : [];
    return (
      <div className="flex justify-end pl-10">
        <div className="max-w-[85%] rounded-[18px] bg-secondary px-3.5 py-2 text-[14.5px] leading-[1.5] tracking-[-0.006em] text-foreground">
          {imgs.length > 0 && (
            <div className="mb-2 flex flex-wrap justify-end gap-1.5">
              {imgs.map((src, i) => (
                <img key={i} src={src} alt="" className="max-h-32 rounded-[12px]" />
              ))}
            </div>
          )}
          {msg.content && <p className="m-0 whitespace-pre-wrap break-words">{msg.content}</p>}
        </div>
      </div>
    );
  }

  const artifacts = hasSteps ? deriveArtifacts(msg.agentSteps!, nameById) : [];

  return (
    <div className="group/message flex flex-col gap-2.5 pr-1">
      {hasSteps && <ThinkingBlock steps={msg.agentSteps!} live={live} />}
      {artifacts.length > 0 && <ArtifactChips artifacts={artifacts} onFocus={onFocusScreen} />}
      {msg.content ? (
        <div>
          <RichText text={text} />
          {!live && <MessageActions text={msg.content} />}
        </div>
      ) : (
        !hasSteps && (
          <div className="flex items-center gap-1.5 py-1">
            {[0, 150, 300].map((d) => (
              <span key={d} className="size-[5px] animate-pulse rounded-full bg-ws-accent/55" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )
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
  isActive,
  canSend,
  images,
  onRemoveImage,
  onAddFiles,
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
  isActive: boolean;
  canSend: boolean;
  images: string[];
  onRemoveImage: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  onAttach: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  selectedElement: { tagName: string; textContent?: string } | null;
  activeScreen: { name: string } | null;
  onClearElement: () => void;
  onClearScreen: () => void;
  charCount: number;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={e => {
        if (isActive || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={e => {
        if (isActive) return;
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
        if (files.length) onAddFiles(files);
      }}
      className={`wf-prompt-dock relative rounded-[26px] transition-[box-shadow] ${
        dragOver ? "shadow-[0_0_0_3px_rgba(108,99,246,0.16),var(--ws-soft-lg)]" : ""
      }`}
    >
      {/* Drag-and-drop overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[26px] border border-dashed border-ws-accent/55 bg-card/90">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ws-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 9l5-5 5 5M12 4v12" />
            </svg>
            Drop image{MAX_IMAGES > 1 ? "s" : ""} to attach
          </div>
        </div>
      )}

      {/* Context chips row (top) */}
      {(images.length > 0 || selectedElement || activeScreen) && (
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3.5">
          {activeScreen && (
            <span className="flex h-8 items-center gap-1.5 rounded-xl bg-card px-2.5 text-[11.5px] font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
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
            <span className="flex h-8 items-center gap-1.5 rounded-xl bg-card px-2.5 font-mono text-[10.5px] text-ws-accent shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span className="max-w-[80px] truncate">&lt;{selectedElement.tagName}&gt;</span>
              <button onClick={onClearElement} className="ml-0.5 text-ws-accent/40 hover:text-ws-accent">
                <svg width="6" height="6" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </span>
          )}
          {images.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="block h-8 w-10 rounded-lg object-cover" />
              <button className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-background text-foreground/40 ring-1 ring-border hover:text-foreground/70" onClick={() => onRemoveImage(i)}>
                <svg width="5" height="5" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => { if (e.target.value.length <= MAX_CHARS) onChange(e.target.value); }}
        onKeyDown={onKey}
        onPaste={onPaste}
        placeholder={isActive ? "Working on your changes…" : "Describe the change you want"}
        disabled={isActive}
        rows={1}
        className="min-h-[46px] max-h-[160px] w-full resize-none overflow-y-auto bg-transparent px-3.5 pb-0 pt-3 text-[14.5px] leading-[1.5] tracking-[-0.006em] text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
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
            className="flex size-8 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/[0.07] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
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
              className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[.97]"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect x="1" y="1" width="8" height="8" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button
              onClick={canSend ? onSend : undefined}
              disabled={!canSend}
              title="Send"
              className={`flex size-8 items-center justify-center rounded-full transition-[background-color,color,transform] ${
                canSend
                  ? "bg-foreground text-background shadow-[var(--ws-raised)] hover:bg-foreground/85 active:scale-[.97]"
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
  focusScreen,
}: WorkspaceSidebarProps) {
  const { state, dispatch } = useWorkspace();
  const { app, activeScreenId, isGenerating, isSending, selectedElement } = state;

  const [inputValue, setInputValue] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeScreen = useMemo(
    () => app.screens.find(s => s.id === activeScreenId),
    [app.screens, activeScreenId]
  );
  const screenNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of app.screens) m.set(s.id, s.name);
    return m;
  }, [app.screens]);
  const isActive = isGenerating || isSending;
  const canSend = !!((inputValue.trim() || images.length) && !isActive);
  const lastMessageStepsLength = app.messages.at(-1)?.agentSteps?.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [app.messages.length, lastMessageStepsLength, isSending]);

  const addImageFiles = useCallback(async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const resized: string[] = [];
    for (const f of imgs) {
      try { resized.push(await resizeImage(f)); } catch { /* skip unreadable image */ }
    }
    if (!resized.length) return;
    setImages(prev => [...prev, ...resized].slice(0, MAX_IMAGES));
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      addImageFiles(files);
    }
  }, [addImageFiles]);

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

    const userMsg: Message = { id: uuid(), role: "user", content: inputValue.trim(), ...(images.length ? { images } : {}), timestamp: Date.now() };
    const aiId = uuid();

    dispatch({ type: "ADD_MESSAGE", message: userMsg });
    dispatch({ type: "ADD_MESSAGE", message: { id: aiId, role: "assistant", content: "", timestamp: Date.now(), agentSteps: [] } });

    const imgs = images;
    const el = selectedElement ? { xpath: selectedElement.xpath, tagName: selectedElement.tagName, textContent: selectedElement.textContent } : null;

    setInputValue(""); setImages([]);
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
          ...(imgs.length ? { images: imgs } : {}), ...(el ? { selectedElement: el } : {}),
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
    <div className="wf-studio-sidebar flex h-full w-full flex-col bg-background">
      {/* ── Messages ── */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none pt-1">
        {app.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2.5 px-8 pb-16 text-center">
            <Sparkle size={18} className="text-foreground/25" />
            <div className="flex max-w-[232px] flex-col gap-1">
              <p className="text-[14px] font-medium tracking-[-0.01em] text-foreground/85">What are we designing?</p>
              <p className="text-[13px] leading-[1.55] text-muted-foreground">
                Select an element on the canvas, then describe the change you want.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-4 pb-4 pt-3">
            {app.messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                live={isActive && msg.role === "assistant" && i === app.messages.length - 1}
                onFocusScreen={focusScreen}
                nameById={screenNameById}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* ── Prompt box ── */}
      <div className="wf-prompt-region shrink-0 px-3 pb-3 pt-5">
        <PromptBox
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onStop={handleStop}
          onPaste={handlePaste}
          onKey={onKey}
          isActive={isActive}
          canSend={canSend}
          images={images}
          onRemoveImage={i => setImages(prev => prev.filter((_, idx) => idx !== i))}
          onAddFiles={addImageFiles}
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
          multiple
          className="hidden"
          onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) addImageFiles(files); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}
