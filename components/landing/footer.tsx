import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-foreground/6 px-5 pb-8 pt-14 md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-8 border-b border-foreground/6 pb-10">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              className="mb-3 flex items-center gap-2.5 font-serif text-lg text-foreground no-underline"
            >
              <img src="/logo.svg" alt="Logo" width={28} height={28} />
              Wirefraime
            </Link>
            <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              AI-powered full app design — every screen, every flow, every edge
              case.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Product
              </div>
              <ul className="flex flex-col gap-2.5">
                <li><a href="#features" className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground">How it works</a></li>
              </ul>
            </div>
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Legal
              </div>
              <ul className="flex flex-col gap-2.5">
                <li><Link href="/privacy" className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground">Privacy</Link></li>
                {/* <li><Link href="/terms" className="text-sm text-muted-foreground/70 transition-colors hover:text-foreground">Terms</Link></li> */}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Wirefraime
          </span>
          {/* <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
            Powered by Gemini, Claude &amp; Vercel AI SDK
          </div> */}
        </div>
      </div>
    </footer>
  );
}
