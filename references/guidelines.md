# Design guidelines — v1

<!-- Changelog
2026-07-19  v1 — initial version (Phase A).
-->

You are designing real product screens, not lorem-ipsum wireframes. The bar: a founder could
screenshot any screen and put it in a pitch deck. These rules are how we get there.

## 1. Content before decoration

- **Everything is domain-specific.** A fitness app shows "Tempo run · 5.2 km", never "Item 1".
  Invent plausible names, numbers, dates, and copy for the user's domain. Numbers must be
  internally consistent (deltas match direction, totals roughly sum).
- Realistic quantities: tables have 5–8 rows, lists 3–6 items, stat rows 3–4 cards. Never one
  lonely row, never 40.
- Microcopy is short and concrete. Button labels are verbs ("Add customer", not "Submit").
  Descriptions are one sentence, no marketing fluff inside app screens.

## 2. Hierarchy

- One `h1` (`.page-title`) per screen. Sections use `.section-title`. Never skip levels.
- One primary action per screen region: a single `.btn-primary` in the page header; secondary
  actions are `.btn-outline` / `.btn-ghost`. Two primary buttons side by side is always wrong.
- Stats before detail: overview screens lead with a `.grid-3`/`.grid-4` of stat cards, then
  charts, then tables/lists.
- Emphasis comes from structure (size, weight, muted color), never from adding colors.
  Accent color appears in: primary buttons, active nav, badges, chart bars, links. That's it.

## 3. Spacing rhythm

- The layout classes already encode the rhythm — **do not fight them.** `.page` spaces its
  sections; `.stack` spaces contents; cards pad themselves. If you feel the need for a spacer
  div or an empty element, you're using the wrong container.
- Group related things tightly (`.stack-sm`), separate unrelated things generously
  (`.section`, `.stack-lg`). Never equal spacing everywhere — that reads as noise.
- Grids hold same-kind items only (stat cards, feature cards, pricing tiers). Mixed content
  goes in `.stack` or `.split`, not in a grid.

## 4. Composition patterns that work

- **Dashboard:** page header → stat card row → `.grid-2` with a chart card (span-2 on `.grid-3`)
  and a list card → full-width table.
- **List/index screen:** page header with primary action → toolbar row (search `.input` +
  filter `.btn-outline .btn-sm` + tabs) → `.table-wrap` table → footer row with count.
- **Settings:** `.split` with a `.nav` sub-menu left, `.stack` of cards right; each card is one
  concern with its own footer save button OR one footer at the end — not both.
- **Onboarding/auth:** `.shell-centered`, brand at top, one card, one primary action,
  progress indication if multi-step.
- **Pricing:** 3 tiers in `.grid-3`, middle tier carries `.badge-primary` "Popular" and the only
  `.btn-primary`; feature lists use ✓ rows.
- Modals/drawers are shown only when they're the screen's point (e.g. "confirm delete" state);
  otherwise leave them out.

## 5. Don'ts

- Don't invent classes, write inline styles, or embed `<style>`/`<script>`. The sanitizer
  strips them and the screen will look broken — use the catalog.
- Don't use images or icon fonts. Initials in `.avatar`, characters/inline-SVG for icons.
- Don't center body text or tables. Centered is for `.shell-centered` moments and empty states.
- Don't put a card inside a card. Flatten, or use `.separator`.
- Don't use more than one chart per screen region; charts are placeholders, not the content.
- Don't write walls of text. Screens are scannable: labels, values, short sentences.
- Don't add footers with fake legal links inside app shells (that's for marketing pages).

## 6. Copywriting voice

Product copy is calm and specific ("3 invoices due this week") rather than exclamatory
("Wow! You have invoices!"). Empty states explain what will appear and offer the action that
creates it. Error/warning alerts say what happened and what to do next.
