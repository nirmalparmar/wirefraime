import { Badge } from "@/components/ui/badge";

interface SectionHeadingProps {
  badge?: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
}

export function SectionHeading({
  badge,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={`mx-auto max-w-2xl text-center ${className ?? ""}`}>
      {badge && (
        <div className="mb-5 inline-block">
          <span className="liquid-glass-adaptive inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {badge}
          </span>
        </div>
      )}
      <h2 className="font-serif text-[clamp(32px,3.4vw,52px)] leading-[1.1] tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
