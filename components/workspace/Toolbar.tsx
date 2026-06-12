"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/lib/store/use-workspace";

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

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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
    <header className="flex h-11 w-full shrink-0 items-center gap-0 border-b border-white/[0.06] bg-[oklch(0.115_0.004_280)] px-2">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/80"
        aria-label="Back to dashboard"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3L5 7l4 4" />
        </svg>
      </Link>

      {/* Divider */}
      <span className="mx-1.5 h-4 w-px shrink-0 bg-white/[0.08]" />

      {/* Logo mark */}
      <img src="/logo.png" className="w-5" />

      {/* Divider */}
      <span className="mr-2 h-4 w-px shrink-0 bg-white/[0.08]" />

      {/* App name */}
      <span className="max-w-[200px] truncate text-[12.5px] font-medium tracking-[-0.01em] text-white/75">
        {app.name}
      </span>

      {/* Breadcrumb sep */}
      {screenCount > 0 && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mx-1 shrink-0 text-white/20">
          <path d="M4.5 2.5l3 3.5-3 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {/* Screen dropdown */}
      <div ref={containerRef} className="relative">
        {screenCount > 0 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-white/55 transition-all hover:bg-white/[0.06] hover:text-white/80"
            aria-expanded={open}
          >
            {activeScreen ? (
              <span className="max-w-[160px] truncate">{activeScreen.name}</span>
            ) : (
              <span>{screenCount} screen{screenCount !== 1 ? "s" : ""}</span>
            )}
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className={`shrink-0 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {open && screenCount > 0 && (
          <div className="absolute left-0 top-full z-50 mt-2 max-h-[60vh] min-w-[240px] overflow-y-auto rounded-xl border border-white/[0.08] bg-[oklch(0.16_0.004_280)] p-1 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.06)]">
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
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition-all ${
                    isActive ? "bg-white/[0.08] text-white/90" : "text-white/55 hover:bg-white/[0.05] hover:text-white/80"
                  }`}
                >
                  <span className={`grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-semibold tabular-nums ${
                    isActive ? "bg-ws-accent/20 text-ws-accent" : "bg-white/[0.06] text-white/30"
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate text-[12px] font-medium">{screen.name}</span>
                  {isActive && (
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-ws-accent">
                      <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {screen.isStreaming && (
                    <span className="size-1.5 animate-pulse rounded-full bg-ws-accent" />
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
