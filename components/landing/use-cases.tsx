import { SectionHeading } from "./section-heading";

const CASES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />
      </svg>
    ),
    title: "SaaS Platforms",
    desc: "Dashboards, settings, onboarding flows, billing pages, team management — the full stack.",
    screens: "8–15 screens",
    examples: ["CRM", "Analytics", "Project management"],
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" /><path d="M12 18h.01" />
      </svg>
    ),
    title: "Mobile Apps",
    desc: "Native-feeling flows with tab bars, gestures, and platform conventions baked in.",
    screens: "6–12 screens",
    examples: ["Fitness", "Banking", "Social"],
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    title: "E-commerce",
    desc: "Product grids, detail pages, cart, checkout, order tracking — conversion-optimized from the start.",
    screens: "10–18 screens",
    examples: ["Fashion", "Groceries", "Marketplace"],
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    title: "Content & Blogs",
    desc: "Article layouts, reading experiences, author profiles, newsletters, and content management.",
    screens: "5–10 screens",
    examples: ["News", "Documentation", "Portfolio"],
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Community & Social",
    desc: "Feeds, profiles, messaging, groups, notifications — complete social graph experiences.",
    screens: "8–14 screens",
    examples: ["Events", "Forums", "Networking"],
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
    title: "Marketing Sites",
    desc: "Landing pages, feature sections, pricing tables, signup flows — conversion-ready layouts.",
    screens: "3–8 screens",
    examples: ["Startup", "Agency", "Product launch"],
  },
];

export function UseCases() {
  return (
    <section className="px-5 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 md:mb-16">
          <SectionHeading
            badge="Use Cases"
            title={
              <>
                Built for <em className="text-primary">every</em> kind of app.
              </>
            }
            description="From mobile apps to enterprise SaaS — Wirefraime understands your domain and generates context-aware designs."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {CASES.map((c) => (
            <div
              key={c.title}
              className="liquid-glass-adaptive group rounded-xl p-6 transition-all hover:bg-foreground/3 md:p-7"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-lg bg-primary/8 text-primary">
                  {c.icon}
                </div>
                <span className="text-xs font-medium text-muted-foreground/60">
                  {c.screens}
                </span>
              </div>
              <h3 className="mb-2 font-serif text-lg text-foreground">{c.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.examples.map((ex) => (
                  <span
                    key={ex}
                    className="liquid-glass-adaptive rounded-full px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground/70"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
