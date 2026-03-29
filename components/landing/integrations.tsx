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
    name: "React",
    desc: "Component export",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="2.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
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
    name: "Figma",
    desc: "Design handoff",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
        <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12z" />
        <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" />
        <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
        <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
      </svg>
    ),
  },
  {
    name: "PNG / SVG",
    desc: "Asset export",
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
      <div className="reveal mb-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Export to your workflow
        </p>
      </div>

      <div className="reveal grid grid-cols-3 gap-3 md:grid-cols-6 md:gap-4">
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
