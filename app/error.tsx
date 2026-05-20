"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SERIF, SANS } from "@/lib/constants";

/**
 * Global error boundary for all routes that don't define their own error.tsx.
 * Catches unhandled runtime errors and unhandled promise rejections in client
 * components, plus any errors thrown from server components during render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to monitoring — replace with Sentry/PostHog if/when wired up
    console.error("[global-error]", error);
  }, [error]);

  return (
    <div
      className="grid min-h-screen place-items-center bg-background px-6 py-12 text-foreground"
      style={{ fontFamily: SANS }}
    >
      <div className="liquid-glass-adaptive w-full max-w-md rounded-2xl p-8 text-center">
        <div className="mx-auto mb-6 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>

        <h1
          className="mb-2 text-[24px] leading-tight tracking-tight text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Something went wrong
        </h1>
        <p className="mb-6 text-[14px] leading-relaxed text-muted-foreground">
          We hit an unexpected error. You can try again, or head back to your dashboard.
        </p>

        {error.digest && (
          <p className="mb-6 inline-block rounded-full bg-foreground/[0.04] px-3 py-1 font-mono text-[11px] text-muted-foreground">
            ref: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="clay" onClick={() => reset()} className="gap-2">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8a5 5 0 0 1 8.5-3.5L13 6" />
              <path d="M13 3v3h-3" />
            </svg>
            Try again
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
