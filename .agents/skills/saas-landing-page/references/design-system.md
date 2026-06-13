# Design System — Three Directions

Each direction is a `:root` token preset. Copy the matching block into a template,
then re-skin. The structure and shadows are shared; color and type define the mood.

## Shared shadows (all directions)

```css
--shadow-card:  0 40px 80px -30px rgba(20,24,33,.28);  /* lift the big card */
--shadow-float: 0 18px 38px -12px rgba(20,24,33,.20);  /* prop cards */
--shadow-icon:  0 14px 26px -8px rgba(20,24,33,.22),
                inset 0 1px 0 rgba(255,255,255,.9);     /* soft-3D icon tiles */
```

The **inset top highlight on `--shadow-icon` is what makes icons read 3D** — never
drop it. Keep all shadows soft, spread, low-opacity. Hard or dark shadows break
every direction.

## Direction A — Soft Light (neumorphic)

```css
--accent:#2d6bff; --accent-press:#1f54d6; --accent-soft:#e8efff;
--page-bg:#e3e5e8; --card-bg:#ffffff; --hero-bg:#fafbfc;
--ink:#16181d; --ink-muted:#a2a8b4; --ink-soft:#5b616e; --line:#ececef;
--note:#faf08e; --note-edge:#ecdf6b;
--display:"Plus Jakarta Sans",system-ui,sans-serif; --hand:"Caveat",cursive;
--radius-card:28px; --radius-prop:18px;
```

- **Type:** geometric sans only. Headline `clamp(40px,7vw,92px)`, weight 700,
  `line-height:.98`, `letter-spacing:-.035em`. Split into a solid line + a `.muted`
  line — the signature cue.
- **Accent rule:** changing `--accent` means regenerating `--accent-press` (~12%
  darker), `--accent-soft` (8% tint on white), and the CTA glow color.
- **Hero field** carries the dotted texture (see effects.md). Canvas (`--page-bg`)
  is a touch darker than the card so the card lifts.

## Direction B — Aurora (mesh gradient)

```css
--serif:"Playfair Display",Georgia,serif; --sans:"Inter",system-ui,sans-serif;
--ink:#1c1b1a; --ink-soft:#6b6864;
--page-bg:#e4e4e6; --card-bg:#fff;
--cta:#1c1b1a; --cta-press:#000;          /* black pill CTA */
--a1:#ffd0e7; --a2:#ffe2bd; --a3:#e3d6ff; --a4:#ffe9d6; --a-base:#fff6f0;  /* aurora stops */
--radius-card:26px;
```

- **Type:** serif display (`--serif`) over a clean sans body (`--sans`). Headline
  weight 600, `line-height:1.04`. A sans display (Inter/Plus Jakarta) is an
  acceptable swap for a more techy product (e.g. a blue "coming soon" page).
- **Mood swaps:** shift the four aurora stops together. Warm = pink/peach/lavender
  (default). Cool = `--a1:#cfe6ff --a2:#d8f0ff --a3:#e6dcff --a4:#dff6ee
  --a-base:#f2f8ff`. Keep them all pastel and in one family; see effects.md for the
  gradient recipe.
- **CTA** is a black pill, not the accent — the gradient is the color story.

## Direction C — Editorial (serif + paper)

```css
--serif:"Playfair Display",Georgia,serif;   /* or Fraunces for more character */
--sans:"Inter",system-ui,sans-serif; --hand:"Caveat",cursive;
--ink:#15140f; --ink-soft:#6f6c66; --line:#e7e6e2;
--page-bg:#ffffff; --card-bg:#ffffff;
--accent:#1faa59; --accent-press:#178a48;   /* Drime-style green; blue also works */
--dash:#cfcfc8;                              /* dashed connector lines */
--radius-card:24px;
```

- **Type:** large serif headline (can run 2 lines, `clamp(44px,7vw,96px)`), refined
  sans body. This direction leans on whitespace and one or two skeuomorphic
  document cards rather than a busy prop field.
- **Signature:** floating document/folder cards joined by dashed connector lines,
  plus a handwritten marker annotation with a curved arrow near the CTA (see
  effects.md). Use sparingly — one annotation, two cards.
- Build it from the aurora template's structure (navbar + centered hero) with a
  white background, then add the editorial pieces from effects.md.

## Radii & spacing (shared)

Card `24–28px`; hero/footer field `22px`; prop & plan cards `16–24px`; icon tiles
`16–24px`. Page gutter (`body` padding) `26–30px`. Navbar padding `~22px 40px`;
hero vertical padding `~90px`. Keep the rhythm consistent down the page.