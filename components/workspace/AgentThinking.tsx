"use client";

import { useEffect, useState } from "react";
import type { AgentStep } from "@/lib/types";

/* ── Status icons ─────────────────────────────────────────── */

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="shrink-0 animate-spin text-primary"
    >
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <path
        d="M12.5 7a5.5 5.5 0 00-5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="shrink-0 text-green-500"
    >
      <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.15" />
      <path
        d="M4.5 7l2 2 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="shrink-0 text-destructive"
    >
      <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.15" />
      <path
        d="M5 5l4 4M9 5l-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PendingDot() {
  return (
    <div className="flex size-3.5 shrink-0 items-center justify-center">
      <div className="size-1.5 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

function StepIcon({ status }: { status: AgentStep["status"] }) {
  switch (status) {
    case "running":
      return <Spinner />;
    case "done":
      return <CheckIcon />;
    case "error":
      return <ErrorIcon />;
    default:
      return <PendingDot />;
  }
}

/* ── Main component ──────────────────────────────────────── */

interface AgentThinkingBlockProps {
  steps: AgentStep[];
  isLive: boolean;
  defaultExpanded?: boolean;
}

export function AgentThinkingBlock({
  steps,
  isLive,
  defaultExpanded = true,
}: AgentThinkingBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Live clock: re-render once a second while generating so elapsed timers tick
  // and the panel never looks frozen during long model calls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  if (steps.length === 0) return null;

  const doneCount = steps.filter((s) => s.status === "done").length;
  const allDone = doneCount === steps.length && !isLive;
  const firstTs = steps[0].timestamp;
  const endTs = isLive ? now : steps[steps.length - 1].timestamp;
  const totalMs = endTs - firstTs;
  const time = totalMs >= 1000 ? `${(totalMs / 1000).toFixed(isLive ? 0 : 1)}s` : "";

  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-accent/50"
      >
        {isLive ? (
          <Spinner />
        ) : allDone ? (
          <CheckIcon />
        ) : (
          <ErrorIcon />
        )}

        <span className="flex-1 text-xs font-medium text-foreground">
          {isLive
            ? "Thinking..."
            : allDone
              ? `Completed ${doneCount} step${doneCount !== 1 ? "s" : ""}`
              : "Finished with errors"}
        </span>

        {time && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {time}
          </span>
        )}

        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <path
            d="M3 4.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Steps list */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-border px-3.5 py-2 space-y-1.5">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-all ${
                step.status === "running"
                  ? "bg-primary/5 text-foreground"
                  : step.status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              <div className="mt-px">
                <StepIcon status={step.status} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium">{step.label}</span>
                {step.detail && (
                  <span className="ml-1.5 text-muted-foreground/60">
                    {step.detail}
                  </span>
                )}
                {step.status === "running" && now - step.timestamp >= 2000 && (
                  <span className="ml-1.5 tabular-nums text-muted-foreground/50">
                    · {Math.floor((now - step.timestamp) / 1000)}s
                  </span>
                )}
                {step.reasoning && (
                  <div className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 px-2 py-1 font-mono text-[10.5px] leading-snug text-muted-foreground/80">
                    {step.reasoning}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
