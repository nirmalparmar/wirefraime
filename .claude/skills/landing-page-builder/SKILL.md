---
name: landing-page-builder
description: >-
  Build world-class, conversion-focused landing pages and marketing sites — hero,
  features, social proof, pricing, FAQ, CTA, footer — that look hand-crafted, not
  template-generated. Use whenever the user wants a landing page, marketing page,
  product/launch/waitlist/coming-soon page, hero or pricing section, or "a site
  for my [startup/app/product/SaaS/agency/event]," even without the words "landing
  page." Also use when redesigning an existing marketing page, or when a request
  implies one ("a page to sell X," "something to capture signups for Y"). Produces
  a single self-contained HTML file or a React + Vite + Tailwind + shadcn project,
  with proven section recipes, aesthetic directions, motion primitives, and
  signature CSS effects (aurora gradients, neumorphism, glassmorphism, animated
  product mocks). Owns landing-page anatomy, conversion craft, and the build;
  complements frontend-design (general taste) rather than duplicating it.
---

# Landing Page Builder

A great landing page does one job: take a specific visitor and move them one step
closer to a single decision. Everything on the page either serves that decision or
gets cut. The difference between a world-class page and the generic output that
floods the web is not more sections or more animation — it's **judgment**: a point
of view about who this is for, an aesthetic that belongs to *this* product and no
other, copy that sounds like a person, and craft in the details (easing, spacing,
shadows) that most people feel but can't name.

Your job with this skill is to bring that judgment, not to paste a template. The
references give you a deep, proven toolkit — section recipes, eight aesthetic
directions, motion primitives, and signature CSS effects — distilled from a set of
genuinely excellent pages. Use them as raw material you compose intelligently for
*this* brief, the way a designer uses a sketchbook of past work.

## The workflow

Work through these in order. Don't skip the thinking steps to get to code faster —
the thinking is where the quality comes from.

**1. Understand the brief — and the page's one job.** Before anything, get
concrete about:
- *Subject:* what exactly is this product/service/event? What does it actually do?
- *Audience:* who lands here, and what do they already believe/want/fear?
- *The one action:* sign up? book a demo? buy? join a waitlist? Pick the single
  primary conversion goal. A page chasing three goals converts on none.
- *Tone:* serious enterprise? playful consumer? indie/technical? luxury?

If the user gave you a thin brief ("make a landing page for my app"), you can still
proceed — invent specific, plausible details (a name, a real value proposition,
concrete features, realistic copy) rather than leaving `[Your headline here]`
placeholders. A specific, opinionated page is far more useful to react to than a
hollow skeleton. Just make your assumptions visible so the user can correct them.

**2. Choose the output format.** See the decision rule below.

**3. Choose ONE aesthetic direction.** Read `references/themes.md`. Pick a
direction whose personality fits the subject (a film studio is not a tax-software
company). Restraint wins: one accent color, one type pairing, one signature move.
Resist the urge to combine three looks — that's exactly what reads as "AI made
this." If the user named a vibe, honor it; otherwise pick deliberately and say why.

**4. Plan the section sequence.** Read `references/sections.md` for the anatomy and
the conversion logic of each section. Decide the order and what each section must
accomplish *for this specific visitor*. Not every page needs every section — a
waitlist page might be hero + social proof + CTA and nothing else.

**5. Establish the token contract first.** Before building sections, define the
design tokens (colors, fonts, spacing scale, radius, shadows) as CSS variables at
the top. This is what makes a page coherent and trivially re-skinnable, and it
forces you to commit to the aesthetic before you start decorating. See the token
patterns in `references/effects.md` (HTML) and `references/react-stack.md` (React).

**6. Build section by section,** composing the motion primitives
(`references/motion.md`) and visual effects (`references/effects.md`). Write real
copy. Build product-specific mocks instead of dropping in stock icons (see why
below). Honor `prefers-reduced-motion` from the start, not as an afterthought.

**7. Self-critique against the brief.** When you have a draft, look at it with
fresh eyes (take a screenshot if you can render it). Ask: does the hero make the
value obvious in 5 seconds? Does it look like it belongs to this product
specifically? Did I land on a generic cliché on any axis? Then fix the weakest
section. One real critique-and-fix pass separates good from forgettable.

## Output format decision

The skill produces two shapes. Choose based on the brief, and when it's ambiguous,
**default to a single HTML file** — it's faster, instantly previewable, and easily
pasted anywhere.

**Single self-contained HTML file** — the default. One `.html` with Tailwind via
the Play CDN (`<script src="https://cdn.tailwindcss.com">`) or inline `<style>`,
fonts via Google Fonts `<link>`, all CSS variables and effects inline. Choose this
for: "build me a landing page for X," quick pages, prototypes, anything the user
wants to preview or hand off as one file. Renders immediately in a browser with
zero build step.

**React + Vite + Tailwind + shadcn project** — choose this when the brief signals a
real application: the user says "in my React/Next app," "componentized," "with
shadcn," "a multi-page site," "deployable project," names a framework, or points
you at an existing repo to add to. Follow `references/react-stack.md` for setup,
token architecture, the reusable `Reveal`/`CountUp`/`SectionHeader` primitives, and
conventions. If they point at an existing codebase, match its stack and tokens
instead of scaffolding fresh.

State which format you're using and why in one line, then build.

## What separates world-class from generic

These are the differences that show up across every excellent page in the source
material. Internalize them — they matter more than any single section.

- **Restraint in color.** The best pages use one accent over a disciplined neutral
  palette. Generic output over-saturates and uses color everywhere. Spend your
  boldness in *one* place.
- **Type is the hero.** Pair a display face with a body face deliberately (a serif
  display over a sans body is a recurring power move). Use tight negative tracking
  on big headlines (`-0.02em` to `-0.05em`), near-1.0 line-height on display sizes,
  and fluid `clamp()`/`vw` sizing so type scales with the viewport. Default system
  fonts at default spacing are the #1 tell of a template.
- **Custom easing, never the browser default.** Reach for designed curves like
  `cubic-bezier(.16,1,.3,1)` (elastic pop) or `cubic-bezier(.22,1,.36,1)`
  (confident ease-out). Linear and ease are fingerprints of un-tuned work.
- **Animated product mocks instead of stock icons.** This is the single biggest
  signal of hand-craft. A feature card with a tiny live dashboard, an equalizer, a
  count-up KPI, a fake chat window, or a sparkline beats a generic Lucide icon
  every time. Build mocks that show *this* product.
- **Layered, tinted, negative-spread shadows.** `0 30px 60px -30px rgba(...)` with
  an optional `inset 0 1px 0 rgba(255,255,255,.9)` highlight reads as depth.
  `0 2px 4px` reads as a default. CTAs and featured cards can glow with a shadow
  *tinted their own color*.
- **Tuned scroll reveals.** Fire reveals slightly *before* full entry
  (`rootMargin: "0px 0px -8% 0px"`, `threshold ~0.12`), once, then disconnect.
  Subtle (`translateY(20–28px)`, ~0.7–0.9s). Never a wall of bouncing elements.
- **Generous, rhythmic whitespace.** An 8px spacing base, large section padding
  (`py-24` to `py-32`), and a consistent radius scale derived from one base value.
  Cramped, irregular spacing is what makes amateur pages feel amateur.
- **Seamless loops.** Marquees/tickers duplicate their track and translate by an
  exact fraction so the loop never visibly jumps; fade the edges with `mask-image`.
- **Accessibility is part of "world-class."** Honor `prefers-reduced-motion`
  (jump to final state), keep visible keyboard focus, use semantic landmarks and
  real alt text, maintain contrast. A beautiful page that's unusable isn't world-class.

If you find yourself reaching for cream + serif + terracotta, or near-black +
single acid-green accent, or thin hairline rules everywhere — stop. Those are the
three most over-used "AI designer" looks. When an axis is free, pick something
that actually belongs to the subject instead.

## Reference map — read what you need, when you need it

| File | Read it when |
|---|---|
| `references/sections.md` | Planning the page: section anatomy, ordering, and the conversion job each section does. Start here after the brief. |
| `references/themes.md` | Choosing the aesthetic. Eight fully-specified directions (palette, fonts, motion personality, when to use). |
| `references/motion.md` | Adding motion. The `Reveal`/`CountUp` primitives, marquees, typewriter, signature easings, parallax, reduced-motion handling. |
| `references/effects.md` | Building the look. Aurora/mesh backgrounds, neumorphic shadows, color-matched glows, glassmorphism, device mockups, dot grids, gradient text, the HTML token contract. |
| `references/react-stack.md` | Building the React output. Vite + Tailwind v4 + shadcn setup, oklch/HSL token architecture, rhythm utilities, reusable components, conventions. |
| `assets/starter.html` | Starting an HTML page. A ready token contract + rhythm + motion primitives + reduced-motion guards to build on. Copy and customize. |

## Quality checklist — before you call it done

- [ ] The hero communicates *what this is and why it matters* within 5 seconds, and the primary CTA is unmistakable.
- [ ] One accent color, one type pairing, one signature element — coherent, not a collage.
- [ ] Real, specific copy throughout (no `lorem ipsum`, no `[placeholder]`).
- [ ] At least one product-specific mock or visual, not just icons.
- [ ] Tokens defined once at the top; spacing/radius/shadows are consistent.
- [ ] Motion is subtle, tuned, fires once, and respects `prefers-reduced-motion`.
- [ ] Fully responsive; decorative elements degrade gracefully on mobile.
- [ ] Did not land on any of the three clichéd "AI" looks on a free axis.
- [ ] (HTML) opens and renders correctly as a single file. (React) builds without errors.
