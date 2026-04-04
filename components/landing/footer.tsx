const COLUMNS = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Changelog", "Roadmap"],
  },
  {
    title: "Resources",
    links: ["Documentation", "API Reference", "Blog", "Templates"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Privacy", "Terms"],
  },
];

const SOCIALS = ["Twitter / X", "LinkedIn", "GitHub"];

export function Footer() {
  return (
    <footer className="border-t border-foreground/[0.06] px-5 pb-8 pt-14 md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 grid gap-8 border-b border-foreground/[0.06] pb-10 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-10">
          {/* Brand column */}
          <div>
            <a
              href="#"
              className="mb-3 flex items-center gap-2.5 font-serif text-lg text-foreground no-underline"
            >
              <img src="/logo.svg" alt="Logo" width={28} height={28} />
              Wirefraime
            </a>
            <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              AI-powered full app design — every screen, every flow, every edge
              case.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {col.title}
              </div>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            &copy; 2026 Wirefraime, Inc.
          </span>
          <div className="flex gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s}
                href="#"
                className="text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
