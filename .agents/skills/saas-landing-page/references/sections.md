# Sections — Pricing, Features, Footer, Auth, Coming-Soon

Drop-in section blocks. Full working markup for pricing/footer/auth lives in the
templates; this file is the catalog + the blocks not already in a template.

## Pricing (3-tier, featured middle)

Three cards in a row; the middle tier is elevated, accent-filled, taller, and
carries one soft-3D badge (lightning, star). Side cards are white with a hairline
border. Each card: plan name + blurb, price (`$N` solid, `/mo` muted), full-width
CTA, divider, feature list with accent checkmarks, "Learn more" link. Full markup
in `template-neumorphic.html`. Key bits:

```css
.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;align-items:center}
.plan.featured{background:var(--accent);color:#fff;padding:44px 34px;
  box-shadow:0 30px 60px -20px var(--accent);z-index:2}   /* elevated + glow */
```
On the featured card, invert: white CTA with accent text, white checkmarks,
translucent-white blurb/divider. The badge:
```html
<span class="bolt">⚡</span>   /* absolutely positioned at top-right, soft-3D tile */
```
Under ~1100px stack to one column and give `.featured` `order:-1`.

## Feature grid

2- or 3-up cards, each with a small product mockup or soft-3D icon, a title, and a
one-line description. Center a serif/sans section heading + subtitle above.
```html
<section class="features">
  <h2>Features designed for your success</h2>
  <p class="sub">Everything you need to stay organized and on track.</p>
  <div class="grid">
    <div class="fcard"><div class="shot"><!-- mini UI / icon --></div>
      <h3>Task management</h3><p>Stay on top of everything, from to-dos to long-term projects.</p></div>
    <!-- repeat -->
  </div>
</section>
```
```css
.features{padding:80px 40px;text-align:center}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:1000px;margin:40px auto 0}
.fcard{background:#f7f7f9;border:1px solid var(--line);border-radius:20px;padding:28px;text-align:left}
.fcard .shot{background:#fff;border-radius:14px;box-shadow:var(--shadow-float);padding:18px;margin-bottom:22px;min-height:150px}
```

## Footer with scattered icon field

Top row: brand + a big two-line headline on the left, two columns of arrow-prefixed
links on the right. Below: a field of soft-3D icon tiles scattered at varied
positions/rotations. Bottom row: copyright + legal links. Full markup in
`template-neumorphic.html`. The arrow links:
```css
.links a::before{content:"→";color:var(--ink-muted)}
```
Scatter icons with absolute positioning + small rotations; vary which one is dark
(`background:#1c1f26;color:#fff`) or accent-colored for rhythm. See effects.md >
scattered icon field.

## Auth (split screen)

Two panels in one rounded card: a mesh-gradient brand panel (logo top, pitch
bottom) + a clean form (heading, labeled fields, dark full-width submit, "or
continue with" divider, three social buttons, footer link). Full markup in
`template-auth.html`. Replace the social-button SVGs with the real providers you
support. For "log in" instead of "sign up", drop the password-create hint and the
panel pitch shifts to a returning-user message.

## Coming-soon / waitlist hero

Aurora or solid-gradient hero: "COMING SOON" pill → bold headline → subtitle →
email + "Join waitlist" pill → phone mockup → a countdown row of glassy chips.
```html
<div class="countdown">
  <div class="chip"><b>200</b><span>DAYS</span></div>
  <div class="chip"><b>04</b><span>HOURS</span></div>
  <div class="chip"><b>56</b><span>MINUTES</span></div>
  <div class="chip"><b>04</b><span>SECONDS</span></div>
</div>
```
```css
.countdown{display:flex;gap:14px;justify-content:center;margin-top:40px}
.chip{background:rgba(255,255,255,.55);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.7);
  border-radius:16px;padding:16px 26px;text-align:center}
.chip b{display:block;font-size:30px;font-weight:700}
.chip span{font-size:11px;letter-spacing:.12em;color:var(--ink-soft)}
```
Drive the numbers with a small `setInterval` if a live countdown is wanted;
otherwise static values are fine for a mockup.