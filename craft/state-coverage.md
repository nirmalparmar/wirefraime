# State coverage craft rules

What every interactive surface must render. The design system decides how
each state *looks*; this file decides which states must *exist*. Shipping
only the populated state is the single most reliable AI-UI failure.

## The five required states

Every surface that fetches, transforms, or accepts data renders all five.

| State | When | Must contain |
|---|---|---|
| **Loading** | Data in flight | Skeleton / spinner shell + a "taking longer than expected" fallback after ~15s |
| **Empty** | No records yet, or a query found nothing | Headline + plain explanation + primary CTA |
| **Error** | Fetch/validation failed | Plain-language cause + recovery action + preserved input |
| **Populated** | Data present | The state the design was actually drawn for |
| **Edge** | Huge volume, long strings, missing optional fields | A layout that doesn't break |

Render-and-screenshot test: every list, table, card, form, and panel has
all five.

## Empty is its own state with a job

- **First-use** — illustration/icon + headline + value sentence + primary
  CTA. This is the onboarding moment, not a blank.
- **No-results** — echo the query, suggest alternatives. Never a bare "No
  data".
- **Cleared** — celebratory, with an optional next action.
- Never collapse **error** into empty — an error carries recovery info.

## Error states answer three questions, in order

1. **What happened** — "Your card was declined", not "Something went wrong".
2. **Why, if knowable** — "Insufficient funds".
3. **What to do** — a retry, an alternative path, or support.

Preserve user input across the error; never clear a form on submit failure.
Match severity to scope: a field error gets an inline message
(`text-error` border + message), not a page-level takeover.

## Form states

On top of the five: **untouched** (default, no validation yet), **dirty-
valid** (helper text, no success-coloring), **submitted-pending** (button
in loading state, fields locked). Validate **on blur**, not first
keystroke; clear the error the instant input becomes valid.

## Loading thresholds (pick by expected duration)

| Duration | Indicator |
|---|---|
| 0–300ms | none — render synchronously |
| 300ms–2s | subtle spinner or skeleton |
| 2–10s | skeleton matched to layout, or a labelled spinner ("Loading payments…") |
| 10–60s | determinate progress bar + cancel |
| 60s+ | stop; show error with retry/cancel |

Never leave a spinner running forever — every request gets a timeout.

## ARIA & focus on state change

- Inline submit error → `role="alert"` on the message; move focus to the
  first error field.
- Toast / confirmation → `role="status"` (polite); do not move focus.
- Critical/destructive → `role="alertdialog"`; move focus to the dialog.
- Color is never the only error signal — pair with an icon + text label.

## Common mistakes (reviewed)

- Only the populated state exists.
- Empty state is a literal blank or "No data".
- "Something went wrong" with no cause or recovery.
- Spinner with no timeout.
- Form clears on validation failure.
- Inline validation fires on first keystroke.
- Full-page loading when only one section is fetching.
