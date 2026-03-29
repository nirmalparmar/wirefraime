# Wirefraime Roadmap

## Completed

- [x] **Fast Apply** — Surgical search/replace edits instead of full HTML regeneration, with automatic fallback
- [x] **Screen Thumbnails** — Clickable screen strip in chat sidebar for quick navigation
- [x] **Code View Toggle** — `</>` button to view/copy raw HTML with syntax highlighting
- [x] **Multi-Screen Editing** — "Change colors across all screens" applies to every screen
- [x] **Export as Next.js** — Export as a working Next.js project with Tailwind, design system, and routing
- [x] **Streaming Typewriter** — Assistant text streams character-by-character with blinking cursor
- [x] **Visible Agent Steps** — Each edit operation shows as a real-time thinking step

## Parked — Quick Wins

### Prompt Suggestions
After each AI response, show 2-3 clickable follow-up suggestions ("Make it darker", "Add a footer", "Change the font"). Drives engagement and teaches users what's possible.

**Implementation:** After `screen_done` event, have the AI return 2-3 suggested follow-ups. Display as pill buttons below the assistant message. Clicking one auto-sends it as the next message.

### Keyboard Shortcuts
- `Cmd+1/2/3...` to switch screens
- `Cmd+E` to focus chat input
- `Cmd+Shift+C` to toggle code view
- `Esc` to deselect element / close panels

**Implementation:** Add a `useEffect` keydown listener in WorkspaceShell. Map shortcuts to dispatch actions.

## Parked — Medium Effort

### Version History per Screen
Sidebar showing previous versions of a screen with timestamps. Click to preview, click to restore. Already have undo/redo stack — need persistent history UI.

**Implementation:** Store a `versions: { html: string; timestamp: number }[]` array per screen. Add a "History" button in toolbar that opens a panel with version thumbnails. Use the existing undo infrastructure.

### Component Extraction
Select an element on the canvas, click "Extract Component", and it becomes reusable across screens. Key differentiator from competitors.

**Implementation:**
1. Add "Extract" button to PropertyPanel when an element is selected
2. Save extracted HTML + a name to a `components[]` array in the app state
3. Show a component library panel in the sidebar
4. When inserting, paste the HTML into the target screen
5. Future: sync changes across all instances

### Live CSS Editing (DevTools-like)
Click any element, see computed styles in PropertyPanel, and changes apply instantly via iframe postMessage. Make it feel like Chrome DevTools.

**Implementation:** Already partially built (PropertyPanel + editor bridge). Needs:
- More CSS properties exposed (flexbox, grid, position)
- Computed → authored style mapping
- Real-time preview as sliders/inputs change
- "Apply to code" button to persist changes

## Parked — Bigger Bets

### Multi-Model Routing
Use different AI models for different tasks:
- Claude for planning/editing (better at code understanding)
- Gemini for design system generation (creative)
- Fast model (Gemini Flash / GPT-4o-mini) for tool repair

**Implementation:** Add an OpenRouter integration or direct multi-provider setup. Route based on task type in design-agent.ts. Add model selection in settings.

### Supabase Backend
Replace localStorage with real persistence:
- User auth (email, GitHub, Google)
- App storage in Postgres
- Share links with real URLs
- Collaboration (multiple users editing)
- App gallery / templates

**Implementation:** Major infrastructure change. Add `@supabase/supabase-js`, Drizzle ORM, auth middleware. Migrate all `lib/store.ts` functions to Supabase queries.

### Vercel AI SDK Integration
Replace custom SSE streaming with `ai` package's `streamText()`:
- Native streaming with backpressure
- Tool calling support
- Multi-provider compatibility
- Less boilerplate

**Implementation:** `npm install ai @ai-sdk/google`. Refactor `design-agent.ts` to use `streamText()` instead of custom `ReadableStream`. Update API routes to return `StreamingTextResponse`.

## Inspiration
- [Onlook](https://github.com/onlook-dev/onlook) — Tool-calling agent (21 tools), Morph/Relace fast-apply, CodeSandbox live preview, MobX state
- [v0.dev](https://v0.dev) — Streaming UX, plain text chat, "Worked for Xs" blocks, minimal UI
- [Cursor](https://cursor.com) — Multi-file editing, diff view, agent steps visibility
