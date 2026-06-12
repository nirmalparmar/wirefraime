# Wirefraime → "World's Best Design & Landing Page Generation Platform"

**Status:** PLAN ONLY — no code written yet. Review and edit this doc before implementation.
**Goal:** Be best-in-class at **both** expressive landing/marketing pages **and** multi-screen app UIs.
**Reference architecture:** `../open-design` (3-axis: Shape × Brand × Craft, composed into the prompt at runtime).

---

## 1. The core idea we're adopting

Open Design's quality comes from one structural decision: **decouple three independent axes and compose them into the model's system prompt per request.**

| Axis | Question it answers | Open Design | Wirefraime today |
|---|---|---|---|
| **Shape** (skills) | *What artifact am I building?* | `skills/saas-landing`, `dashboard` … (declarative) | one screen-oriented path, hardcoded |
| **Brand** (design systems) | *What does this brand look like?* | 152 portable `DESIGN.md` packages the user picks | one thin DS object generated per app |
| **Craft** (universal rules) | *What does a great designer always do?* | 12 injectable `craft/*.md` + an **anti-slop linter** | partial anti-slop baked into prompts + `hallmark` skill |

We will **not** copy Open Design wholesale (it spawns external CLI agents, writes files to disk, is local-first). Wirefraime is a Next.js SaaS (Clerk + Postgres + S3 + Gemini via Google ADK) with a canvas/iframe editor. We adopt the *architecture*, not the runtime.

## 2. What wirefraime already does well — KEEP these

- **Deterministic editor bridge** (`lib/editor-bridge.ts`): `APPLY_EDIT` maps property→Tailwind class with no LLM, `UPDATE_CSS_VARS` does live token editing, XPath targeting, clean serialization. This is genuinely good — Open Design's manual-edit path is conceptually the same. Keep it; extend in Phase 4.
- **Shared-shell enforcement** (`lib/design-template.ts` `enforceSharedShell`): deterministic verbatim nav across screens. Keep for app-UI mode.
- **Tailwind-first semantic tokens** (`generateTailwindConfig` / `generateBaseCSS`): the "every style is an editable class" philosophy. Keep — it's the bridge's foundation.
- **Critique pass + `validateAndRepairHtml`** in `design-agent.ts`. Keep; make critique craft-aware in Phase 5.
- **ADK skill infra** (`loadSkillFromDir`, `SkillToolset`, reference loading). Keep; generalize in Phase 3.
- **Streaming SSE + live iframe rendering**. Keep.

## 3. The real gaps (what this plan closes)

1. **No reusable brand catalog.** Users can't say "make it look like Linear/Stripe/editorial." Every app reinvents a thin DS. → *Phase 2.*
2. **Thin DS schema** (9 colors + 2 fonts + layout + nav + 3 components) vs a 9-section brand contract with a real component reference, motion, voice, and anti-patterns. → *Phase 2.*
3. **No composable craft layer** — typography letter-spacing laws, color discipline, state coverage, accessibility, motion — and **no output linter** to enforce them. This is the single biggest quality lever. → *Phase 1.*
4. **One generation strategy** for two very different artifacts. Landing pages are long-scroll, expressive, single-file, hero-first; app UIs are dense, stateful, multi-screen, shell-consistent. The current shared-shell + viewport-locked pipeline constrains landing pages. → *Phase 3.*
5. **Generative edits regenerate the whole screen** instead of surgically editing the selected element/section. → *Phase 4.*

---

## Target architecture (after all phases)

```
lib/
  design/
    types.ts              # DesignSystemPackage, ArtifactType, CraftRef, ComposeInput
    design-systems.ts     # listPackages(), loadPackage(slug), resolveAssets()
    craft.ts              # loadCraftSections(requires[])
    compose-prompt.ts     # composeSystemPrompt(ComposeInput) → string
    lint-artifact.ts      # lintHtml(html, ds) → Finding[]   (the anti-slop linter)
  agents/
    design-agent.ts       # orchestrator: routes by ArtifactType
    app-ui-agent.ts       # multi-screen + shared shell (today's pipeline, extracted)
    landing-agent.ts      # NEW section-based long-scroll pipeline
    skills.ts             # listSkills(), getSkill(type)  (generalizes ADK loader)

design-systems/           # NEW catalog (committed assets, seeded from open-design MIT)
  _schema/manifest.schema.ts
  apple/  linear/  stripe/  notion/  editorial/  brutalist/  playful/ …
    manifest.json  DESIGN.md  tokens.css  components.html

craft/                    # NEW (ported from open-design)
  anti-ai-slop.md  typography.md  color.md  state-coverage.md
  accessibility-baseline.md  animation-discipline.md  laws-of-ux.md  copy-honesty.md

skills/                   # NEW artifact-shape skills (od:-style frontmatter)
  landing-page/SKILL.md
  app-ui/SKILL.md
```

`composeSystemPrompt` assembles, in order:
> base rules → active design system USAGE → **DESIGN.md (selected sections)** → **tokens.css (verbatim)** → components.html reference → **craft refs (only those the skill declares)** → skill body → artifact-type generation rules.

---

## Phase 0 — Schema & contracts (no behavior change)

**Goal:** Define the new types so later phases plug in cleanly. Nothing user-visible changes.

**Files:**
- `lib/types.ts` — add (keep existing `DesignSystem` for back-compat during migration):
  - `type ArtifactType = "landing-page" | "app-ui"` (extensible: `"dashboard" | "pricing-page"` later).
  - `interface DesignSystemPackage { id; name; category; description; designMd; tokensCss; componentsHtml?; craftApplies: string[]; craftExemptions: string[] }`.
  - Extend `WireframeApp` with `artifactType: ArtifactType` and `designSystemId: string | null` (null = AI-generated custom).
- `lib/design/types.ts` (new) — `CraftRef` union (the allowed craft slugs), `ComposeInput`.
- `lib/design/design-systems.ts` (new, stub) — function signatures only.
- DB: add nullable `artifactType` and `designSystemId` columns to `projects` (`lib/db/schema.ts` + a Drizzle migration). Default `app-ui`, `null` for existing rows.

**Acceptance:** types compile; existing generation path untouched (reads `designSystemId == null` → custom path).

---

## Phase 1 — Craft layer + anti-slop linter  ⭐ highest ROI, lowest risk

**Goal:** Reliably stop AI-slop output. Visible quality jump within the existing pipeline, no UI change.

**Files to CREATE:**
- `craft/anti-ai-slop.md`, `craft/typography.md`, `craft/color.md`, `craft/state-coverage.md`, `craft/accessibility-baseline.md`, `craft/animation-discipline.md`, `craft/laws-of-ux.md`, `craft/copy-honesty.md` — ported/adapted from `../open-design/craft/` (brand-agnostic rulebooks; keep them dense).
- `lib/design/craft.ts` — `loadCraftSections(requires: CraftRef[]): string` (reads files, joins with `### <slug>` headers; missing files dropped silently — forward-compatible, matches Open Design).
- `lib/design/lint-artifact.ts` — `lintHtml(html, ds): Finding[]` checking the **7 cardinal sins** (regex-based, no LLM):
  1. default Tailwind indigo as accent (`#6366f1`/`#4f46e5`) when not the brand color
  2. purple→blue "trust" gradient
  3. emoji as feature icons (we already mandate Iconoir — make it enforced)
  4. invented metrics ("10× faster", "99.9% uptime") in marketing copy
  5. filler copy (lorem ipsum, "Feature one/two/three")
  6. rounded-card + colored-left-border "AI tile"
  7. hardcoded `bg-white/black/gray-*/blue-*` instead of semantic tokens (you already forbid this in `TAILWIND_COMPONENT_GUIDE` — now *detect* it)

**Files to MODIFY:**
- `lib/agents/design-agent.ts`:
  - Inject `loadCraftSections([...])` output into the screen-gen system instructions (next to `TAILWIND_COMPONENT_GUIDE`).
  - After generation, run `lintHtml`; if findings exist, feed them into the **existing critique pass** as a targeted "fix these specific violations" re-prompt (cheaper and more reliable than the open-ended critique).
- `app/api/generate/route.ts`: optionally emit a `lint` SSE event with finding counts (for a future quality badge); non-blocking.

**Acceptance:** generate 5 landing pages + 5 dashboards before/after; cardinal-sin findings drop to ~0; outputs visibly less generic. No regressions in the canvas/editor.

---

## Phase 2 — Rich design-system packages + brand catalog (Brand axis)

**Goal:** Let users pick a brand look ("Linear", "Editorial", "Brutalist", or "Custom AI") and get a real brand contract → far higher fidelity and cross-screen consistency.

**Files to CREATE:**
- `design-systems/_schema/manifest.schema.ts` — Zod/TS schema for `manifest.json` (id, name, category, files{}, craft.applies/exemptions).
- `design-systems/<slug>/` for ~12–16 seed brands (reuse Open Design's MIT-licensed packages; pick a *spread*: `apple`, `linear`, `stripe`, `notion`, `vercel`, `editorial/warm-editorial`, `brutalist`, `playful`, `claude`, `cal`, `framer`, plus 2–3 expressive originals). Each contains `manifest.json` + `DESIGN.md` (9-section) + `tokens.css` + `components.html`.
- `lib/design/design-systems.ts` — `listPackages()`, `loadPackage(slug)`, `resolveAssets(slug)` (reads the three files; cache in memory). Packages are bundled repo assets (read at build/runtime), **not** DB rows — keeps them versioned and free.

**Files to MODIFY:**
- `lib/design-template.ts` — add a path that consumes a package's `tokens.css` **verbatim** into the iframe `<head>` (instead of synthesizing CSS vars from the thin object). Map package tokens → the same Tailwind semantic utilities the bridge already edits (`bg-primary`, `rounded-card`, …) so editing keeps working unchanged.
- `lib/agents/design-agent.ts` — when `designSystemId != null`, skip `generateDesignSystem`'s color/font invention; instead load the package, inject `DESIGN.md` + `tokens.css` + `components.html` as the brand contract. Use `components.html` as the consistency reference (replaces regex `extractMultiScreenPatterns` for branded apps — it's a real reference, not a snapshot).
- `components/workspace/DesignSystemDialog.tsx` — add a brand picker (grid of package previews) with "Custom (AI-generated)" as one tile. Persist `designSystemId` on the project.
- `app/api/generate/route.ts` + `lib/db/schema.ts` — accept & persist `designSystemId`.

**Keep:** the "Custom AI" path. In Phase 5 we upgrade it to emit a full package-shaped DS so custom apps also get a real brand contract.

**Acceptance:** pick "Linear" → generated screens use Linear's tokens/components and read as Linear; switch brand on an existing app and regenerate cleanly; custom path still works.

---

## Phase 3 — Prompt composition + artifact-type skills (Shape axis — unlocks "best at BOTH")

**Goal:** Two first-class generation strategies behind one composer. This is what makes landing pages *and* app UIs both excellent instead of one compromised path.

**Files to CREATE:**
- `skills/landing-page/SKILL.md` and `skills/app-ui/SKILL.md` — each with `od:`-style frontmatter declaring `craft.requires` and `design_system.sections`:
  - `landing-page`: `craft.requires: [typography, color, anti-ai-slop, copy-honesty, laws-of-ux]`, sections `[visual-theme, color, typography, layout, components, voice]`. Body = expressive, long-scroll, hero-first, conversion-aware rules.
  - `app-ui`: `craft.requires: [typography, color, anti-ai-slop, state-coverage, accessibility-baseline]`, sections `[color, typography, layout, components, motion]`. Body = dense, stateful, multi-screen consistency rules.
- `lib/design/compose-prompt.ts` — `composeSystemPrompt(ComposeInput)` assembling the ordered blocks (see Target architecture). Single source of truth for prompts; replaces ad-hoc string building.
- `lib/agents/landing-agent.ts` — **section-based** pipeline: plan sections (hero, social proof, features, pricing, FAQ, CTA, footer) → generate section-by-section into ONE document → no forced nav shell → editorial typography craft → stream per section for live preview.
- `lib/agents/skills.ts` — `getSkill(artifactType)` generalizing the current hardcoded `hallmark` loader.

**Files to MODIFY:**
- `lib/agents/design-agent.ts` — becomes a thin **router**: classify/accept `artifactType`, then dispatch to `app-ui-agent` (extracted from today's `generateScreenHtml` loop) or `landing-agent`. All prompts go through `composeSystemPrompt`.
- `lib/agents/app-ui-agent.ts` (new, extracted) — today's multi-screen + `enforceSharedShell` logic, unchanged behavior.
- `app/api/generate/route.ts` — accept `artifactType`; if absent, infer in `generateDesignSystem`'s planner ("landing page"/"pricing page" → landing-page; "CRM"/"dashboard"/"app" → app-ui). The planner already detects single-vs-multi screen — extend it to emit `artifactType`.
- Entry UI (`app/dashboard/page.tsx` create modal) — optional explicit "Landing page / App" toggle (default: auto-detect).

**Acceptance:** "a landing page for X" → one long expressive scroll page, no app sidebar, editorial type; "a CRM" → multi-screen app with consistent shell. Both go through the composer; craft + brand inject correctly for each.

---

## Phase 4 — Scope-locked generative editing

**Goal:** Chat edits modify only the targeted element/section instead of regenerating the whole screen — faster, cheaper, no collateral drift.

**Files to MODIFY:**
- `lib/editor-bridge.ts` — add a `GET_OUTER_HTML` message (and include `outerHTML` + a stable `data-wf-name`/XPath in the existing `describe()` payload) so the host can pass the exact element markup to the model.
- `lib/agents/design-agent.ts` `streamChatEdit` — when `selectedElement` is present, switch from full-screen regen to a **scope-locked section edit**: prompt carries the element's `outerHTML` (htmlHint) + a hard scope-lock (mirroring Open Design `server.ts:912`): *"Return ONLY a replacement for this element. Do NOT modify the nav, design tokens, sibling sections, or global CSS."* Then splice the returned fragment back into the screen HTML by XPath (deterministic), preserving everything else.
- `components/workspace/ChatPanel.tsx` / `PropertyPanel.tsx` — surface "editing this section" affordance using the selection already captured.

**Lower priority (optional):** port Open Design's `ManualEditPatch` tagged-union applied against saved source. Wirefraime's live-DOM bridge already covers most manual edits, so this is a nice-to-have, not required.

**Acceptance:** select a hero headline, ask "make this bolder and punchier" → only that section changes; nav/tokens/other sections byte-identical; latency and cost drop vs full regen.

---

## Phase 5 — Craft-aware critique + custom-DS generator v2

**Goal:** Close the loop on quality and make the "Custom AI" brand path produce a real, reusable package.

**Files to MODIFY:**
- `lib/agents/design-agent.ts` critique pass — make it check against the **injected craft rules + lint findings** (not open-ended "make it nicer"). Single structured "violations → fixes" pass.
- `generateDesignSystem` — when `designSystemId == null`, emit a full **package-shaped** DS (9-section `DESIGN.md` prose + `tokens.css` + a small `components.html`) instead of the thin object. Optionally offer "save this as a reusable brand" → write into the user's catalog (DB-backed user packages alongside bundled ones).

**Optional — creative-director routing:** a lightweight clarify step (Open Design's `creative-director` orchestration) that, when the brief is ambiguous, asks the user for audience/tone/references before generating, with a recommended default. Improves first-shot quality the most for vague prompts.

**Acceptance:** critique reliably fixes craft violations; custom-DS apps are as consistent as branded ones; users can reuse a generated brand.

---

## Cross-cutting concerns

- **Token budget:** inject only the craft refs a skill declares and only the DESIGN.md sections it needs (Open Design's key efficiency trick). Use `components.manifest.json`-style compact summaries when full `components.html` is too big.
- **Caching:** cache `resolveAssets(slug)` and `loadCraftSections` in module scope (cold start only).
- **Back-compat:** existing projects have `designSystemId == null`, `artifactType == "app-ui"` → behave exactly as today. No data migration of generated HTML.
- **Licensing:** Open Design's design-systems are MIT-sourced inspirations (not official brand assets) — safe to seed, attribute in `design-systems/README.md`.
- **Don't break the bridge:** every new tokens/CSS path must keep emitting the same Tailwind semantic utilities (`bg-primary`, `rounded-card`, `text-foreground`) the editor edits, or click-to-edit breaks.

## Suggested order & sizing

| Phase | Leverage | Risk | Rough size |
|---|---|---|---|
| 1 — Craft + linter | ★★★★★ | low | 2–4 days |
| 2 — Brand packages | ★★★★☆ | medium | 4–6 days |
| 3 — Composer + landing/app split | ★★★★★ | medium-high | 5–8 days |
| 4 — Scope-locked edits | ★★★☆☆ | medium | 3–4 days |
| 5 — Critique v2 + custom-DS v2 | ★★★☆☆ | low-medium | 3–5 days |

**Recommended sequence:** 1 → 2 → 3 → 5 → 4. (Phase 1 ships visible quality immediately and is reusable by every later phase; Phase 3 depends on 1 & 2; editing polish (4) can come last.)

## Open decisions for review

1. **Brand catalog size:** start with ~12–16 seeds, or go broad (50+) immediately? (Recommend: 12–16 curated for a spread of looks.)
2. **Artifact type:** auto-detect from the prompt only, or also expose an explicit Landing/App toggle in the create modal? (Recommend: auto-detect + override toggle.)
3. **User-saved brands** (Phase 5): in scope now, or later? (Recommend: later.)
4. **Where craft/design-systems live:** committed repo assets (versioned, free) vs DB. (Recommend: committed assets; DB only for user-saved brands.)
