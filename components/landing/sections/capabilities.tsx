"use client";

import { useEffect, useState } from "react";
import { Em, Eyebrow, SectionHeading } from "./section-heading";

const TABS = [
  {
    title: "Every screen, one system",
    desc: "Screens, states, and a design system — generated together, kept consistent.",
  },
  {
    title: "Edit by chatting",
    desc: "Click anything, describe the change, and watch the design update in place.",
  },
  {
    title: "Export real code",
    desc: "Clean HTML + Tailwind, or a full Next.js project — readable and yours.",
  },
];

const ROTATE_MS = 5000;
const TICK_MS = 100;

/** Progress-bar fill per tab — the hero accent trio (amber / lime / violet). */
const TAB_BAR = ["bg-[#f5b301]", "bg-[#8fb52b]", "bg-[#8b5cf6]"];

export function CapabilitiesSection() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setActive((a) => (a + 1) % TABS.length);
          return 0;
        }
        return p + (100 * TICK_MS) / ROTATE_MS;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  function selectTab(i: number) {
    setActive(i);
    setProgress(0);
  }

  return (
    <section className="px-6 py-20 md:px-10 md:py-28" id="features">
      <div className="mx-auto max-w-[1080px]">
        <SectionHeading
          eyebrow={<Eyebrow tone="violet">Capabilities</Eyebrow>}
          title={
            <>
              Not six tools. <Em>One system.</Em>
            </>
          }
        />

        <div className="fade-up mt-12 overflow-hidden rounded-[20px] border border-border">
          {/* Live preview panel */}
          <div className="relative min-h-[280px] overflow-hidden bg-card md:min-h-[400px]">
            {TABS.map((_, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-500 ease-out ${
                  i === active ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {i === 0 && <SystemPreview />}
                {i === 1 && <ChatPreview />}
                {i === 2 && <ExportPreview />}
              </div>
            ))}
          </div>

          {/* Caption strip — one flush bordered row, no gaps */}
          <div className="grid grid-cols-1 border-t border-border sm:grid-cols-3">
            {TABS.map((tab, i) => {
              const isActive = i === active;
              return (
                <button
                  key={tab.title}
                  type="button"
                  onClick={() => selectTab(i)}
                  className={`relative border-b border-border px-6 py-5 text-left transition-colors last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${
                    isActive ? "bg-card" : "bg-muted/40 hover:bg-card"
                  }`}
                >
                  <span className="absolute left-0 top-0 h-[2px] w-full bg-border">
                    <span
                      className={`block h-full transition-[width] duration-100 ease-linear ${TAB_BAR[i]}`}
                      style={{ width: isActive ? `${progress}%` : "0%" }}
                    />
                  </span>
                  <p className="text-[14.5px] font-semibold text-foreground">{tab.title}</p>
                  <p className="mt-1 text-[13px] leading-[1.5] text-muted-foreground">{tab.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SystemPreview() {
  return (
    <div className="flex h-full items-center justify-center bg-muted p-8">
      <div className="flex items-end gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-[92px] overflow-hidden rounded-[10px] border border-border bg-card shadow-[var(--wf-shadow-soft)]"
            style={{ height: 116 + i * 22, transform: `translateY(${(2 - i) * 10}px)` }}
          >
            <div className="h-5 border-b border-border bg-muted" />
            <div className="space-y-1.5 p-2">
              <div className="h-1.5 w-3/4 rounded bg-muted" />
              <div className="h-1.5 w-1/2 rounded bg-border" />
              <div className="mt-2 h-8 rounded bg-muted" />
              <div className="h-1.5 w-2/3 rounded bg-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 bg-muted p-8">
      <div className="flex items-start gap-2.5">
        <div className="h-7 w-7 shrink-0 rounded-full bg-border" />
        <div className="max-w-[70%] rounded-2xl rounded-tl-sm bg-card px-3.5 py-2 text-[13px] leading-[1.4] text-foreground shadow-[var(--wf-shadow-soft)]">
          Make the header sticky and add a search bar
        </div>
      </div>
      <div className="flex items-start justify-end gap-2.5">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-[13px] leading-[1.4] text-primary-foreground">
          Done — updated across all 4 screens.
        </div>
      </div>
      <div className="mt-1 h-16 w-full rounded-[10px] border border-border bg-card shadow-[var(--wf-shadow-soft)]" />
    </div>
  );
}

function ExportPreview() {
  const tags = ["HTML", "Tailwind", "Next.js", "PNG"];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted p-8">
      <div className="flex flex-wrap justify-center gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-border bg-card px-3 py-1 text-[12px] font-medium text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="w-full max-w-[280px] rounded-[10px] border border-border bg-[#111214] p-3 font-mono text-[11px] leading-[1.7] text-[#d7dbe4] shadow-[var(--wf-shadow-soft)]">
        <div>
          <span className="text-[#7fa6f2]">export</span> <span className="text-[#e2c08d]">function</span> Header() {"{"}
        </div>
        <div className="pl-3 text-[#9aa0ab]">return &lt;header ...&gt;</div>
        <div>{"}"}</div>
      </div>
    </div>
  );
}
