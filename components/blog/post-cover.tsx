import type { PostCover as PostCoverType } from "@/lib/blog/posts";

/* Premium mesh-gradient presets — layered radial gradients over a dark base
   give the iridescent/aurora "Apple-style" feel rather than a flat fill. */
const VARIANTS: Record<string, string> = {
  aurora: `
    radial-gradient(at 18% 24%, hsla(265, 95%, 65%, 0.95) 0%, transparent 55%),
    radial-gradient(at 82% 12%, hsla(300, 92%, 70%, 0.85) 0%, transparent 50%),
    radial-gradient(at 8% 92%, hsla(220, 95%, 55%, 0.85) 0%, transparent 55%),
    radial-gradient(at 92% 88%, hsla(180, 90%, 55%, 0.7) 0%, transparent 50%),
    linear-gradient(135deg, #150832 0%, #06031a 100%)
  `,
  iris: `
    radial-gradient(at 25% 25%, hsla(252, 92%, 75%, 0.9) 0%, transparent 55%),
    radial-gradient(at 78% 22%, hsla(328, 88%, 75%, 0.8) 0%, transparent 50%),
    radial-gradient(at 50% 90%, hsla(288, 88%, 70%, 0.85) 0%, transparent 55%),
    radial-gradient(at 4% 72%, hsla(202, 92%, 65%, 0.6) 0%, transparent 50%),
    linear-gradient(180deg, #251450 0%, #0d0524 100%)
  `,
  sunset: `
    radial-gradient(at 20% 30%, hsla(15, 95%, 65%, 0.92) 0%, transparent 55%),
    radial-gradient(at 80% 20%, hsla(340, 95%, 70%, 0.85) 0%, transparent 50%),
    radial-gradient(at 60% 100%, hsla(35, 95%, 65%, 0.8) 0%, transparent 55%),
    radial-gradient(at 0% 78%, hsla(280, 78%, 60%, 0.55) 0%, transparent 50%),
    linear-gradient(135deg, #2a0a1a 0%, #100308 100%)
  `,
  ocean: `
    radial-gradient(at 22% 26%, hsla(190, 95%, 58%, 0.9) 0%, transparent 55%),
    radial-gradient(at 78% 18%, hsla(220, 95%, 62%, 0.85) 0%, transparent 50%),
    radial-gradient(at 8% 88%, hsla(165, 92%, 55%, 0.8) 0%, transparent 55%),
    radial-gradient(at 92% 92%, hsla(258, 88%, 65%, 0.6) 0%, transparent 50%),
    linear-gradient(135deg, #061a32 0%, #020812 100%)
  `,
  flux: `
    radial-gradient(at 22% 22%, hsla(295, 92%, 65%, 0.9) 0%, transparent 50%),
    radial-gradient(at 78% 30%, hsla(40, 95%, 65%, 0.72) 0%, transparent 50%),
    radial-gradient(at 30% 82%, hsla(178, 92%, 55%, 0.72) 0%, transparent 50%),
    radial-gradient(at 82% 80%, hsla(332, 92%, 65%, 0.72) 0%, transparent 50%),
    linear-gradient(135deg, #1a0a2e 0%, #07041a 100%)
  `,
  pastel: `
    radial-gradient(at 22% 24%, hsla(260, 80%, 82%, 0.9) 0%, transparent 55%),
    radial-gradient(at 78% 18%, hsla(330, 82%, 82%, 0.85) 0%, transparent 50%),
    radial-gradient(at 12% 88%, hsla(195, 82%, 80%, 0.85) 0%, transparent 55%),
    radial-gradient(at 88% 88%, hsla(20, 82%, 80%, 0.75) 0%, transparent 50%),
    linear-gradient(180deg, #f6efff 0%, #ffe9f0 100%)
  `,
};

const GRAIN_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";

/** Headline-only portion of a "Title: subtitle" structure, for use as cover art. */
function coverHeadline(title: string): string {
  const colonIdx = title.indexOf(":");
  if (colonIdx > 0 && colonIdx < title.length - 1) return title.slice(0, colonIdx);
  return title;
}

type Props = {
  cover: PostCoverType;
  title: string;
  category?: string;
  className?: string;
};

export function PostCover({ cover, title, category, className = "" }: Props) {
  const background = VARIANTS[cover.variant] ?? VARIANTS.aurora;
  const isLight = cover.variant === "pastel";
  const headline = coverHeadline(title);

  const fgClass = isLight ? "text-zinc-900" : "text-white";
  const fgSoftClass = isLight ? "text-zinc-900/65" : "text-white/75";

  return (
    <div
      role="img"
      aria-label={title}
      className={`relative isolate overflow-hidden ${className}`}
      style={{ background }}
    >
      {/* Soft top highlight — adds dimensionality */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)]"
      />
      {/* Grain texture — kills banding, adds premium feel */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: `url("${GRAIN_SVG}")`,
          backgroundSize: "200px 200px",
        }}
      />
      {/* Edge vignette — frames the gradient against the page */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.35)_100%)]"
      />

      {/* Text content — eyebrow top-left, serif headline bottom-left */}
      <div className={`absolute inset-0 flex flex-col justify-between p-5 md:p-7 lg:p-8 ${fgClass}`}>
        <div className="flex items-start justify-between gap-4">
          {category ? (
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${fgSoftClass}`}
            >
              {category}
            </span>
          ) : (
            <span />
          )}
          <span
            aria-hidden
            className={`grid size-7 shrink-0 place-items-center rounded-full backdrop-blur-sm ${
              isLight ? "bg-zinc-900/10 text-zinc-900/80" : "bg-white/15 text-white/85"
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
        </div>
        <h3
          className={`max-w-[88%] font-serif text-[clamp(24px,3vw,44px)] leading-[1.04] tracking-tight ${
            isLight ? "" : "drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]"
          }`}
        >
          {headline}
        </h3>
      </div>
    </div>
  );
}
