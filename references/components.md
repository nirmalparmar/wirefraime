# Component & class catalog

Every class you may use, with copy-paste snippets. **If a class is not in this file, do not use
it.** No inline `style` attributes, no `<style>` blocks, no hex colors, no Tailwind. All styling
comes from these classes; color/spacing/radius come from the project theme automatically.

A screen is one HTML fragment. It always starts with a shell.

---

## Shells (pick exactly one per screen)

### `.shell.shell-sidebar` — app with left nav

```html
<div class="shell shell-sidebar">
  <aside class="sidebar">
    <div class="brand"><span class="brand-mark">A</span> Acme</div>
    <nav class="nav">
      <span class="nav-label">Workspace</span>
      <a class="nav-item active">Overview</a>
      <a class="nav-item">Customers</a>
      <a class="nav-item">Settings</a>
    </nav>
    <div class="sidebar-footer">
      <div class="row">
        <span class="avatar">JD</span>
        <div class="list-item-body">
          <p class="text-sm font-medium">Jane Doe</p>
          <p class="text-xs text-muted">jane@acme.com</p>
        </div>
      </div>
    </div>
  </aside>
  <main class="page"> … </main>
</div>
```

### `.shell.shell-topnav` — horizontal nav (marketing-ish tools, simple apps)

```html
<div class="shell shell-topnav">
  <header class="topnav">
    <div class="brand"><span class="brand-mark">A</span> Acme</div>
    <nav class="nav">
      <a class="nav-item active">Home</a>
      <a class="nav-item">Reports</a>
    </nav>
    <div class="topnav-actions">
      <button class="btn btn-ghost">Help</button>
      <button class="btn btn-primary">Upgrade</button>
    </div>
  </header>
  <main class="page"> … </main>
</div>
```

### `.shell.shell-centered` — auth, onboarding, single-focus flows

```html
<div class="shell shell-centered">
  <div class="center-col"> … </div>          <!-- 420px column -->
  <div class="center-col center-col-wide"> … </div>  <!-- 720px variant -->
</div>
```

---

## Page scaffolding

- `.page` — main content column (padding + max width). Direct child of the shell.
- `.page-header` — title row: heading + `.page-actions` on the right.
- `.page-title`, `.page-desc` — the h1 and its one-line description.
- `.section`, `.section-header`, `.section-title` — a titled group of content.

```html
<main class="page">
  <header class="page-header">
    <div>
      <h1 class="page-title">Customers</h1>
      <p class="page-desc">Everyone who has an active subscription.</p>
    </div>
    <div class="page-actions">
      <button class="btn btn-outline">Export</button>
      <button class="btn btn-primary">Add customer</button>
    </div>
  </header>
  <section class="section">
    <div class="section-header">
      <h2 class="section-title">Recent activity</h2>
      <button class="btn btn-ghost btn-sm">View all</button>
    </div>
    …
  </section>
</main>
```

---

## Layout

- `.stack` — vertical flex, medium gap. `.stack-sm` / `.stack-lg` adjust the gap.
- `.row` — horizontal flex, centered, small gap. `.row-wrap` allows wrapping.
- `.spread` — horizontal, space-between (label left, value/action right).
- `.grid-2` / `.grid-3` / `.grid-4` — equal-column grids (collapse on small widths).
- `.split` — 200px sub-nav + fluid main (settings pages).
- `.grow` — flex child that takes remaining space. `.center` — centers content.
- `.span-2` — grid child spanning 2 columns (inside `.grid-2/3/4`).
- `.separator` — 1px horizontal rule (`<hr class="separator">`).

---

## Buttons

`.btn` + one variant. Sizes: `.btn-sm`, `.btn-lg`. Modifiers: `.btn-icon` (square), `.btn-block`
(full width).

```html
<button class="btn btn-primary">Save changes</button>
<button class="btn btn-outline">Cancel</button>
<button class="btn btn-ghost">Learn more</button>
<button class="btn btn-destructive">Delete project</button>
<button class="btn btn-outline btn-sm">Filter</button>
<button class="btn btn-primary btn-lg btn-block">Continue</button>
```

One `.btn-primary` per view region — everything else is outline/ghost.

---

## Card

```html
<div class="card">
  <div class="card-header">
    <div>
      <p class="card-title">Payment method</p>
      <p class="card-desc">Charged on the 1st of every month.</p>
    </div>
    <button class="btn btn-outline btn-sm">Edit</button>
  </div>
  … content …
  <div class="card-footer">
    <button class="btn btn-ghost">Cancel</button>
    <button class="btn btn-primary">Save</button>
  </div>
</div>
```

`.card-flush` removes padding (use when a `.table` or `.list` fills the card edge-to-edge —
put the padding back on inner rows).

## Stat block (inside a card, usually in `.grid-3`/`.grid-4`)

```html
<div class="card">
  <p class="stat-label">Monthly revenue</p>
  <p class="stat">$48,210</p>
  <p class="stat-delta up">▲ 12.4% vs last month</p>   <!-- .down for negative -->
</div>
```

---

## Table

Always wrap in `.table-wrap`. Use `.num` on right-aligned numeric cells.

```html
<div class="table-wrap">
  <table class="table">
    <thead>
      <tr><th>Customer</th><th>Status</th><th class="num">MRR</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="row">
            <span class="avatar avatar-sm">AC</span>
            <div><p class="font-medium">Acme Corp</p><p class="text-xs text-muted">acme.com</p></div>
          </div>
        </td>
        <td><span class="badge badge-success"><span class="dot"></span>Active</span></td>
        <td class="num">$1,240</td>
      </tr>
    </tbody>
  </table>
</div>
```

## List

```html
<ul class="list">
  <li class="list-item">
    <span class="avatar">MK</span>
    <div class="list-item-body">
      <p class="list-item-title">Mira Kapoor commented</p>
      <p class="list-item-desc">"Looks good — shipping it today."</p>
    </div>
    <span class="list-item-meta">2h ago</span>
  </li>
</ul>
```

---

## Forms

```html
<div class="field">
  <label class="label">Workspace name</label>
  <input class="input" placeholder="Acme Inc." />
  <p class="hint">Shown on invoices and emails.</p>
</div>

<div class="field">
  <label class="label">Country</label>
  <select class="select"><option>United States</option></select>
</div>

<div class="field">
  <label class="label">Bio</label>
  <textarea class="textarea" placeholder="A short description…"></textarea>
</div>

<label class="check-row"><input type="checkbox" class="checkbox" checked /> Email me weekly reports</label>

<div class="spread">
  <div>
    <p class="font-medium">Usage alerts</p>
    <p class="text-sm text-muted">Notify me at 80% of plan limits.</p>
  </div>
  <span class="switch on"></span>   <!-- omit .on for off -->
</div>
```

Group fields with `.stack`; put two side-by-side with `.grid-2`.

---

## Tabs

```html
<div class="tabs">
  <button class="tab active">Overview</button>
  <button class="tab">Analytics</button>
  <button class="tab">Reports</button>
</div>

<!-- underline variant, for page-level sections -->
<div class="tabs tabs-line">
  <button class="tab active">General</button>
  <button class="tab">Members</button>
  <button class="tab">Billing</button>
</div>
```

## Badge

```html
<span class="badge">Default</span>
<span class="badge badge-outline">Draft</span>
<span class="badge badge-primary">New</span>
<span class="badge badge-success"><span class="dot"></span>Active</span>
<span class="badge badge-warning"><span class="dot"></span>Past due</span>
<span class="badge badge-destructive"><span class="dot"></span>Failed</span>
```

## Alert

```html
<div class="alert alert-warning">
  <div>
    <p class="alert-title">Trial ends in 3 days</p>
    <p class="alert-desc">Add a payment method to keep your workspace active.</p>
  </div>
</div>
```

Variants: `.alert` (neutral), `.alert-success`, `.alert-warning`, `.alert-destructive`.

## Avatar

```html
<span class="avatar">JD</span>
<span class="avatar avatar-sm">JD</span>
<span class="avatar avatar-lg">JD</span>
<div class="avatar-group">
  <span class="avatar avatar-sm">A</span><span class="avatar avatar-sm">B</span><span class="avatar avatar-sm">+3</span>
</div>
```

Use 1–2 letter initials. No external image URLs.

## Empty state

```html
<div class="empty-state">
  <div class="empty-state-icon">◇</div>
  <p class="empty-state-title">No invoices yet</p>
  <p class="empty-state-desc">When you send your first invoice it will show up here.</p>
  <button class="btn btn-primary">Create invoice</button>
</div>
```

## Modal / drawer (static — shown open, wireframe-style)

The overlay is positioned against the shell, so these go **inside** `.shell` as its last child.

```html
<div class="modal-overlay">
  <div class="modal stack">
    <div>
      <h3>Delete customer?</h3>
      <p class="text-sm text-muted">This removes Acme Corp and all their invoices.</p>
    </div>
    <div class="card-footer">
      <button class="btn btn-ghost">Cancel</button>
      <button class="btn btn-destructive">Delete</button>
    </div>
  </div>
</div>

<div class="drawer stack"> … side panel content … </div>
```

## Progress

```html
<div class="progress"><div class="progress-bar w-60"></div></div>
```

## Charts (placeholders — the only place `.h-*` / `.w-*` are allowed)

Bar chart — heights in 10% steps (`.h-10` … `.h-100`), `.muted` for de-emphasized bars:

```html
<div class="chart">
  <div class="chart-bars">
    <div class="bar h-40"></div><div class="bar h-60"></div><div class="bar h-30"></div>
    <div class="bar h-80"></div><div class="bar h-100"></div><div class="bar muted h-50"></div>
  </div>
  <div class="chart-labels"><span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span></div>
</div>
```

Line/area chart — inline SVG with `viewBox="0 0 100 40"` and `preserveAspectRatio="none"`:

```html
<svg class="chart-line" viewBox="0 0 100 40" preserveAspectRatio="none">
  <path class="area" d="M0,32 L15,26 L30,29 L45,18 L60,22 L75,12 L100,8 L100,40 L0,40 Z"></path>
  <polyline class="line" points="0,32 15,26 30,29 45,18 60,22 75,12 100,8"></polyline>
</svg>
<div class="chart-labels"><span>Jan</span><span>Mar</span><span>May</span></div>
```

Legend:

```html
<div class="legend">
  <span><span class="swatch"></span>This year</span>
  <span><span class="swatch muted"></span>Last year</span>
</div>
```

`.chart-sm` on `.chart-bars` makes a 72px sparkline-height chart for inside stat cards.

## Misc

- `.kbd` — keyboard key: `<span class="kbd">⌘K</span>`
- `.icon-box` / `.icon-box-primary` — square icon container for feature/list leading icons
  (put a single character or small inline SVG inside).
- Text helpers: `.text-muted`, `.text-sm`, `.text-xs`, `.font-mono`, `.font-medium`,
  `.font-semibold`.

---

## Hard rules

1. Start every screen with one shell; exactly one `.page` inside it (except `.shell-centered`).
2. Only classes from this catalog. Unknown classes are logged as violations.
3. No `<script>`, no event handlers, no `style=`, no `<style>`, no external images or fonts.
4. Icons: use simple characters (◇ ● ▲ ✓ →) or small inline SVGs — never icon-font classes.
5. Interactive states (open modal, active tab, filled form) are shown statically.
