"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";

/**
 * variant="landing"  — used inside the landing page's CSS-styled <nav>
 * variant="mobile"   — stacked links inside the landing page's mobile menu panel
 * variant="glass"    — used inside the Tailwind glass navbar component (marketing pages)
 * variant="app"      — used inside authenticated app pages (UserButton only)
 */
export function NavAuthActions({
  variant = "glass",
  onNavigate,
}: {
  variant?: "landing" | "mobile" | "glass" | "app";
  onNavigate?: () => void;
}) {
  const { isSignedIn } = useAuth();

  if (variant === "mobile") {
    if (!isSignedIn) {
      return (
        <div className="flex items-center gap-3 pt-4">
          <Link
            href="/sign-in"
            onClick={onNavigate}
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-border text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent"
          >
            Login
          </Link>
          <Link
            href="/sign-up"
            onClick={onNavigate}
            className="wf-lifted flex h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground no-underline transition-colors hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 pt-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="wf-lifted flex h-11 flex-1 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground no-underline transition-colors hover:bg-primary/90"
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/billing"
          onClick={onNavigate}
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-border text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent"
        >
          Billing
        </Link>
      </div>
    );
  }

  if (variant === "landing") {
    if (!isSignedIn) {
      return (
        <>
          <li className="max-[900px]:hidden">
            <Link href="/sign-in" className="text-sm text-muted-foreground no-underline font-normal transition-colors hover:text-foreground">
              Login
            </Link>
          </li>
          <li className="max-[900px]:hidden">
            <Link
              href="/sign-up"
              className="wf-lifted bg-primary text-primary-foreground py-[9px] px-[22px] rounded-full text-sm font-medium no-underline tracking-[0.01em] transition-all hover:bg-primary/90 hover:-translate-y-px"
            >
              Get started
            </Link>
          </li>
        </>
      );
    }

    return (
      <>
        <li className="max-[900px]:hidden">
          <Link href="/dashboard" className="text-sm text-muted-foreground no-underline font-normal transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </li>
        <li className="max-[900px]:hidden">
          <Link href="/dashboard/billing" className="text-sm text-muted-foreground no-underline font-normal transition-colors hover:text-foreground">
            Billing
          </Link>
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
