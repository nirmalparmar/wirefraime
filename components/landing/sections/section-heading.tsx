import type { ReactNode } from "react";

/** The single accent allowed per heading — italic serif, same ink as the rest. */
export function Em({ children }: { children: ReactNode }) {
  return <span className="font-serif italic">{children}</span>;
}

/** The hero accent trio — reused as quiet eyebrow dots to tie sections together. */
const EYEBROW_TONE = {
  primary: "bg-primary",
  amber: "bg-[#f5b301]",
  lime: "bg-[#8fb52b]",
  violet: "bg-[#8b5cf6]",
} as const;

/** Small pill eyebrow — a quiet label above a section title. */
export function Eyebrow({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: keyof typeof EYEBROW_TONE;
}) {
  return (
    <div className="mb-4 inline-flex items-center gap-[7px] rounded-full border border-border bg-card px-3 py-1 shadow-sm">
      <span className={`h-[5px] w-[5px] rounded-full ${EYEBROW_TONE[tone]}`} />
      <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

/**
 * Unified landing heading: optional eyebrow pill → big sans-semibold H2
 * (with one <Em> phrase) → one-line lede.
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "center",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div className={`fade-up ${centered ? "mx-auto max-w-[640px] text-center" : "max-w-[640px]"}`}>
      {eyebrow && (centered ? <div className="flex justify-center">{eyebrow}</div> : eyebrow)}
      <h2 className="text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">
        {title}
      </h2>
      {lede && (
        <p className={`mt-4 text-base leading-relaxed text-muted-foreground ${centered ? "mx-auto max-w-[440px]" : "max-w-md"}`}>
          {lede}
        </p>
      )}
    </div>
  );
}
