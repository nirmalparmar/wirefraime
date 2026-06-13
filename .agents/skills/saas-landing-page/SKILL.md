---
name: saas-landing-page
description: >-
  Generate polished, modern landing pages, auth screens, and marketing sections
  for SaaS / apps / startups, in any of three current design directions: (A) soft
  "neumorphic" light UI with a dotted hero, floating product-UI props, soft-3D
  icons and a single accent (ChronoTask-style); (B) "aurora" soft mesh-gradient
  heroes with a serif display headline, glassy pill eyebrow and a phone-mockup
  centerpiece (Kenko / coming-soon style); (C) editorial serif layouts with
  floating document cards, dashed connectors and handwritten annotations
  (Drime-style). Also covers split-screen auth pages, 3-tier pricing tables,
  feature grids, countdown/waitlist heroes, and footers with scattered icon
  fields. Use this skill whenever the user wants a landing page, hero section,
  marketing page, product homepage, pricing section, sign-up / login screen,
  "coming soon" page, or "above the fold" — even when they only say "make a
  landing page for my product" without naming a style. The strong default for any
  app / SaaS / startup web page.
---

# Landing Page System

Generate single-file HTML landing pages, auth screens, and marketing sections in
three modern design directions. The skill ships three working templates and a set
of reference modules; you re-skin a template and assemble sections rather than
starting from a blank file.

## Step 1 — Choose a direction

Pick the direction that fits the product, or follow the user's reference image.

| Direction | Looks like | Best for | Template |
|---|---|---|---|
| **A · Soft Light** (neumorphic) | Light gray canvas, white rounded card, dotted hero, soft-3D icons, floating product-UI cards, one accent color, geometric sans | Productivity, B2B SaaS, task/project tools | `assets/template-neumorphic.html` |
| **B · Aurora** (mesh gradient) | Soft pink/peach/lavender (or blue) aurora background, serif or sans display, glassy pill eyebrow, phone-mockup hero, black pill CTA | Consumer apps, fitness/health, lifestyle, "coming soon" / waitlist | `assets/template-aurora.html` |
| **C · Editorial** (serif + paper) | Clean white, large serif headline, floating document/skeuomorphic cards joined by dashed lines, handwritten marker notes, product screenshot | Collaboration, docs, files, professional tools | build from `template-aurora` + `references/effects.md` (serif, dashed connectors, annotations) |
| **Auth** (any direction's brand) | Split screen: mesh-gradient brand panel + clean form, social logins | Sign-up / login / onboarding | `assets/template-auth.html` |

If the brief doesn't pin a product, invent one (name, one-line value prop,
audience) and state the choice in a sentence before building. The decorative
content — props, mockup data, icons — must reflect what the product actually does;
generic placeholders are the main thing that makes these styles read templated.

## Step 2 — Read the references you need

Before writing code, read the modules relevant to the build:

- `references/design-system.md` — tokens for **all three directions** (color, type,
  shadow, radius). Read this first; it defines the `:root` presets.
- `references/components.md` — navbar variants, hero variants, and the floating
  product-UI prop catalog (cards, soft-3D icons, sticky notes).
- `references/sections.md` — pricing tables, feature grids, footers with icon
  fields, auth screens, countdown/waitlist heroes. Read when the page needs more
  than a hero.
- `references/effects.md` — the reusable techniques: mesh/aurora gradients, soft-3D
  icon recipe, CSS phone mockup, dashed connectors, handwritten annotations,
  scattered icon fields, glassy pills. Read when mixing techniques across
  directions (e.g. an editorial serif page with dashed connectors).

## Step 3 — Re-skin a template, then extend

Copy the chosen template to the working directory and edit it. The fastest, most
reliable path:

1. **Change `:root` tokens.** Accent color (or aurora gradient stops) is the
   biggest lever. Regenerate the press/soft variants when you change an accent.
2. **Swap copy** — brand, headline, subtitle, CTA label, nav links.
3. **Re-theme the decorative content** — props, mockup data, pricing tiers, footer
   icons — to the real product.
4. **Add sections** from `references/sections.md` as needed, keeping the shell and
   spacing rhythm intact.
5. **Save** to `/mnt/user-data/outputs/` and, if a browser tool is available,
   render at 1440×900 and check against the rules below before presenting.

## Hard rules (these keep it from drifting generic)

- **One accent (or one gradient family) per page.** In Direction A the CTA, checks,
  progress bars and chips all share `--accent`; in B/C the aurora stops stay in one
  mood. No second bright color fighting for attention.
- **Match type to direction.** A = geometric sans (Plus Jakarta Sans). B/C = serif
  display (Playfair Display / Fraunces) over a clean sans body. Don't put a serif
  headline on the neumorphic template or vice-versa without reason.
- **Decoration must be real.** Floating props, mockup screens, pricing features and
  footer icons should look like genuine slices of the product, with specific fake
  data ("Call with marketing team", "$2,480.00"), never lorem ipsum.
- **Soft, layered shadows.** Drop shadow + inner top highlight on soft-3D icons
  (`--shadow-icon`); large, low, soft shadow to lift cards. Hard/dark shadows break
  every direction.
- **Featured pricing tier is elevated**, taller, accent-filled, with one soft-3D
  badge — the only loud element in the pricing block.
- **Quiet everywhere else.** Hairline borders, generous whitespace, sentence-case
  copy, plain verbs on buttons ("Get started", "Sign up", never "Submit").
- **Quality floor:** responsive (hide/stack props and plans under ~1100px, keep the
  hero legible alone), visible focus, `prefers-reduced-motion` respected.

## Re-skinning examples

- **Finance app (Direction A):** accent `#16a34a`; headline "Spend smart, / save
  faster"; props become a balance card, a transaction list with category badges, a
  soft-3D wallet icon; pricing tiers Starter/Growth/Scale; footer icons coin/chart/
  card/bell.
- **Meditation app (Direction B):** aurora stops shifted to cool lavender/teal;
  serif headline "Find your calm, / one breath at a time"; phone mockup shows a
  session timer with floating mood icons; black pill "Start free trial".
- **Docs tool (Direction C):** serif headline "Write together, / ship faster"; green
  accent; floating cards = a shared doc with a handwritten signature and a "Workspace"
  folder, joined by dashed lines; large editor screenshot below.

The structure stays; the story, palette, type, and props change with the subject.

## Files

- `assets/template-neumorphic.html` — Direction A, full page (hero · pricing · footer).
- `assets/template-aurora.html` — Direction B, mesh-gradient serif hero + phone mockup.
- `assets/template-auth.html` — split-screen auth with mesh-gradient panel.
- `references/design-system.md` · `components.md` · `sections.md` · `effects.md`.