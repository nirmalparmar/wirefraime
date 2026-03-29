"use client";

import { useWorkspace } from "@/lib/store/use-workspace";
import { SANS, SERIF } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function ScreenSidebar() {
  const { state, dispatch } = useWorkspace();
  const { app, activeScreenId, isGenerating } = state;
  const screens = app.screens;

  return (
    <div className="w-[220px] shrink-0 bg-card/50 border-r border-border flex flex-col overflow-hidden"
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3.5 shrink-0">
        <div className="flex items-center justify-between">
          <p
            className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em]"
            style={{ fontFamily: SANS }}
          >
            Screens
          </p>
          {screens.length > 0 && (
            <span
              className="text-[11px] font-medium text-muted-foreground/50 tabular-nums"
              style={{ fontFamily: SANS }}
            >
              {screens.length}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Screen list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {screens.length === 0 && isGenerating && (
          <div className="px-3 py-4 flex flex-col items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--ws-accent)", animation: "wfPulse 1.4s ease infinite" }}
            />
            <p className="text-[12px] text-muted-foreground/60 text-center leading-relaxed" style={{ fontFamily: SANS }}>
              Building screens...
            </p>
          </div>
        )}
        {screens.length === 0 && !isGenerating && (
          <div className="px-3 py-6 text-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 text-muted-foreground/30">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
              <rect x="6" y="12" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
              <rect x="13" y="12" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
            </svg>
            <p className="text-[12px] text-muted-foreground/50" style={{ fontFamily: SANS }}>
              No screens yet
            </p>
          </div>
        )}

        {screens.map((screen, i) => {
          const isActive = activeScreenId === screen.id;
          return (
            <button
              key={screen.id}
              onClick={() => dispatch({ type: "SET_ACTIVE_SCREEN", id: screen.id })}
              className={cn(
                "w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-left transition-all duration-150",
                isActive
                  ? "bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              style={{ fontFamily: SANS }}
            >
              {/* Status indicator */}
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0 transition-colors"
                style={{
                  background: screen.isStreaming
                    ? "var(--ws-accent)"
                    : isActive
                    ? "var(--primary)"
                    : "var(--muted-foreground)",
                  opacity: screen.isStreaming || isActive ? 1 : 0.3,
                  animation: screen.isStreaming ? "wfPulse 1.4s ease infinite" : "none",
                }}
              />

              {/* Screen number + name */}
              <span className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="text-[10px] font-bold tabular-nums shrink-0 w-4 text-center rounded"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {i + 1}
                </span>
                <span className="truncate text-[13px] font-medium">
                  {screen.name || `Screen ${i + 1}`}
                </span>
              </span>

              {/* Streaming badge */}
              {screen.isStreaming && (
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--ws-accent)" }}>
                  live
                </span>
              )}
            </button>
          );
        })}

        {/* Generating skeleton */}
        {isGenerating && screens.length > 0 && (
          <div className="flex items-center gap-2.5 px-3 h-9">
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{ background: "var(--ws-accent)", animation: "wfPulse 1.4s ease infinite" }}
            />
            <div className="h-2.5 w-24 bg-accent rounded-md" style={{ animation: "skelPulse 2.8s ease infinite" }} />
          </div>
        )}
      </div>
    </div>
  );
}
