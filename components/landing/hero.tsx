"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/* ── Inline icon chip — small rounded square embedded in the headline ── */
function Chip({
  bg,
  fg,
  ring,
  tilt,
  shadow,
  children,
}: {
  bg: string;
  fg: string;
  ring: string;
  tilt: number;
  shadow: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className="relative mx-1.5 inline-flex h-[0.9em] w-[0.9em] translate-y-[0.06em] items-center justify-center rounded-[0.22em] align-middle md:mx-2"
      style={{
        background: bg,
        color: fg,
        boxShadow: `inset 0 0 0 1px ${ring}, ${shadow}`,
        transform: `rotate(${tilt}deg)`,
      }}
    >
      <span className="grid h-[60%] w-[60%] place-items-center">{children}</span>
    </span>
  );
}

/* ── Figma-style selection: dashed/solid blue outline with 4 corner handles
       plus a designer's cursor arrow at the bottom-right corner ── */
function Selected({ children }: { children: ReactNode }) {
  return (
    <span className="relative mx-1 inline-block px-[0.18em] py-[0.04em] align-middle md:mx-2">
      <span className="relative z-10">{children}</span>

      {/* Solid blue outline */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[6px] border-2 border-[#0d99ff]"
      />

      {/* Corner handles */}
      {[
        "-left-[4px] -top-[4px]",
        "-right-[4px] -top-[4px]",
        "-left-[4px] -bottom-[4px]",
        "-right-[4px] -bottom-[4px]",
      ].map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={`absolute size-2 rounded-[1px] border-[1.5px] border-[#0d99ff] bg-background ${pos}`}
        />
      ))}

      {/* Designer cursor arrow at the bottom-right of the selection */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-[-26px] top-[calc(100%-8px)] z-20"
      >
        <svg
          width="22"
          height="26"
          viewBox="0 0 22 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
        >
          <path
            d="M3 2 L3 19 L7.8 14.7 L10.6 21.5 L13.7 20.2 L10.9 13.4 L17.2 13.4 Z"
            fill="#0d99ff"
            stroke="white"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24" aria-label="Hero">
      <div className="relative mx-auto max-w-6xl px-5 md:px-10">
        <div className="relative px-2 pb-28 pt-10 text-center md:px-12 md:pb-36">
          {/* Eyebrow */}
          <div className="mb-9 flex items-center justify-center gap-2 animate-[fadeUp_0.5s_ease_both]">
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              AI wireframe tool · Public beta
            </span>
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-[1000px] animate-[fadeUp_0.6s_0.08s_ease_both] text-[clamp(40px,7vw,84px)] font-semibold leading-[1.04] tracking-[-0.035em] text-foreground">
            Describe your
            <Chip
              bg="linear-gradient(160deg,#ffd9b8,#ff9d52)"
              fg="#7a3a00"
              ring="rgba(255,156,82,0.45)"
              tilt={-6}
              shadow="0 8px 18px -8px rgba(255,140,40,0.55)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="3" width="12" height="18" rx="2" />
                <path d="M11 18h2" />
              </svg>
            </Chip>
            app. Get every
            <Chip
              bg="linear-gradient(160deg,#d6c9ff,#8b6cff)"
              fg="#2e1c7a"
              ring="rgba(139,108,255,0.5)"
              tilt={5}
              shadow="0 8px 18px -8px rgba(120,90,255,0.55)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3M12 18v3M5 12H2M22 12h-3M6 6l-2-2M20 20l-2-2M6 18l-2 2M20 4l-2 2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Chip>
            screen
            <br className="hidden md:block" /> <Selected>designed</Selected>.
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-7 max-w-xl animate-[fadeUp_0.6s_0.16s_ease_both] text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            AI wireframes your whole app, every screen, every state, every flow.
            Ship-ready UI in seconds, not weeks.
          </p>

          {/* CTA */}
          <div className="mt-12 flex items-center justify-center animate-[fadeUp_0.6s_0.24s_ease_both]">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-3 rounded-full bg-foreground px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-background shadow-[0_12px_30px_-10px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Start designing
              <span
                aria-hidden
                className="grid size-5 place-items-center rounded-full bg-background/15 transition-transform group-hover:translate-x-0.5"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
