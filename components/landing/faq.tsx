"use client";

import { useState } from "react";
import { SectionHeading } from "./section-heading";

const QUESTIONS = [
  {
    q: "What is Wirefraime?",
    a: "Wirefraime is an AI-powered design tool that generates complete app designs from a text description. Describe your app's purpose, users, and flows — and get every screen designed in seconds.",
  },
  {
    q: "How does AI generate full app designs?",
    a: "Our AI analyzes your brief to understand the app domain, user journeys, and required screens. It then generates a complete design system with consistent components, layouts, and flows — not just isolated wireframes.",
  },
  {
    q: "Can I edit the generated designs?",
    a: "Yes. You can click any element to edit it visually, use chat to describe changes in plain language, or export to Figma/HTML for further refinement in your existing workflow.",
  },
  {
    q: "What formats can I export to?",
    a: "Wirefraime supports export as production-ready HTML, React components, PNG/SVG assets, and Figma-compatible designs. Pro and Team plans unlock all export formats.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes! The Starter plan is free forever and includes 5 app generations per month with up to 8 screens each. No credit card required.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-3xl px-5 py-20 md:px-12 md:py-28">
      <div className="reveal mb-12 md:mb-16">
        <SectionHeading
          title={
            <>
              Frequently asked <em className="text-primary">questions.</em>
            </>
          }
        />
      </div>

      <div className="reveal divide-y divide-foreground/[0.06]">
        {QUESTIONS.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between py-5 text-left text-base font-medium text-foreground transition-colors hover:text-primary"
            >
              {item.q}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 text-muted-foreground transition-transform ${
                  open === i ? "rotate-180" : ""
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all ${
                open === i ? "max-h-48 pb-5" : "max-h-0"
              }`}
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
