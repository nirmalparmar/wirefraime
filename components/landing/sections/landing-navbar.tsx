"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { NavAuthActions } from "@/components/landing/nav-auth-actions";
import { NAV_LINKS } from "@/components/landing/home-data";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setScrolled(window.scrollY > 24);
      ticking = false;
    };
    const onScroll = () => {
      setOpen(false);
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile panel on Escape and when the viewport grows past the breakpoint
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [open]);

  return (
    <nav
      className={[
        "fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-between",
        "transition-[max-width,top,height,padding,border-radius,background,border-color,box-shadow,backdrop-filter]",
        "duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        scrolled || open
          ? "top-3 w-[calc(100%-28px)] max-w-[940px] h-[58px] px-3 pl-6 rounded-full bg-background/70 border border-border backdrop-blur-[18px] shadow-[var(--wf-shadow-soft)]"
          : "top-0 w-full max-w-full h-16 px-5 md:px-12 border border-transparent bg-transparent",
      ].join(" ")}
    >
      <Link
        href="/"
        className={`font-serif italic text-foreground no-underline tracking-[-0.3px] flex items-center justify-center transition-[font-size] duration-[450ms] ${scrolled ? "text-[23px]" : "text-[25px]"}`}
      >
        <Image
          src="/logo.svg"
          alt=""
          width={26}
          height={26}
          className="mr-2 inline-block align-middle"
          style={{ width: 26, height: 26 }}
        />
        WireFraime
      </Link>

      <ul className={`flex items-center list-none transition-[gap] duration-[450ms] ${scrolled ? "gap-[30px]" : "gap-9"}`}>
        {NAV_LINKS.map((l) => (
          <li key={l.label} className="max-[900px]:hidden">
            <Link href={l.href} className="text-sm text-muted-foreground no-underline font-normal transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
        <NavAuthActions variant="landing" />
        <li className="min-[900px]:hidden">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent"
          >
            <span
              className={`absolute h-[1.5px] w-[18px] rounded-full bg-foreground transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[3.5px]"}`}
            />
            <span
              className={`absolute h-[1.5px] w-[18px] rounded-full bg-foreground transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[3.5px]"}`}
            />
          </button>
        </li>
      </ul>

      {/* Mobile panel */}
      <div
        id="mobile-nav"
        className={`absolute left-0 right-0 top-[calc(100%+8px)] grid min-[900px]:hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-[var(--wf-shadow-soft)] backdrop-blur-[18px]">
          <div className="flex flex-col p-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 text-[15px] text-foreground no-underline transition-colors last-of-type:border-none hover:text-muted-foreground"
              >
                {l.label}
              </Link>
            ))}
            <NavAuthActions variant="mobile" onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </div>
    </nav>
  );
}
