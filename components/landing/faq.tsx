"use client";

import { useState } from "react";
import { PLANS, STARTING_PRICE, annualPrice } from "@/lib/pricing";
import { Em, Eyebrow, SectionHeading } from "@/components/landing/sections/section-heading";

const bySlug = (slug: string) => PLANS.find((p) => p.slug === slug) ?? PLANS[0];
const STARTER = bySlug("starter");
const PRO = bySlug("pro");
const ULTRA = bySlug("ultra");

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "What is Wirefraime?",
    a: "It's an AI tool that turns a one-line product idea into a full UI — a design system, every screen, every state — ready to hand off or ship.",
  },
  {
    q: "Who is Wirefraime for?",
    a: "Anyone who needs to see a product before building it: founders scoping an MVP, PMs pitching a feature, designers skipping the blank-canvas stage, engineers who'd rather not guess at layout.",
  },
  {
    q: "Can I generate wireframes and UI mockups from a text prompt?",
    a: "Yes — describe the app or feature, and it plans the screens, builds the wireframe, and polishes it into a production-quality mockup in one pass.",
  },
  {
    q: "How is Wirefraime different from a general AI app builder?",
    a: "Most AI app builders start writing backend code right away. Wirefraime stays at the design layer — screens, states, visual consistency — so you can settle what the product should look and feel like before anyone touches a database.",
  },
  {
    q: "Can I edit the generated wireframes?",
    a: "Yes. Click anything on the canvas to edit it directly, or just tell the AI what to change — colors, copy, layout, whole components — across every screen at once.",
  },
  {
    q: "What can I export?",
    a: "Clean HTML and Tailwind, a full Next.js project, or 2x PNGs — whatever your team needs for handoff or to ship straight away.",
  },
  {
    q: "How much does Wirefraime cost?",
    a: `Starter is $${STARTER.priceMonthly}/mo (or $${annualPrice(STARTER.priceMonthly)}/mo billed annually) with ${STARTER.features[0].toLowerCase()}. Pro runs $${PRO.priceMonthly}/mo (or $${annualPrice(PRO.priceMonthly)}/mo annually) and includes ${PRO.features[0].toLowerCase()}. Ultra is $${ULTRA.priceMonthly}/mo (or $${annualPrice(ULTRA.priceMonthly)}/mo annually), with ${ULTRA.features[0].toLowerCase()}. Cancel whenever you want.`,
  },
  {
    q: "Can I try it for free?",
    a: `You can sign up and poke around the workspace for free. Actually generating screens needs a paid plan — plans start at $${STARTING_PRICE}/mo billed annually.`,
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: QUESTIONS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative px-6 py-20 md:px-10 md:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <div className="mx-auto max-w-3xl">
        <div className="mb-12 md:mb-16">
          <SectionHeading
            align="center"
            eyebrow={<Eyebrow>FAQ</Eyebrow>}
            title={
              <>
                Questions, <Em>answered</Em>
              </>
            }
          />
        </div>

        <div className="divide-y divide-border border-y border-border">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] font-medium text-foreground transition-colors hover:text-muted-foreground md:text-base"
                >
                  <span>{item.q}</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div
                  className={`grid overflow-hidden transition-all duration-300 ${isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}
                >
                  <p className="min-h-0 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
