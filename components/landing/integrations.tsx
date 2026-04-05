const FORMATS = [
  {
    name: "HTML",
    desc: "Production-ready",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 18l6-6-6-6" /><path d="M8 6l-6 6 6 6" />
      </svg>
    ),
  },
  {
    name: "Next.js",
    desc: "Full project scaffold",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 8l8.5 11" strokeWidth="2" /><path d="M16 8v8" strokeWidth="2" />
      </svg>
    ),
  },
  {
    name: "PNG",
    desc: "Screen export",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    name: "JSON",
    desc: "Design tokens",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h12" />
      </svg>
    ),
  },
];

export function Integrations() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 md:px-12 md:py-20">
      <div className="mb-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Export to your workflow
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {FORMATS.map((f) => (
          <div
            key={f.name}
            className="liquid-glass-adaptive flex flex-col items-center gap-2.5 rounded-xl p-4 text-center transition-all hover:bg-foreground/[0.03] md:p-5"
          >
            <div className="text-muted-foreground">{f.icon}</div>
            <div>
              <div className="text-sm font-semibold text-foreground">{f.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
