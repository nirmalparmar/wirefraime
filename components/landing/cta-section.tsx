import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="px-5 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="liquid-glass-adaptive overflow-hidden rounded-2xl px-8 py-16 text-center md:px-16 md:py-20">
          {/* Ambient glow behind */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
          </div>

          <div className="relative">
            <h2 className="mx-auto max-w-lg font-serif text-[clamp(28px,3vw,44px)] leading-[1.1] tracking-tight text-foreground">
              Ready to design faster?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Describe your app, get every screen designed in seconds.
              Export as HTML, Next.js, or PNG — ready for handoff.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="clay"
                size="2xl"
                asChild
              >
                <Link href="/dashboard">Start Now</Link>
              </Button>
              <Button
                variant="outline"
                size="2xl"
                className="liquid-glass-adaptive border-none"
                asChild
              >
                <Link href="#pricing">See all plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
