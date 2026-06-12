# Typography craft rules

Universal type rules applied on top of any design system. The design
system picks *which* fonts; this file governs *how* they behave at every
size. Wirefraime maps the chosen body font to `font-sans` and the mono to
`font-mono`.

## Font choice (the design-system layer, enforced here)

- **Never** make Inter, Roboto, Arial, or `system-ui` the main visual
  idea. They are the textbook AI default. The design system should pick a
  distinctive Google Font; pair at most **two** typefaces (display + body,
  or one variable face at multiple weights).
- Always keep a system fallback chain so layout holds before the webfont
  loads.

## Type scale

Multiplicative scale (×1.2 or ×1.25). Cap at 6–8 sizes per screen; no more
than 3 distinct sizes above the fold.

| Role | Range | Tailwind |
|---|---|---|
| Display | 48–72px | `text-5xl`–`text-7xl` |
| H1 | 32–48px | `text-4xl`–`text-5xl` |
| H2 | 24–32px | `text-2xl`–`text-3xl` |
| H3 | 20–24px | `text-xl`–`text-2xl` |
| Body | 15–18px | `text-base`–`text-lg` |
| Small | 13–14px | `text-sm` |
| Caption | 11–12px | `text-xs` |

Absolute min: 12px mobile (`text-xs`), 13px web.

## Line height

| Size | Leading | Tailwind |
|---|---|---|
| Display / H1 (≥32px) | 1.0–1.2 (tight) | `leading-tight` / `leading-none` |
| Body (15–18px) | 1.5–1.6 | `leading-relaxed` |
| Small (≤14px) | 1.5 | `leading-normal` |

## Letter-spacing — the rule that makes or breaks craft

The single most-skipped rule in AI-generated UI. **No exceptions.**

| Context | Tracking | Tailwind |
|---|---|---|
| Body (14–18px) | `0` | (default) |
| Small (11–13px) | `+0.01`–`0.02em` | `tracking-wide` |
| UI labels / buttons | `+0.02em` | `tracking-wide` |
| **ALL CAPS** | **`+0.06`–`0.1em` (required)** | `tracking-[0.08em]` / `tracking-widest` |
| Headings ≥32px | `-0.01`–`0.02em` | `tracking-tight` |
| Display ≥48px | `-0.02`–`0.03em` | `tracking-tighter` |

ALL CAPS without positive tracking looks cramped and amateur. Display
without negative tracking looks loose and weak. These are the two most
reliable slop tells.

## Line length

Body copy: **50–75 characters** per line. `max-w-[65ch]` is a safe default.
Never `text-justify` on the web (it creates rivers).

## Three-weight system

Most well-crafted UIs use exactly three weights:
- **Read** — `font-normal` (400) body copy
- **Emphasize** — `font-medium` (500) UI text, labels, nav
- **Announce** — `font-semibold` (600) headlines, buttons

`font-bold` (700+) is rarely needed; reaching for it usually means weight
discipline is missing elsewhere.

## Common mistakes (linted / reviewed)

- ALL CAPS without `tracking-[0.06em]`+ → looks amateur.
- Display text (≥32px) without `tracking-tight`/`tracking-tighter`.
- More than 3 type sizes visible above the fold.
- `system-ui`/Inter as the headline identity.
- Body copy in `text-justify`.
