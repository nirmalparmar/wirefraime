"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";

const SOFT_SHADOW = "shadow-[var(--ws-soft)]";

export function Toolbar({
  onFocusScreen,
}: {
  onFocusScreen?: (screenId: string) => void;
}) {
  const { state, dispatch } = useWorkspace();
  const { app, activeScreenId } = state;
  const screenCount = app.screens.length;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click + escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const activeScreen = app.screens.find((s) => s.id === activeScreenId);

  return (
    <header className={`absolute left-4 top-4 z-30 flex items-center gap-1 rounded-full bg-card py-1.5 pl-1.5 pr-1.5 ${SOFT_SHADOW}`}>
      <Link
        href="/dashboard"
        className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground"
        aria-label="Back to dashboard"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3L5 7l4 4" />
        </svg>
      </Link>

      <span className="px-1 text-[13px] font-medium tracking-tight text-foreground/90">
        {app.name}
      </span>

      {/* Screen jump dropdown */}
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={screenCount === 0}
          className="flex items-center gap-1 rounded-full bg-foreground/[0.06] py-1 pl-2 pr-1.5 text-[11px] font-medium tabular-nums text-muted-foreground transition hover:bg-foreground/[0.08] hover:text-foreground disabled:cursor-default disabled:opacity-50"
          aria-expanded={open}
          aria-label="Jump to screen"
        >
          {activeScreen ? (
            <span className="max-w-[120px] truncate text-foreground/80">{activeScreen.name}</span>
          ) : (
            <span>{screenCount} screen{screenCount !== 1 ? "s" : ""}</span>
          )}
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className={`text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && screenCount > 0 && (
          <div className={`absolute left-0 top-full mt-2 min-w-[220px] max-h-[60vh] overflow-y-auto rounded-2xl bg-card p-1 ${SOFT_SHADOW}`}>
            {app.screens.map((screen, idx) => {
              const isActive = screen.id === activeScreenId;
              return (
                <button
                  key={screen.id}
                  onClick={() => {
                    onFocusScreen?.(screen.id);
                    dispatch({ type: "SET_ACTIVE_SCREEN", id: screen.id });
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                    isActive
                      ? "bg-[#0d99ff]/10 text-[#0d99ff]"
                      : "text-foreground/80 hover:bg-foreground/[0.05] hover:text-foreground"
                  }`}
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-md bg-foreground/[0.06] text-[10px] font-medium tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate text-[12px] font-medium">{screen.name}</span>
                  {screen.isStreaming && (
                    <span className="size-1.5 animate-pulse rounded-full bg-[#0d99ff]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
