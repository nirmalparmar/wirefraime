"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";
import type { Message, AgentStep } from "@/lib/types";

/* ── Helpers ────────────────────────────────────────────────── */

function stepsElapsed(steps: AgentStep[]): string {
  if (steps.length < 2) return "";
  const first = steps[0].timestamp;
  const last = steps[steps.length - 1].timestamp;
  const secs = (last - first) / 1000;
  if (secs < 60) return `${Math.round(secs)}s`;
  return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
}

/** Get a clean display label for a step — hide implementation details */
function cleanStepLabel(step: AgentStep): string {
  const label = step.label;
  if (label.toLowerCase().includes("fast apply failed")) return "Retried with full generation";
  if (label.toLowerCase().includes("regenerating full screen")) return "Regenerating screen";
  return label;
}

/* ── Typewriter hook ──────────────────────────────────────── */

function useTypewriter(text: string, speed: number = 12) {
  const [displayed, setDisplayed] = useState("");
  const prevTextRef = useRef("");

  useEffect(() => {
    if (!text || text.length < prevTextRef.current.length) {
      setDisplayed(text);
      prevTextRef.current = text;
      return;
    }
    if (text === prevTextRef.current) return;

    prevTextRef.current = text;
    let i = displayed.length;
    setDisplayed(text.slice(0, i));

    const timer = setInterval(() => {
      i += 1;
      if (i >= text.length) {
        setDisplayed(text);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  return displayed;
}

/* ── Step row ──────────────────────────────────────────────── */

function StepRow({ step, isLive }: { step: AgentStep; isLive: boolean }) {
  return (
    <div className="py-0.5">
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        {step.status === "running" && isLive ? (
          <span className="mt-[3px] size-1.5 shrink-0 animate-pulse rounded-full bg-blue-400" />
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mt-[2px] shrink-0 text-emerald-500 dark:text-emerald-400">
            <path d="M2.5 5.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="text-[11px] font-medium leading-snug">{cleanStepLabel(step)}</span>
      </div>
      {step.detail && (
        <p className={`ml-[18px] mt-0.5 text-[10px] leading-snug ${isLive ? "text-muted-foreground/50" : "text-muted-foreground/40"}`}>
          {step.detail}
        </p>
      )}
    </div>
  );
}

/* ── Thinking block ────────────────────────────────────────── */

function ThinkingBlock({ steps, isLive }: { steps: AgentStep[]; isLive: boolean }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isLive) setExpanded(true);
    else setExpanded(false);
  }, [isLive]);

  if (steps.length === 0) return null;

  const elapsed = stepsElapsed(steps);
  const currentStep = steps.findLast((s) => s.status === "running");
  const visibleSteps = steps.filter((s) => s.status !== "error");

  if (isLive) {
    const liveLabel = currentStep
      ? cleanStepLabel(currentStep)
      : "Thinking...";

    return (
      <div className="my-0.5">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground/70"
        >
          <span className="flex items-center gap-0.5">
            <span className="size-1 animate-pulse rounded-full bg-blue-400" />
            <span className="size-1 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />
            <span className="size-1 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />
          </span>
          <span className="text-foreground/60">{liveLabel}</span>
          {elapsed && <span className="text-[10px] text-muted-foreground/40">{elapsed}</span>}
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            className={`shrink-0 text-foreground/30 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {expanded && visibleSteps.length > 0 && (
          <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3 pb-1">
            {visibleSteps.map((step) => (
              <StepRow key={step.id} step={step} isLive={true} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="my-0.5">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-foreground/30 transition-colors hover:text-muted-foreground"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1" />
          <path d="M5 3.5v2l1.2 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{elapsed ? `Thought for ${elapsed}` : "Thought about this"}</span>
        <svg
          width="8" height="8" viewBox="0 0 10 10" fill="none"
          className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && visibleSteps.length > 0 && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3 pb-1">
          {visibleSteps.map((step) => (
            <StepRow key={step.id} step={step} isLive={false} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Message component ──────────────────────────────────────── */

function ChatMessage({ msg, isLive }: { msg: Message; isLive: boolean }) {
  const isUser = msg.role === "user";
  const hasSteps = msg.agentSteps && msg.agentSteps.length > 0;
  const displayText = useTypewriter(msg.content, !isUser && isLive ? 8 : 0);

  if (isUser) {
    return (
      <div className="group relative">
        <div className="rounded-xl bg-foreground/[0.06] px-3 py-2 text-[13px] leading-relaxed text-foreground/90">
          {msg.image && (
            <img src={msg.image} alt="" className="mb-2 max-h-32 rounded-lg border border-border" />
          )}
          <p className="m-0 whitespace-pre-wrap break-words">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {hasSteps && <ThinkingBlock steps={msg.agentSteps!} isLive={isLive} />}

      {msg.content && (
        <div className="text-[13px] leading-[1.7] text-foreground/80">
          <p className="m-0 whitespace-pre-wrap break-words">
            {isUser ? msg.content : displayText}
          </p>
        </div>
      )}

      {!msg.content && !hasSteps && (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <span className="size-1 animate-pulse rounded-full bg-blue-400" />
            <span className="size-1 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />
            <span className="size-1 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />
          </span>
          Thinking...
        </div>
      )}
    </div>
  );
}

/* ── Floating glass chat panel ──────────────────────────────── */

export function ChatBar() {
  const { state } = useWorkspace();
  const { app, isSending, isGenerating } = state;
  const [expanded, setExpanded] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [app.messages.length, app.messages[app.messages.length - 1]?.agentSteps?.length, isSending]);

  const hasMessages = app.messages.length > 0;
  const isActive = isSending || isGenerating;

  if (!hasMessages && !isGenerating) return null;

  return (
    <>
      {expanded && (
        <div
          className="absolute left-4 top-18 z-20 flex max-h-[calc(100%-140px)] w-[300px] flex-col overflow-hidden rounded-2xl border border-border bg-background/80 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              {isActive && (
                <span className="flex items-center gap-1">
                  <span className="size-1.5 animate-pulse rounded-full bg-blue-400" />
                  <span className="size-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />
                </span>
              )}
              <span className="text-[12px] font-medium text-muted-foreground">
                {isActive ? "Agent working..." : "Agent"}
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="grid size-6 place-items-center rounded-md text-foreground/30 transition-colors hover:bg-foreground/10 hover:text-foreground/60"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3 space-y-3">
            {app.messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isLive={(isSending || isGenerating) && msg.role === "assistant" && i === app.messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="absolute bottom-20 left-4 z-30 flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-2.5 shadow-2xl backdrop-blur-2xl transition-colors hover:bg-background/90"
        >
          {isActive && (
            <span className="flex items-center gap-0.5">
              <span className="size-1.5 animate-pulse rounded-full bg-blue-400" />
              <span className="size-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />
            </span>
          )}
          {!isActive && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
          <span className="text-[12px] font-medium text-muted-foreground">Agent log</span>
        </button>
      )}
    </>
  );
}
