import { SectionHeading } from "./section-heading";

const FEATURES = [
  {
    icon: "◇",
    title: "Full App Understanding",
    desc: "Feed it a brief. Wirefraime reads app type, user goals, and core flows — then architects the entire UX.",
  },
  {
    icon: "⎔",
    title: "End-to-End Flows",
    desc: "Not isolated wireframes — complete, connected user journeys. Onboarding, core product, and edge cases.",
  },
  {
    icon: "⊞",
    title: "Smart Hierarchy",
    desc: "Every screen inherits consistent nav, spacing, and component patterns. A cohesive system, not random frames.",
  },
  {
    icon: "◈",
    title: "Chat Refinement",
    desc: "Iterate in plain language. \"Add an empty state\" or \"Make it mobile\" — changes propagate intelligently.",
  },
  {
    icon: "⊙",
    title: "Export Anywhere",
    desc: "One-click export as production HTML, Figma-ready designs, or React components — handoff without cleanup.",
  },
  {
    icon: "⊕",
    title: "Team Collaboration",
    desc: "Share live links, leave contextual comments, and build on the same design system together.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-5 py-20 md:px-12 md:py-28">
      <div className="reveal mb-12 md:mb-16">
        <SectionHeading
          badge="Features"
          title={
            <>
              Everything you need to
              <br />
              <em className="text-primary">design at speed.</em>
            </>
          }
          description="Built for designers and product teams who need the full picture — fast, without sacrificing quality."
        />
      </div>

      <div className="reveal grid gap-3 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="liquid-glass-adaptive group rounded-xl p-7 transition-all hover:bg-foreground/[0.03] md:p-8"
          >
            <div className="mb-5 grid size-10 place-items-center rounded-lg bg-primary/8 text-lg text-primary">
              {f.icon}
            </div>
            <h3 className="mb-2.5 font-serif text-lg text-foreground">
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
