"use client";

import { useState } from "react";

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "What is Wirefraime?",
    a: "Wirefraime is an AI wireframe and UI design tool. Describe your app in a sentence, and the AI generates a complete design system, every screen, and every state — ready to ship.",
  },
  {
    q: "How is Wirefraime different from other wireframe tools?",
    a: "Most wireframe tools give you empty boxes. Wirefraime is an AI UI designer that produces full, high-fidelity UI mockups with real copy, real components, and a connected design system across every screen.",
  },
  {
    q: "Can I generate wireframes and UI mockups from a text prompt?",
    a: "Yes. Type a description of your app or feature. Wirefraime's AI plans the screens, designs the wireframe, and refines it into a production-quality UI mockup automatically.",
  },
  {
    q: "Do I need to be a UI designer to use it?",
    a: "No. Wirefraime acts as your AI UI designer — founders, PMs, and engineers use it to ship full app designs without hiring a UI designer or learning a wireframe tool.",
  },
  {
    q: "Can I edit the generated wireframes?",
    a: "Yes. Click any element to edit live in the canvas, or chat with the AI in plain language to refine colors, copy, layout, and components across screens.",
  },
  {
    q: "What can I export?",
    a: "Production-ready HTML and Tailwind CSS, a full Next.js project, or PNG screenshots at 2x — ready for developer handoff or direct deployment.",
  },
  {
    q: "What AI models power Wirefraime?",
    a: "Wirefraime is powered by Google Gemini for UI design generation and Anthropic Claude for chat-based refinement, accessed via the Vercel AI SDK.",
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
    <section id="faq" className="relative px-5 py-24 md:px-10 md:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center md:mb-20">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            FAQ
          </span>
          <h2 className="mt-4 text-[clamp(30px,4.5vw,52px)] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground">
            Questions, answered
          </h2>
          <p className="mx-auto mt-4 max-w-md text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            What Wirefraime does, how it compares to other wireframe tools,
            and how teams use it.
          </p>
        </div>

        <div className="divide-y divide-foreground/[0.08] border-y border-foreground/[0.08]">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] font-medium text-foreground transition-colors hover:text-primary md:text-base"
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
