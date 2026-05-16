"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/store/use-workspace";

const SOFT_SHADOW = "shadow-[var(--ws-soft)]";

export function Toolbar() {
  const { state } = useWorkspace();
  const { app } = state;
  const screenCount = app.screens.length;

  return (
    <header
      className={`absolute left-4 top-4 z-30 flex items-center gap-1 rounded-full bg-card py-1.5 pl-1.5 pr-3 ${SOFT_SHADOW}`}
    >
      <Link
        href="/dashboard"
        className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground"
        aria-label="Back to dashboard"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3L5 7l4 4" />
        </svg>
      </Link>

      <span className="text-[13px] font-medium tracking-tight text-foreground/90">{app.name}</span>

      {screenCount > 0 && (
        <span className="ml-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground shadow-[var(--ws-inset)]">
          {screenCount} screen{screenCount !== 1 ? "s" : ""}
        </span>
      )}
    </header>
  );
}
