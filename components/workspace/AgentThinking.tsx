"use client";

import { useState } from "react";
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

/* ── Elapsed time formatter ──────────────────────────────── */

function elapsed(steps: AgentStep[]): string {
  if (steps.length === 0) return "";
  const first = steps[0].timestamp;
  const last = steps[steps.length - 1].timestamp;
  const ms = last - first;
  if (ms < 1000) return "";
  return `${(ms / 1000).toFixed(1)}s`;
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

  if (steps.length === 0) return null;

  const doneCount = steps.filter((s) => s.status === "done").length;
  const allDone = doneCount === steps.length && !isLive;
  const time = elapsed(steps);

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

        {time && !isLive && (
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
