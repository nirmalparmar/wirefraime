import * as React from "react";

import { cn } from "@/lib/utils";

type SoftSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "shell" | "panel" | "control" | "active";
};

const SoftSurface = React.forwardRef<HTMLDivElement, SoftSurfaceProps>(
  ({ tone = "shell", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        tone === "shell" && "wf-soft-shell",
        tone === "panel" && "wf-soft-shell bg-card/85",
        tone === "control" && "wf-control",
        tone === "active" && "wf-control-active",
        className
      )}
      {...props}
    />
  )
);
SoftSurface.displayName = "SoftSurface";

type SoftIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

function SoftIconButton({
  active,
  className,
  ...props
}: SoftIconButtonProps) {
  return (
    <button
      className={cn(
        "wf-icon-button size-8 rounded-[0.7rem] disabled:pointer-events-none disabled:opacity-30",
        active && "wf-control-active text-ws-accent",
        className
      )}
      {...props}
    />
  );
}

function ToolbarDivider({ className }: { className?: string }) {
  return <span aria-hidden className={cn("wf-divider my-2", className)} />;
}

function AskAiPill({
  className,
  children = "Ask AI",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "wf-ai-button relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-[0.75rem] px-3.5 text-xs font-semibold",
        className
      )}
      {...props}
    >
      <svg
        aria-hidden
        className="relative z-10 size-4"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2.5l1.9 6.2 6.1 1.8-6.1 1.9-1.9 6.1-1.9-6.1-6.1-1.9 6.1-1.8L12 2.5Z" />
        <path d="M5.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      </svg>
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function SelectionDot({ active }: { active?: boolean }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full bg-muted-foreground/35",
        active && "bg-ws-accent"
      )}
    />
  );
}

export { AskAiPill, SelectionDot, SoftIconButton, SoftSurface, ToolbarDivider };
