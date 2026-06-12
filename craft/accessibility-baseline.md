# Accessibility baseline craft rules

The floor an interface must clear before it ships. Target **WCAG 2.2 AA**.
The design system owns appearance; these rules are non-negotiable.

## Color contrast

| Pair | Minimum |
|---|---|
| Normal text (<18pt / <24px) | 4.5:1 |
| Large text (≥18pt ≈24px, or 14pt bold ≈18.5px) | 3:1 |
| Non-text UI + graphical objects | 3:1 |
| Focus indicator vs unfocused state | 3:1 |

Thresholds are inclusive; don't round 2.99:1 up. "Large" means 18 *pt*,
not 18px — 18px regular still needs 4.5:1.

## Touch / click targets

- **AA floor: 24×24 CSS px.** Craft commitment: 44×44 (`h-btn` is already
  sized for this). Inline text links are exempt; primary actions are not.

## Focus visibility

Never `outline: none` without a replacement — it's a triple WCAG failure
(1.4.11, 2.4.7, 2.4.13). Use `:focus-visible`; Wirefraime ships a
`shadow-focus` ring token — apply it on interactive elements.

## Forms

- Every input has a real `<label for>`. Placeholder text is **not** a
  label (it disappears on input and fails 1.3.1 / 3.3.2).
- Wire errors: `aria-describedby` pointing at hint + error spans;
  `aria-invalid="true"` on failure; `role="alert"` on the error message.

## Keyboard & semantics

- Every interactive element is reachable and operable by keyboard. Don't
  use `tabindex` > 0 (it breaks document order) — fix the DOM instead.
- Use native elements: `<button>` for actions, `<a href>` for navigation.
  A bare `<a>` with a click handler and no `href` is not focusable and not
  a link. Reach for `role=` only when no native element fits.
- Use landmarks — `<header> <nav> <main> <aside> <footer>` — not
  `<div role="banner">`. AT users navigate by landmark.
- One `<h1>` per page; don't skip heading levels (`h1`→`h3`). Heading
  *level* and visual *size* are independent — style the level you mean.
- Content images need `alt`; decorative images `alt=""`; icon-only
  buttons need `aria-label`. Charts/data viz need a text alternative.

## Motion & flashing

- Honor `@media (prefers-reduced-motion: reduce)` on anything that
  translates, scales, rotates, or parallaxes (see `animation-discipline`).
- Nothing flashes more than 3×/second (WCAG 2.3.1, photosensitive safety).

## Common mistakes (reviewed)

- Citing 44×44 as the AA bar — that's AAA; AA is 24×24.
- "18px = large text" — it's 18 *pt* (~24px).
- Removing focus outline with no replacement.
- Placeholder as the only label.
- `<div role="button">` without keyboard handling, focus, or state.
- Color alone signaling state.
