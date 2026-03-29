interface LogoMarkProps {
  className?: string;
  size?: number;
  variant?: 1 | 2 | 3 | 4 | 5;
}

/**
 * Variant 1: "W" shape made of connected dots — like a wireframe constellation
 */
function Logo1({ size = 28 }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Connecting lines */}
      <line x1="4" y1="6" x2="9" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="20" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="10" x2="19" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="20" x2="24" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Dots */}
      <circle cx="4" cy="6" r="2.5" fill="currentColor" />
      <circle cx="9" cy="20" r="2.5" fill="var(--primary)" />
      <circle cx="14" cy="10" r="2.5" fill="currentColor" />
      <circle cx="19" cy="20" r="2.5" fill="var(--primary)" />
      <circle cx="24" cy="6" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Variant 2: Grid of dots with selective connections — like a wireframe layout
 */
function Logo2({ size = 28 }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Connections forming an "app screen" shape */}
      <line x1="6" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="6" y1="5" x2="6" y2="23" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="22" y1="5" x2="22" y2="23" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="6" y1="23" x2="22" y2="23" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {/* Cross connection — the "frame" */}
      <line x1="6" y1="11" x2="22" y2="11" stroke="var(--primary)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="14" y1="11" x2="14" y2="23" stroke="var(--primary)" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      {/* Corner dots */}
      <circle cx="6" cy="5" r="2" fill="currentColor" />
      <circle cx="22" cy="5" r="2" fill="currentColor" />
      <circle cx="6" cy="23" r="2" fill="currentColor" />
      <circle cx="22" cy="23" r="2" fill="currentColor" />
      {/* Mid dots */}
      <circle cx="6" cy="11" r="2" fill="var(--primary)" />
      <circle cx="22" cy="11" r="2" fill="var(--primary)" />
      <circle cx="14" cy="11" r="2" fill="var(--primary)" />
      <circle cx="14" cy="23" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Variant 3: Triangle mesh — 3 connected triangles forming a "W"
 */
function Logo3({ size = 28 }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Triangle connections */}
      <line x1="3" y1="7" x2="10" y2="22" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="10" y1="22" x2="14" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="14" y1="7" x2="18" y2="22" stroke="var(--primary)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="18" y1="22" x2="25" y2="7" stroke="var(--primary)" strokeWidth="1.3" strokeLinecap="round" />
      {/* Cross braces */}
      <line x1="3" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
      <line x1="14" y1="7" x2="25" y2="7" stroke="var(--primary)" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
      <line x1="10" y1="22" x2="18" y2="22" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.3" />
      {/* Dots */}
      <circle cx="3" cy="7" r="2.5" fill="currentColor" />
      <circle cx="14" cy="7" r="2.5" fill="currentColor" />
      <circle cx="25" cy="7" r="2.5" fill="var(--primary)" />
      <circle cx="10" cy="22" r="2.5" fill="currentColor" />
      <circle cx="18" cy="22" r="2.5" fill="var(--primary)" />
    </svg>
  );
}

/**
 * Variant 4: Constellation — dots at different heights connected like a node graph
 */
function Logo4({ size = 28 }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Connections */}
      <line x1="4" y1="14" x2="10" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="6" x2="14" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18" y1="6" x2="14" y2="14" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18" y1="6" x2="24" y2="14" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="14" x2="24" y2="14" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4" y1="14" x2="9" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="14" x2="9" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="14" x2="19" y2="22" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="14" x2="19" y2="22" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Dots */}
      <circle cx="4" cy="14" r="2.5" fill="currentColor" />
      <circle cx="10" cy="6" r="2.5" fill="currentColor" />
      <circle cx="18" cy="6" r="2.5" fill="var(--primary)" />
      <circle cx="14" cy="14" r="3" fill="var(--primary)" />
      <circle cx="24" cy="14" r="2.5" fill="var(--primary)" />
      <circle cx="9" cy="22" r="2.5" fill="currentColor" />
      <circle cx="19" cy="22" r="2.5" fill="var(--primary)" />
    </svg>
  );
}

/**
 * Variant 5: Simple 4-dot diamond with center — clean, minimal
 */
function Logo5({ size = 28 }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Outer connections */}
      <line x1="14" y1="4" x2="24" y2="14" stroke="var(--primary)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="24" y1="14" x2="14" y2="24" stroke="var(--primary)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="14" y1="24" x2="4" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="4" y1="14" x2="14" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {/* Inner connections to center */}
      <line x1="14" y1="4" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <line x1="24" y1="14" x2="14" y2="14" stroke="var(--primary)" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <line x1="14" y1="24" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      <line x1="4" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
      {/* Dots */}
      <circle cx="14" cy="4" r="2.5" fill="currentColor" />
      <circle cx="24" cy="14" r="2.5" fill="var(--primary)" />
      <circle cx="14" cy="24" r="2.5" fill="currentColor" />
      <circle cx="4" cy="14" r="2.5" fill="currentColor" />
      <circle cx="14" cy="14" r="3" fill="var(--primary)" />
    </svg>
  );
}

const VARIANTS = { 1: Logo1, 2: Logo2, 3: Logo3, 4: Logo4, 5: Logo5 };

export function LogoMark({ className, size = 28, variant = 4 }: LogoMarkProps) {
  const Logo = VARIANTS[variant];
  return (
    <span className={`inline-flex shrink-0 text-foreground ${className ?? ""}`}>
      <Logo size={size} />
    </span>
  );
}
