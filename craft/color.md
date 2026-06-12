# Color craft rules

Universal color rules applied on top of the design system. The design
system supplies the palette as semantic tokens (`bg-primary`,
`bg-surface`, `text-foreground`, `text-muted`, `border-border`,
`bg-success`, `bg-error`); this file governs how to *use* them.

## Palette structure

A coherent palette has four layers. Plan all four before styling.

| Layer | Share of pixels | Tokens |
|---|---|---|
| **Neutrals** | 70–90% | `bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `border-border` |
| **Accent** (one) | 5–10% | `bg-primary` / `text-primary` / `bg-primary-soft` only |
| **Semantic** | 0–5% | `bg-success`, `bg-error` (+ their `-soft` variants) |
| **Effect** | <1% | gradients, glows — rarely justified |

## Accent discipline

Accent overuse is the biggest readability failure in AI UI. Hard caps:

- **At most ~2 visible uses of the primary accent per screen.** Typical
  pair: one eyebrow/badge + one primary CTA. Or one accent tab + one
  highlighted card. Pick a pair, not a flood.
- Links count as accent. If a screen already has a primary CTA, demote
  body links to `text-foreground underline`.
- Hover/focus rings count too — `shadow-focus` is fine on the focused
  control, not on everything at rest.

## Contrast minimums (gates, not goals)

| Pair | Minimum |
|---|---|
| Body text (≤16px) on its background | 4.5:1 |
| Large text (>18px, or 14px bold) | 3:1 |
| UI components vs adjacent surface | 3:1 |

If the brand accent is low-contrast on light backgrounds, use it for
fills only and use `text-foreground` for the actual text.

## Dark themes

Avoid pure black and pure white — both vibrate and strain the eye.
Background `#0f0f0f` not `#000`; foreground `#f0f0f0` not `#fff`. On dark
surfaces, prefer hairline `border-white/10` over solid dark borders.

## Use tokens, never palette classes

```html
<!-- good: resolves to the design system, editable, themeable -->
<div class="bg-surface text-foreground border border-border">
<button class="bg-primary text-white">

<!-- bad: locks you out of the design system + breaks click-to-edit -->
<div class="bg-gray-100 text-gray-900 border-gray-200">
<button class="bg-blue-600 text-white">
```

## Anti-defaults

- **Indigo `#6366f1` / `bg-indigo-*`** is the most reliable AI-slop tell.
  Use `bg-primary`. If the brief genuinely needs indigo, encode it in the
  design system's `--color-primary`, don't hardcode the class.
- **Two-stop "trust" gradient** (purple→blue, blue→cyan) on a hero is the
  second. A flat surface + one type-driven hierarchy wins.
- **Decorative gradients with no functional job.** Gradients separate
  hierarchies (header→body, primary→secondary CTA), they don't fill space.
