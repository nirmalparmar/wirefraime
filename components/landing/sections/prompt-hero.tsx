"use client";

import Link from "next/link";
import { CHIPS } from "@/components/landing/home-data";
import { STARTING_PRICE } from "@/lib/pricing";
import { CursorPill, ScreenTile, Starburst } from "./accents";

export function PromptHero({
  prompt,
  onPromptChange,
  onPromptSubmit,
}: {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onPromptSubmit: () => void;
}) {
  return (
    <section className="relative flex min-h-[94svh] flex-col items-center justify-center px-6 pb-20 pt-[126px]">
      {/* Editorial headline with the three inline accent objects woven in */}
      <h1 className="animate-fade-rise mx-auto max-w-[1000px] text-center font-sans text-[clamp(38px,7.4vw,84px)] font-bold leading-[1.14] tracking-[-0.035em] text-foreground">
        Design every{" "}
        <Starburst className="h-[0.82em] w-[0.82em]" />{" "}
        screen
        <br className="hidden sm:block" />{" "}
        <ScreenTile className="h-[0.9em] w-[1.4em]" /> before you{" "}
        <CursorPill className="h-[0.82em]" /> write code
      </h1>

      {/* Clean prompt bar — the product's core interaction, kept minimal */}
      <div className="animate-fade-rise-delay mt-11 w-full max-w-[560px]">
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((c) => (
            <button
              key={c.label}
              className="cursor-pointer whitespace-nowrap rounded-full bg-muted px-[14px] py-[6px] text-[12.5px] font-normal text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              type="button"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

    </section>
  );
}
