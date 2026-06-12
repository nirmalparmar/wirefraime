"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function HeroChip({
  tone,
  children,
}: {
  tone: "orange" | "violet";
  children: ReactNode;
}) {
  const styles =
    tone === "orange"
      ? "bg-[#ffb36b] text-[#713600] shadow-[0_18px_42px_-26px_rgba(255,157,82,0.9)]"
      : "bg-[#8f72ff] text-[#20125f] shadow-[0_18px_42px_-26px_rgba(139,108,255,0.9)]";

  return (
    <span
      aria-hidden
      className={`mx-2 inline-flex size-[0.92em] translate-y-[0.08em] rotate-[-5deg] items-center justify-center rounded-[0.24em] align-baseline ${styles}`}
    >
      <span className="grid size-[0.56em] place-items-center">{children}</span>
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-5 pb-20 pt-32 text-center md:px-10 md:pb-24 md:pt-40" aria-label="Hero">
      {/* <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(191,90,60,0.18),transparent_28rem),radial-gradient(circle_at_84%_10%,rgba(13,153,255,0.12),transparent_30rem)]" /> */}

      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            AI wireframe tool · Public beta
          </span>
        </div>

        <h1 className="mx-auto max-w-5xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
          Describe your
          <HeroChip tone="orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="3" width="12" height="18" rx="2" />
              <path d="M11 18h2" />
            </svg>
          </HeroChip>
          app. Get every
          <HeroChip tone="violet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v3M12 18v3M5 12H2M22 12h-3M6 6l-2-2M20 20l-2-2M6 18l-2 2M20 4l-2 2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </HeroChip>
          screen designed.
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          AI wireframes your whole app, every screen, every state, every flow.
          Ship-ready UI in seconds, not weeks.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="group inline-flex h-[52px] items-center gap-3 rounded-full bg-foreground px-7 text-[13px] font-semibold uppercase tracking-[0.16em] text-background shadow-[0_16px_38px_-22px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 active:translate-y-0"
          >
            Start designing
            <span className="grid size-5 place-items-center rounded-full bg-background/15 transition group-hover:translate-x-0.5">
              <ArrowIcon />
            </span>
          </Link>
          <a
            href="#features"
            className="inline-flex h-[52px] items-center rounded-full border border-foreground/10 px-7 text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition hover:bg-foreground/[0.04] hover:text-foreground"
          >
            See features
          </a>
        </div>
      </div>
    </section>
  );
}
