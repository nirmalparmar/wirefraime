# Laws of UX craft rules

Cognitive and perceptual heuristics that decide what a UI *composes* — how
many pricing tiers fit, where the primary action anchors, how to group a
settings list. Each entry ends in an actionable directive. Guidance, not
linted.

## Perception & grouping

- **Proximity** — near things read as grouped. Use variable rhythm: 8–12px
  *within* a group, 32–48px *between* groups (`gap-2` vs `gap-8`,
  `space-y-2` vs `space-y-10`). Uniform spacing reads as nothing grouped.
- **Similarity** — equivalent affordances share treatment: every list row
  the same class set, every secondary button identical. Deviation is
  reserved for the one item meant to stand out.
- **Common Region** — a bounded surface (`bg-surface` + `border-border` +
  `rounded-card`, padding ≥16px) binds its contents. Reserve it; if every
  section is a card, the signal dies.
- **Von Restorff** — the item that differs is the one remembered. Make the
  recommended pricing tier / active nav item / warning state visually
  distinct, and pair contrast with a non-color signal (icon, label).
- **Aesthetic-Usability** — polish buys forgiveness for minor friction.
  Refined type + generous whitespace earn trust. Never a substitute for
  actually working (see `state-coverage`).

## Decision-making

- **Hick's Law** — decision time grows with the number of equal options.
  Cap a single decision to **3–5 primary options**; collapse the rest
  behind "More"; make the recommended choice visually distinct.
- **Choice overload** — pricing pages: **3–4 tiers, exactly one marked
  recommended**. Product grids: 6–9 hero cards above the fold. Settings:
  ≤5 named groups. Never a flat wall of equivalents.
- **Anchoring** — the first number reframes the rest. Place the
  recommended tier where it anchors the comparison; show yearly savings as
  a concrete dollar delta, not just a "%" badge.
- **Pareto (80/20)** — emphasize the 2–3 actions that drive the dominant
  journey; demote the long tail to overflow menus / footer / settings.

## Memory & learning

- **Miller / chunking** — working memory holds ~4 items. Group related
  fields under headings, dividers, or cards. "Account / Notifications /
  Privacy / Billing / Danger zone" beats a flat list of 30 toggles.
- **Serial position** — recall favors first and last. Anchor the most
  important nav items at the left and right ends; cluster utilities in the
  middle.
- **Peak-End** — memory is dominated by the peak and the ending. Stage a
  strong success/completion state; keep intermediate steps calm.
- **Zeigarnik** — visible progress ("3 of 5 steps") converts open-loop
  tension into completion pressure. Reserve for genuinely useful flows
  (onboarding), not streak/quota dark patterns.

## Interaction & expectation

- **Fitts's Law** — bigger and closer is faster to hit; spacing between
  adjacent targets matters as much as size. On mobile, put high-frequency
  controls in the thumb arc.
- **Jakob's Law** — users expect your UI to work like the others they
  already use. Reuse convention (cart icon top-right, settings gear, nav
  placement, primary CTA upper-right of a SaaS landing). Novelty must earn
  its keep against the convention's ROI.
- **Mental model** — when the brief names a reference product, anchor to
  it explicitly; you inherit a transferable interaction grammar.
- **Cognitive load** — designers own *extraneous* load: poor layout,
  jargon, inconsistent patterns, visual noise. The single-accent rule
  (`color`), three-weight type (`typography`), and the anti-default list
  (`anti-ai-slop`) all exist to reduce it.

## Common mistakes (reviewed)

- A flat wall of equal-weight options (violates Hick + choice overload).
- Uniform spacing everywhere (kills proximity grouping).
- Every section bordered (kills common-region signal).
- Reserving the strongest contrast for decoration instead of the one
  goal-relevant action.
