"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";

/**
 * variant="landing"  — used inside the landing page's CSS-styled <nav>
 * variant="glass"    — used inside the Tailwind glass navbar component (marketing pages)
 * variant="app"      — used inside authenticated app pages (UserButton only)
 */
export function NavAuthActions({ variant = "glass" }: { variant?: "landing" | "glass" | "app" }) {
  const { isSignedIn } = useAuth();

  if (variant === "landing") {
    if (!isSignedIn) {
      return (
        <>
          <li>
            <Link href="/sign-in">Login</Link>
          </li>
          <li>
            <Link href="/sign-up" className="nav-btn">Get started</Link>
          </li>
        </>
      );
    }

    return (
      <>
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>
        <li>
          <Link href="/dashboard/billing">Billing</Link>
        </li>
        <li className="flex items-center justify-center">
          <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
        </li>
      </>
    );
  }

  // app variant — already authenticated, just show avatar
  if (variant === "app") {
    return <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />;
  }

  // glass variant (Tailwind navbar)
  if (!isSignedIn) {
    return (
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
          Get Started
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/dashboard"
        className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
      >
        Dashboard
      </Link>
      <Link
        href="/dashboard/billing"
        className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block"
      >
        Billing
      </Link>
      <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
    </>
  );
}
