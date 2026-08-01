"use client";

import Link from "next/link";
import { Starburst } from "./accents";

export function FooterCtaSection({
  prompt,
  onPromptChange,
  onPromptSubmit,
}: {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onPromptSubmit: () => void;
}) {
  return (
    <section className="relative border-y border-border px-6 py-24 text-center md:px-10 md:py-32">
      <div className="fade-up relative z-[1] mx-auto max-w-[600px]">
        <Starburst className="mx-auto mb-6 h-11 w-11" />
        <h2 className="mb-5 text-[clamp(34px,5vw,54px)] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground">
          Your app starts
          <br />
          right here.
        </h2>
        <p className="mb-10 text-[16px] leading-relaxed text-muted-foreground">
          Same box as before — describe your product and watch it take shape.
        </p>

        {/* Second conversion point: the same prompt box the hero opens with */}
        <div className="mx-auto flex w-full max-w-[540px] items-center gap-2 rounded-full border border-border bg-card py-2 pl-6 pr-2 shadow-[var(--wf-shadow-prompt)] transition-[box-shadow,border-color] focus-within:border-ring focus-within:shadow-[var(--wf-shadow-prompt-focus)]">
          <input
            type="text"
            className="w-full border-none bg-transparent font-sans text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Describe the app you want to design…"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onPromptSubmit();
              }
            }}
          />
          <button
            className="wf-lifted flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            type="button"
            aria-label="Submit"
            onClick={onPromptSubmit}
          >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <p className="mt-6 text-[13px] text-muted-foreground">
          Only need a landing page?{" "}
          <Link href="/landing-page-builder" className="text-foreground underline underline-offset-4">
            Try the landing page builder
          </Link>
        </p>
      </div>
    </section>
  );
}
