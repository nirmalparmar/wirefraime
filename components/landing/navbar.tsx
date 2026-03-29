"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useTheme } from "@/components/ThemeProvider";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const { theme, toggle } = useTheme();
  const { isSignedIn } = useAuth();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 md:pt-5">
      <div className="liquid-glass-adaptive mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-2.5 md:px-6 md:py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-lg text-foreground no-underline"
        >
          {theme === "dark" ? (
            <img src="/logo-dark.png" alt="Logo" width={24} height={24} />
          ) : (
            <img src="/logo.png" alt="Logo" width={24} height={24} />
          )}
          <span>
            Wirefr<span className="text-primary">ai</span>me
          </span>
        </Link>

        {/* Center links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            {theme === "dark" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {!isSignedIn ? (
            <>
              <Link
                href="/sign-in"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
              >
                Login
              </Link>
              <Link
                href="/sign-up"
                className="liquid-glass-adaptive rounded-full px-5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
              >
                Start for free
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
              >
                Dashboard
              </Link>
              <UserButton
                appearance={{
                  elements: { avatarBox: "size-7" },
                }}
              />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
