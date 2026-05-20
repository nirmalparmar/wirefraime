import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SERIF, SANS } from "@/lib/constants";

export default function NotFound() {
  return (
    <div
      className="grid min-h-screen place-items-center bg-background px-6 py-12 text-foreground"
      style={{ fontFamily: SANS }}
    >
      <div className="liquid-glass-adaptive w-full max-w-md rounded-2xl p-8 text-center">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          404
        </p>
        <h1
          className="mb-2 text-[26px] leading-tight tracking-tight text-foreground"
          style={{ fontFamily: SERIF }}
        >
          Page not found
        </h1>
        <p className="mb-6 text-[14px] leading-relaxed text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="clay" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
