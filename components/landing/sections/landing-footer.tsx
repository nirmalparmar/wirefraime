import Link from "next/link";

const FOOTER_COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/landing-page-builder", label: "Landing page builder" },
      { href: "/ai-wireframe-generator", label: "AI wireframe generator" },
      { href: "/ai-ui-generator", label: "AI UI generator" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/#faq", label: "FAQ" },
      { href: "/#how-it-works", label: "How it works" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border px-6 pb-10 pt-14 md:px-10">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-[280px]">
            <Link href="/" className="font-serif text-[22px] italic text-foreground no-underline">
              WireFraime
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Design every screen of your product before you write code.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:gap-16">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="mb-3 text-[12px] font-semibold text-foreground">
                  {col.heading}
                </p>
                <ul className="flex list-none flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[13px] text-muted-foreground no-underline transition-colors hover:text-foreground">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6">
          <p className="text-[13px] text-muted-foreground">© 2026 WireFraime, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
