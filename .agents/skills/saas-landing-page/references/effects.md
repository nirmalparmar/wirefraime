# Effects — Reusable Techniques

The signature techniques behind these directions. Mix freely (e.g. an editorial
serif page that uses dashed connectors and a soft-3D icon).

## Mesh / aurora gradient

Layer several large, soft radial-gradients over a pale base. Keep every stop
pastel and in one color family; let them overlap so the blends look organic.
```css
background:
  radial-gradient(60% 50% at 18% 28%, var(--a1) 0, transparent 60%),
  radial-gradient(55% 45% at 85% 18%, var(--a2) 0, transparent 60%),
  radial-gradient(60% 55% at 75% 75%, var(--a3) 0, transparent 60%),
  radial-gradient(50% 50% at 25% 85%, var(--a4) 0, transparent 60%),
  var(--a-base);
```
For an animated aurora, slowly shift the `at x% y%` positions with a long
`@keyframes` (respect `prefers-reduced-motion`). Warm = pink/peach/lavender; cool =
blue/teal/lilac; keep it subtle.

## Soft-3D (neumorphic) icon

A white rounded tile, soft drop shadow + inner top highlight, holding one simple
near-monochrome glyph. The inner highlight is non-negotiable — it creates the lift.
```css
.icon-soft{width:90px;height:90px;border-radius:22px;background:#fff;display:grid;place-content:center;
  box-shadow:0 14px 26px -8px rgba(20,24,33,.22), inset 0 1px 0 rgba(255,255,255,.9)}
```
Tint the tile (e.g. a yellow lightning, a black clock) for accents in a field.

## CSS phone mockup

Rounded rect + thick dark border + a notch; fill the screen with a tiny slice of
the app and float circular gradient icons near the bottom. Full markup in
`template-aurora.html`. Skeleton:
```css
.phone{width:300px;height:430px;border-radius:42px;background:#fff;border:9px solid #111;overflow:hidden;position:relative;
  box-shadow:0 40px 70px -30px rgba(28,27,26,.45)}
.notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:110px;height:24px;background:#111;border-radius:0 0 16px 16px}
```
The floating circular icons use radial-gradient fills; enlarge the active one and
give it a colored glow.

## Dashed connector lines (Direction C)

Tie floating document cards back to the hero with thin dashed lines/borders. Use a
dashed border on a positioned element, or an SVG `<line stroke-dasharray="6 6">`.
```css
.connector{border-top:1.5px dashed var(--dash)}
.doc-card{border:1.5px dashed var(--dash);border-radius:14px;padding:14px;position:absolute}
```
Keep them faint (`--dash`) so they suggest structure without shouting.

## Handwritten annotation + arrow (Direction C)

A short marker note in `--hand` beside the CTA, with a hand-drawn curved arrow
pointing to it. Arrow as inline SVG:
```html
<span class="annot">Tap it's free</span>
<svg class="arrow" width="70" height="40" viewBox="0 0 70 40" fill="none">
  <path d="M2 8 C 25 2, 55 6, 62 30" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M62 30 l-9 -4 M62 30 l-2 -9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
```
```css
.annot{font-family:var(--hand);font-size:22px}
```
One per page — it's a wink, not a pattern.

## Scattered icon field (footer)

Soft-3D tiles placed at varied `top/left` with small rotations, a couple tinted
dark or accent for rhythm.
```css
.icon-field{position:relative;height:300px}
.icon-field .fi{position:absolute;width:64px;height:64px;border-radius:16px;background:#fff;
  display:grid;place-content:center;box-shadow:0 14px 26px -8px rgba(20,24,33,.22), inset 0 1px 0 rgba(255,255,255,.9)}
```
```html
<div class="fi" style="top:30px;left:14%;transform:rotate(-8deg)">20</div>
<div class="fi" style="top:150px;left:30%;background:#1c1f26;color:#fff">🕐</div>
```

## Glassy pill eyebrow

Translucent white pill with blur + a soft shadow, above the headline.
```css
.pill{background:rgba(255,255,255,.7);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.8);
  border-radius:999px;padding:9px 18px;font-size:13px;box-shadow:0 6px 18px -8px rgba(28,27,26,.25)}
```
On a white (Direction A) page use a solid white pill + hairline border instead of
glass.