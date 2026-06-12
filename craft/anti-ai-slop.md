# Anti-AI-slop rules

Concrete, checkable rules that separate "designed by a senior product
designer" from "default LLM output." The ones marked **(linted)** are
auto-enforced by `lib/design/lint-artifact.ts` — failing one is a
regression, not a style preference.

> Adapted for Wirefraime (Tailwind semantic tokens + Iconoir) from
> Open Design's craft layer, in turn from refero_skill (MIT).

## The seven cardinal sins (P0 — must fix)

1. **Default indigo/violet/purple as the accent (linted).** Any
   `bg-indigo-*`, `text-violet-*`, `from-purple-*`, or raw `#6366f1`
   `#4f46e5` `#7c3aed` `#8b5cf6` `#a855f7`. This is the single most
   reliable AI tell. Use the brand token — `bg-primary` / `text-primary`
   / `bg-primary-soft` — which resolves to the design system's color.
2. **Two-stop "trust" gradient (linted).** purple→blue, blue→cyan,
   indigo→pink behind a hero. A flat `bg-surface` + intentional type
   hierarchy beats it every time. Gradients separate hierarchy, they
   don't decorate empty space.
3. **Emoji as icons (linted).** ✨🚀🎯⚡🔥💡 inside headings, buttons,
   list items, or links. Always use Iconoir: `<i class="iconoir-spark
   text-[20px]"></i>`. Zero emoji, anywhere.
4. **Hardcoded palette colors instead of tokens (linted).**
   `bg-blue-500`, `text-gray-400`, `border-slate-200`. These break the
   design-system contract *and* the click-to-edit editor. Use
   `bg-surface` / `text-muted` / `border-border` / `bg-primary`.
   (`text-white` / `text-black` on a colored fill are fine.)
5. **Invented metrics (linted).** "10× faster", "99.9% uptime", "3×
   more productive." Either ground them in a real source or label them:
   "Sample metric", "Pending data".
6. **Filler copy (linted).** `lorem ipsum`, "Feature one / two / three",
   "Card title", "$XX.XX", "User 1", "Name Here". An empty section is a
   composition problem, not a reason to invent words.
7. **Rounded card + colored left-border (linted).** The canonical "AI
   dashboard tile" (`rounded-card border-l-4 border-primary`). Drop
   either the radius or the left border; pick one structural signal.

## Soft tells (P1 — should fix)

- **The default skeleton** — Hero → Features (3 cards) → Pricing → FAQ →
  CTA with zero variation. Introduce one unconventional section: a
  full-bleed quote wall, pricing framed against the status-quo cost, an
  inline mini-demo.
- **Accent overuse** — `bg-primary` / `text-primary` used 6+ times in
  one screen. Cap at ~2 visible accent uses (one CTA + one highlight).
- **Over-rounding** — everything at `rounded-2xl`. Radius is a voice;
  pick one and commit (sharp, standard, or pill), don't blanket-round.
- **Decorative blobs / wave SVG backgrounds** — meaningless geometry.

## Polish tells (P2 — nice to fix)

- Major sections (`<section>`, hero, cards, forms) without a
  `data-wf-name="…"` anchor — the editor can't target them cleanly.
- Perfect symmetry with no tension. Alternate density: one tight
  section, one that breathes.

## How to add soul without breaking the rules

Aim for **~80% proven patterns + ~20% distinctive choice.** Put the 20% in:

- One bold visual move — a type choice, a single color decision, an
  unexpected proportion.
- Voice — a button that says "Start tracking" beats "Get started".
- One micro-interaction worth remembering — a press that moves 2px, a
  number that counts up.
- One product-specific detail only a real user would add (a kbd-shortcut
  hint, a status badge with the product's own phrasing).

If someone outside the project can screenshot the result and name the
product, it has soul. If not, it's a template.
