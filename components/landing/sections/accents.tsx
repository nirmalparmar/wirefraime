/**
 * Landing hero accent chips — the three playful inline "objects" woven into the
 * editorial headline (amber starburst, violet screen-tile, lime play-pill).
 *
 * All are purely decorative (aria-hidden). Sizes are driven by the parent font
 * size (em units) so each chip scales with the clamp headline. Colors are kept
 * as local Tailwind arbitrary values — deliberately NOT promoted to global
 * --wf-* tokens (see feedback_use_shared_shadcn_theme): these hues live only in
 * the hero's accent motif, everything structural stays on the shared theme.
 */

/** Amber 12-point sunburst with a dark spark at its center; rotates slowly. */
export function Starburst({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 align-middle ${className}`}>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path
          className="wf-slowspin"
          fill="#f5b301"
          d="M50,2 L57.76,21.02 L74,8.43 L71.21,28.79 L91.57,26 L78.98,42.24 L98,50 L78.98,57.76 L91.57,74 L71.21,71.21 L74,91.57 L57.76,78.98 L50,98 L42.24,78.98 L26,91.57 L28.79,71.21 L8.43,74 L21.02,57.76 L2,50 L21.02,42.24 L8.43,26 L28.79,28.79 L26,8.43 L42.24,21.02 Z"
        />
        <path
          fill="#241a04"
          d="M50,33 C52,46 54,48 67,50 C54,52 52,54 50,67 C48,54 46,52 33,50 C46,48 48,46 50,33 Z"
        />
      </svg>
    </span>
  );
}

/** Violet rounded tile framing a miniature "designed screen" mock. */
export function ScreenTile({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center overflow-hidden rounded-[0.16em] bg-[#8b5cf6] p-[0.1em] align-middle shadow-[0_0.06em_0.18em_rgba(79,42,158,0.35)] ${className}`}
    >
      <span className="flex h-full w-full flex-col gap-[0.06em] rounded-[0.1em] bg-white p-[0.1em]">
        <span className="flex items-center gap-[0.05em]">
          <span className="h-[0.1em] w-[0.1em] rounded-full bg-[#8b5cf6]" />
          <span className="h-[0.05em] flex-1 rounded-full bg-[#e3d8ff]" />
        </span>
        <span className="h-[0.05em] w-[85%] rounded-full bg-[#ebe4f9]" />
        <span className="mt-auto h-[0.22em] w-full rounded-[0.05em] bg-[#ece4ff]" />
      </span>
    </span>
  );
}

/** Lime capsule showing a selected UI block + a design cursor — "click-to-edit". */
export function CursorPill({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full bg-[#c3ec4f] px-[0.36em] align-middle shadow-[0_0.06em_0.18em_rgba(120,150,30,0.3)] ${className}`}
    >
      <span className="relative flex h-[0.54em] w-[0.74em] items-center justify-center">
        {/* Selected UI block */}
        <span className="relative h-full w-full rounded-[0.08em] border-[0.035em] border-[#1a2408] bg-white">
          <span className="absolute inset-[0.09em] flex flex-col justify-center gap-[0.06em]">
            <span className="h-[0.05em] w-[70%] rounded-full bg-[#c6c8b4]" />
            <span className="h-[0.05em] w-[45%] rounded-full bg-[#d6d8c6]" />
          </span>
          {/* Selection handles */}
          <span className="absolute -left-[0.055em] -top-[0.055em] h-[0.11em] w-[0.11em] rounded-[0.02em] bg-[#1a2408]" />
          <span className="absolute -bottom-[0.055em] -right-[0.055em] h-[0.11em] w-[0.11em] rounded-[0.02em] bg-[#1a2408]" />
        </span>
        {/* Design cursor, gently nudging at the block's corner */}
        <span className="wf-nudge absolute -bottom-[0.02em] -right-[0.04em]">
          <svg viewBox="0 0 24 24" className="h-[0.36em] w-[0.36em]" fill="#1a2408" stroke="#c3ec4f" strokeWidth="2" strokeLinejoin="round">
            <path d="M3 3 L10.07 19.97 L12.58 12.58 L19.97 10.07 Z" />
          </svg>
        </span>
      </span>
    </span>
  );
}
