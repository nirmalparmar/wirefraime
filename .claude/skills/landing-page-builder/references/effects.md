# Visual Effects & The Token Contract

These are the concrete CSS recipes that make a page look hand-crafted instead of
default. Each is parametrized by CSS variables so the page stays re-skinnable. Pull
in only the ones your chosen direction calls for — don't pile them all on.

## The token contract (define this first)

Before building sections, commit to tokens at the top of the file. This forces an
aesthetic decision early and makes the whole page coherent and re-themeable. A
single-file HTML page should open with something like:

```css
:root {
  /* color — keep it disciplined: bg, ink, muted, one accent */
  --bg:      #ffffff;
  --surface: #f7f8fa;
  --ink:     #14171f;
  --muted:   #6b7280;
  --accent:  #2f7fff;
  --accent-ink: #ffffff;

  /* type */
  --font-display: "Instrument Serif", Georgia, serif;
  --font-body:    "Inter", system-ui, sans-serif;

  /* spacing rhythm — everything is a multiple of 8px */
  --space-section: clamp(4rem, 9vw, 8rem);   /* vertical padding per section */
  --maxw: 1200px;

  /* radius scale from one base */
  --r:    14px;
  --r-sm: calc(var(--r) - 6px);
  --r-lg: calc(var(--r) + 10px);

  /* shadow ladder — layered, tinted, negative-spread */
  --shadow-sm:   0 1px 2px rgba(20,24,33,.06);
  --shadow-card: 0 30px 60px -30px rgba(20,24,33,.28);
  --shadow-float:0 18px 38px -12px rgba(20,24,33,.20);

  /* signature easings (see motion.md) */
  --ease-pop: cubic-bezier(.16,1,.3,1);
  --ease-out: cubic-bezier(.22,1,.36,1);
}
```
To re-skin the whole page, a user edits ~8 values. Add a comment saying so.

**Vertical rhythm utility** — apply consistent breathing room everywhere instead of
guessing `py-*` per section:
```css
.section   { padding-block: var(--space-section); }
.container { max-width: var(--maxw); margin-inline: auto; padding-inline: clamp(1.25rem, 4vw, 2rem); }
```

---

## Aurora / mesh-gradient background

The dreamy, editorial background. The secret is **percentage-sized radial ellipses
that fade to transparent (~60%), layered over a *tinted, non-white* base.** A pure
white base kills the effect.

```css
.aurora {
  background:
    radial-gradient(60% 50% at 18% 28%, var(--a1) 0, transparent 60%),
    radial-gradient(55% 45% at 85% 18%, var(--a2) 0, transparent 60%),
    radial-gradient(60% 55% at 75% 75%, var(--a3) 0, transparent 60%),
    radial-gradient(50% 50% at 25% 85%, var(--a4) 0, transparent 60%),
    var(--a-base);
}
:root {
  --a1:#ffd0e7; --a2:#ffe2bd; --a3:#e3d6ff; --a4:#ffe9d6; --a-base:#fff6f0;
}
```
To make it drift slowly (gate behind reduced-motion):
```css
.aurora { background-size: 200% 200%; animation: drift 18s ease-in-out infinite alternate; }
@keyframes drift { to { background-position: 100% 100%; } }
@media (prefers-reduced-motion: reduce) { .aurora { animation: none; } }
```

## Neumorphic soft shadows

A refined "soft elevation," not the dated dual-inset kind. Large **negative-spread**
drop shadows keep the shadow tight to the element, and an `inset` top highlight
fakes a lit edge.

```css
:root {
  --shadow-shell: 0 40px 80px -30px rgba(20,24,33,.28);                       /* big card */
  --shadow-tile:  0 14px 26px -8px rgba(20,24,33,.22),                        /* small tile */
                  inset 0 1px 0 rgba(255,255,255,.9);                          /* lit top edge */
}
.shell { background:#fff; border-radius:28px; box-shadow:var(--shadow-shell); }
.icon-tile { background:#f3f5f8; border-radius:16px; box-shadow:var(--shadow-tile); }
```

## Color-matched glow

CTAs and featured cards feel premium when their shadow is **tinted their own color**
rather than gray:
```css
.btn-primary    { background: var(--accent); box-shadow: 0 14px 26px -10px var(--accent); }
.plan.featured  { box-shadow: 0 30px 60px -20px var(--accent); }
```

## Glassmorphism (frosted pill / surface)

```css
.glass {
  background: rgba(255,255,255,.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.8);
  box-shadow: 0 6px 18px -8px rgba(20,24,33,.25);
}
```
On dark themes, invert: `background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.08);`.

## Inset-shell card architecture

The "everything floats on a tinted canvas inside one rounded shell" look (great for
neumorphic/aurora). The page body is the canvas with a gutter; the shell is a
rounded card; inner sections inset further so they read as nested tiles.
```css
body  { background: var(--page-bg); padding: 28px; }
.shell{ background: var(--card-bg); border-radius: 28px; overflow: hidden; box-shadow: var(--shadow-shell); }
.hero { margin: 0 14px 14px; border-radius: 22px; }       /* inset inner tile */
```

## Dotted-grid background field

A subtle texture for hero canvases and footers. One tiled radial gradient:
```css
.dotgrid {
  background-image: radial-gradient(rgba(20,24,33,.06) 1.1px, transparent 1.1px);
  background-size: 18px 18px;
}
```
For a fading grid, layer a `mask-image: radial-gradient(...)` so dots fade at edges.

## Gradient / clipped text

A controlled way to add color to a headline word without clutter:
```css
.gradient-text {
  background: linear-gradient(90deg, var(--accent), #9b6bff);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
```
Use on one or two words, not whole paragraphs.

## Film grain overlay (cinematic)

A faint SVG-noise layer over a dark page adds analog texture:
```css
.grain::after {
  content:""; position:absolute; inset:0; pointer-events:none; opacity:.06;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

---

## Device & product mockups (the hero centerpiece)

A realistic mockup showing the actual product beats any stock image. Two recipes:

**Browser-chrome frame** (for web apps/dashboards):
```html
<div class="browser">
  <div class="bar">
    <span class="dot" style="background:#ff5f57"></span>
    <span class="dot" style="background:#febc2e"></span>
    <span class="dot" style="background:#28c840"></span>
    <div class="url">app.yourproduct.com</div>
  </div>
  <div class="screen"><!-- fake dashboard: sidebar + KPIs + chart --></div>
</div>
<style>
  .browser{ border-radius:14px; overflow:hidden; box-shadow:var(--shadow-card); background:#fff; }
  .bar{ display:flex; align-items:center; gap:8px; padding:12px 14px; background:#f1f3f5; }
  .dot{ width:11px; height:11px; border-radius:50%; }
  .url{ margin-left:12px; font-size:12px; color:#888; background:#fff; padding:4px 12px; border-radius:6px; }
</style>
```

**Phone frame** (for mobile apps): a rounded rect with a thick dark "bezel"
(`border: 9px solid #111; border-radius: 42px`), an inner screen, and a notch element.

**Fill the mockup with a believable mini-product**, not a blank box:
- SVG ring/donut progress (`stroke-dasharray` + `transform: rotate(-90deg)`)
- A sparkline / area chart with a `linearGradient` fade fill (stop-opacity .25 → .02)
- Bars that grow in on reveal
- A few count-up KPI tiles
- A fake notification list, chat thread, or table row

These "live" mini-mocks are the strongest signal of hand-craft — see the SaaS,
dashboard, and AI-tool source pages. Tailor the mock to what the product actually does.

## Decorative "props" (playful directions)

Floating mini-cards that imply the product (a reminder card with a progress bar, a
task tile, a rotated sticky note with a handwriting font and a "pin"). Position them
absolutely around the hero. **Drop them on mobile** (`display:none` under a
breakpoint) rather than trying to reflow — keeps small screens clean.

---

## A note on restraint

Every recipe here is optional. A world-class page might use exactly one of them (a
single aurora background, or a single signature shadow ladder) executed perfectly.
Piling on aurora + neumorphism + glass + grain + gradient text produces noise, not
craft. Choose what your direction needs and stop.
