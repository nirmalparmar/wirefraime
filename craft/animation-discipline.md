# Animation discipline craft rules

When motion earns its place, and the numbers that constrain it. The design
system owns motion *personality*; this file decides whether motion runs at
all and for how long.

## When motion earns its place

Animate when the user is moving through **space, time, or state** —
navigation, container expand/collapse, progress feedback, gesture
follow-through, a press confirming an action. Do **not** animate to
teach, decorate, signal "premium", or fill silence. Optimistic UI first;
motion confirms a change, it doesn't perform it.

## Duration thresholds

The cross-industry convergence is **150ms** — use it as the default for
state-confirmation feedback.

| Duration | Use | Tailwind |
|---|---|---|
| 50–100ms | instant feedback (press, toggle, hover) | `duration-75`/`duration-100` |
| 150ms | default state confirmation | `duration-150` |
| 200–300ms | entering UI (modals, sheets, dropdowns) | `duration-200`/`duration-300` |
| 300–500ms | cross-screen transitions, container morphs | `duration-500` |
| >500ms | reserved for staged/cross-screen only |

Non-navigation microinteractions stay **under 500ms**. Frequently-seen
animations (a hover seen 50×/session) stay ≤200ms. Mobile runs 20–30%
shorter than desktop.

## Curve vs spring

- **Curve** (`ease-out`, `cubic-bezier(0.2,0,0,1)`) for opacity, color,
  and any value moving between two known points.
- **Spring** for position, scale, rotation, and gesture-driven motion —
  anything that should feel physical.

Default easing: front-loaded `ease-out` for entrances; the value hits its
target and settles. Avoid linear except for spinners and progress.

## Reduced motion (required)

Every transform/parallax animation respects
`@media (prefers-reduced-motion: reduce)`: strip motion-on-an-axis
(translate/scale/rotate), keep opacity crossfades as the substitute when a
state change still needs conveying.

## Repeated & ambient motion

- Skeleton shimmer runs until content lands — never indefinitely.
- Carousels: 3–5 cycles then pause; provide a pause control for anything
  moving >5s (WCAG 2.2.2).
- Reward bursts (confetti, level-up) are one-shot, never looped.
- Cancel ambient motion on route change.
- Spinners stop and escalate to error/cancel at 60s.

## Common mistakes (reviewed)

- >500ms on a non-cross-screen transition.
- Motion as the *only* signal of a state change (reduced-motion users miss
  it) — always pair with color/position/label.
- Ignoring `prefers-reduced-motion` on transform animations.
- Curve on a `scale()` that should feel physical (use a spring).
- Hero choreography inside a productivity tool — spend the motion budget
  on functional micro-feedback, not landing-page theatrics.
