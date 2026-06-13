# Components — Navbars, Heroes & Prop Catalog

Copy-pasteable blocks. Classes assume the tokens/base styles in the templates.

## Navbars

**Centered links (Direction A)** — brand left, links centered, text "Sign in" +
outlined button right.
```html
<nav>
  <div class="brand"><span class="brand-mark"><i></i><i></i><i></i><i></i></span>BrandName</div>
  <div class="nav-links"><a href="#">Features</a><a href="#">Solutions</a><a href="#">Resources</a><a href="#">Pricing</a></div>
  <div class="nav-actions"><a href="#" class="signin">Sign in</a><button class="btn-outline">Get demo</button></div>
</nav>
```
`.brand-mark` is a 2×2 dot grid; first dot is `--accent`, rest `--ink`.

**Left links + black pill (Direction B/C)** — brand + a few links on the left, one
dark pill CTA on the right ("Download Now", "Register"). Mark the active link with
an underline. See `template-aurora.html`.

## Hero variants

**Centered with floating props (A).** Small soft-3D logo tile, two-tone headline,
subtitle, accent CTA; 4–6 props absolutely positioned around the centered content.
Give the hero a `min-height` (~760px) so props sit in the corners, not over the
headline. See `template-neumorphic.html`.

**Centered with phone mockup (B).** Pill eyebrow → serif headline → subtitle →
inline email+button pill → phone mockup centerpiece with floating circular icons.
See `template-aurora.html` and effects.md (phone mockup, glassy pill).

**Editorial with document cards (C).** Pill eyebrow → big serif headline → subtitle
→ CTA with handwritten annotation; one document card floating left, one folder/
workspace card right, joined to the center by dashed lines; large product
screenshot below. Assemble from effects.md pieces.

**Split auth.** See sections.md > Auth and `template-auth.html`.

## Floating prop catalog (Direction A)

Each prop is `position:absolute` inside `.hero`. Aim for 4–6, balanced across
corners; keep the center clear for the headline.

**Soft-3D icon tile** — the atomic unit. White rounded tile, `--shadow-icon`,
simple near-monochrome glyph (checkmark in `--accent`, clock, bell, wallet…).
```html
<div class="prop icon-soft icon-check" style="top:280px;left:80px">
  <svg viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="7" fill="#2d6bff"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
</div>
```

**Sticky note (with pin)** — one per page max. Handwritten `--hand` copy, slight
rotation, colored bottom edge.
```html
<div class="prop note"><span class="pin"></span>Short handwritten hint about a feature.</div>
```

**Task / list card with progress bars** — the workhorse. Colored number badge,
title, date, progress bar, avatar. Re-theme rows to the product (transactions +
amounts for finance, leads + stages for CRM).
```html
<div class="prop card-prop tasks">
  <h4>Today's tasks</h4>
  <div class="task"><span class="badge" style="background:#ff5a5f">8</span>
    <div class="body"><div class="title">New ideas for campaign</div>
      <div class="meta"><span class="date">Sep 10</span><span class="bar"><i style="width:60%"></i></span><span class="pct">60%</span></div></div>
    <span class="avatar"></span></div>
</div>
```

**Info / reminder card** — eyebrow tab, title, a labeled row, a tinted chip.
```html
<div class="prop card-prop reminders"><div class="tab">Meetings</div><h4>Reminders</h4>
  <div class="row"><b>Today's Meeting</b>Call with marketing team</div>
  <div class="time">Time <span class="chip">13:00 – 13:45</span></div></div>
```

## Balance checklist

- Headline stays centered and uncovered; props live in the margins.
- Balance weight: a big card bottom-left wants a counterweight bottom-right.
- Soft-3D logo tile sits just above the headline, centered.
- Never exceed 6 props — past that it reads cluttered, not delightful.
- Under ~1100px hide all `.prop`; the hero alone must still look complete.

## Copy guidance

Write from the user's side of the screen. Buttons name the action ("Start free",
"Get the app"), never "Submit". Subtitle states the benefit in one plain sentence.
Specific fake data sells the product far better than placeholders.