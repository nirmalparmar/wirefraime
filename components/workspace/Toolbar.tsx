"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/store/use-workspace";
import { Button } from "@/components/ui/button";

export function Toolbar() {
  const { state } = useWorkspace();
  const { app } = state;
  const screenCount = app.screens.length;

  return (
    <header className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-2 shadow-2xl backdrop-blur-2xl">
      <Button variant="ghost" size="icon-sm" asChild className="h-8 w-8 text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
        <Link href="/dashboard">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3L5 7l4 4" />
          </svg>
        </Link>
      </Button>

      <span className="text-[13px] font-medium text-foreground/90 tracking-tight">
        {app.name}
      </span>

      {screenCount > 0 && (
        <span className="rounded-md bg-foreground/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {screenCount} screen{screenCount !== 1 ? "s" : ""}
        </span>
      )}
    </header>
  );
}
