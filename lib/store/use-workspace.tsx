"use client";

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from "react";
import type { WireframeApp, Message, DesignSystem, Screen, Platform, AgentStep } from "../types";

/* --- Selected element from iframe --- */

export interface SelectedElement {
  /** Durable element id (data-wf-id) — survives reloads and AI edits. */
  wfId?: string;
  xpath: string;
  tagName: string;
  className?: string;
  textContent: string;
  styles: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    fontFamily: string;
    padding: string;
    paddingTop: string;
    paddingRight: string;
    paddingBottom: string;
    paddingLeft: string;
    margin: string;
    marginTop: string;
    marginRight: string;
    marginBottom: string;
    marginLeft: string;
    borderRadius: string;
    borderWidth: string;
    borderColor: string;
    borderStyle: string;
    width: string;
    height: string;
    opacity: string;
    textAlign: string;
    lineHeight: string;
    letterSpacing: string;
    textDecoration: string;
    display: string;
    flexDirection: string;
    alignItems: string;
    justifyContent: string;
    gap: string;
    boxShadow: string;
  };
}

/* --- State --- */

export interface WorkspaceState {
  app: WireframeApp;
  activeScreenId: string | null;
  selectedElement: SelectedElement | null;
  isGenerating: boolean;
  genStep: string;
  isSending: boolean;
  undoStack: { screenId: string; html: string }[];
  redoStack: { screenId: string; html: string }[];
  /** Coalesces consecutive style edits (e.g. slider drags) into one undo entry.
   *  Cleared when the user picks a different control or after a short idle. */
  lastEditKey: string | null;
  lastEditAt: number;
}

/* --- Actions --- */

export type WorkspaceAction =
  | { type: "SET_APP"; app: WireframeApp }
  | { type: "ADD_SCREEN"; screen: Screen }
  | {
      type: "UPDATE_SCREEN_HTML";
      screenId: string;
      html: string;
      pushUndo?: boolean;
      /** If set, consecutive edits with the same key coalesce into one undo entry. */
      editKey?: string;
    }
  | { type: "FLUSH_EDIT_KEY" }
  | { type: "SET_SCREEN_STREAMING"; screenId: string; isStreaming: boolean }
  | { type: "SET_ACTIVE_SCREEN"; id: string }
  | { type: "SET_DESIGN_SYSTEM"; designSystem: DesignSystem; platform?: Platform }
  | { type: "SELECT_ELEMENT"; element: SelectedElement | null }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "UPDATE_MESSAGE"; id: string; content: string }
  | { type: "SET_GENERATING"; isGenerating: boolean; genStep?: string }
  | { type: "SET_GEN_STEP"; genStep: string }
  | { type: "SET_SENDING"; isSending: boolean }
  | { type: "UPDATE_DS_COLOR"; key: string; value: string }
  | { type: "UPDATE_DS_FONT"; key: string; value: string }
  | { type: "UPDATE_PLATFORM"; platform: Platform }
  | { type: "CLEAR_FOR_REGEN" }
  | { type: "SYNC_DS_TO_SCREENS" }
  | { type: "ADD_AGENT_STEP"; messageId: string; step: AgentStep }
  | { type: "UPDATE_AGENT_STEP"; messageId: string; stepId: string; updates: Partial<AgentStep> }
  | { type: "UNDO" }
  | { type: "REDO" };

const MAX_UNDO = 30;
/** Window in which consecutive edits with the same key collapse into a single undo entry. */
const EDIT_COALESCE_MS = 1500;

/* --- Design system → HTML sync --- */

function applyDsToHtml(html: string, ds: DesignSystem): string {
  if (!html || !ds) return html;

  const overrideVars = [
    `--color-primary:${ds.colors.primary}`,
    `--color-secondary:${ds.colors.secondary}`,
    `--color-background:${ds.colors.background}`,
    `--color-surface:${ds.colors.surface}`,
    `--color-text:${ds.colors.text}`,
    `--color-text-muted:${ds.colors.textMuted}`,
    `--color-border:${ds.colors.border}`,
    `--color-success:${ds.colors.success}`,
    `--color-error:${ds.colors.error}`,
  ].join(";");

  const fontName = ds.fonts.primary.split(",")[0].trim();
  const encodedFont = encodeURIComponent(fontName);
  const fontsLink = `<link id="ds-fonts" href="https://fonts.googleapis.com/css2?family=${encodedFont}:wght@300;400;500;600;700&display=swap" rel="stylesheet">`;
  const overrideStyle = `<style id="ds-override">:root{${overrideVars}}body{font-family:${ds.fonts.primary} !important;}</style>`;

  // Remove previous overrides
  let result = html.replace(/<style id="ds-override">[\s\S]*?<\/style>/g, "");
  result = result.replace(/<link[^>]*id="ds-fonts"[^>]*>/g, "");

  // Inject before </head>
  if (result.includes("</head>")) {
    result = result.replace("</head>", `${fontsLink}${overrideStyle}</head>`);
  }

  return result;
}

/* --- Reducer --- */

function reducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "SET_APP":
      return { ...state, app: action.app };

    case "ADD_SCREEN": {
      const screens = [...state.app.screens, action.screen];
      return {
        ...state,
        app: { ...state.app, screens, updatedAt: Date.now() },
        activeScreenId: state.activeScreenId ?? action.screen.id,
      };
    }

    case "UPDATE_SCREEN_HTML": {
      const idx = state.app.screens.findIndex((s) => s.id === action.screenId);
      if (idx < 0) return state;

      let undoStack = state.undoStack;
      let redoStack = state.redoStack;
      let lastEditKey = state.lastEditKey;
      let lastEditAt = state.lastEditAt;

      if (action.pushUndo) {
        const now = Date.now();
        const sameKey =
          action.editKey != null &&
          action.editKey === state.lastEditKey &&
          now - state.lastEditAt < EDIT_COALESCE_MS;

        if (!sameKey) {
          // New edit "transaction" — snapshot the current HTML
          const prev = state.app.screens[idx];
          undoStack = [...undoStack, { screenId: action.screenId, html: prev.html }].slice(-MAX_UNDO);
          redoStack = [];
        }
        lastEditKey = action.editKey ?? null;
        lastEditAt = now;
      }

      const screens = [...state.app.screens];
      screens[idx] = { ...screens[idx], html: action.html };
      return {
        ...state,
        app: { ...state.app, screens, updatedAt: Date.now() },
        undoStack,
        redoStack,
        lastEditKey,
        lastEditAt,
      };
    }

    case "FLUSH_EDIT_KEY":
      return { ...state, lastEditKey: null, lastEditAt: 0 };

    case "SET_SCREEN_STREAMING": {
      const idx = state.app.screens.findIndex((s) => s.id === action.screenId);
      if (idx < 0) return state;
      const screens = [...state.app.screens];
      screens[idx] = { ...screens[idx], isStreaming: action.isStreaming };
      return { ...state, app: { ...state.app, screens, updatedAt: Date.now() } };
    }

    case "SET_ACTIVE_SCREEN":
      return { ...state, activeScreenId: action.id, selectedElement: null, lastEditKey: null };

    case "SET_DESIGN_SYSTEM":
      return {
        ...state,
        app: {
          ...state.app,
          designSystem: action.designSystem,
          ...(action.platform ? { platform: action.platform } : {}),
          updatedAt: Date.now(),
        },
      };

    case "SELECT_ELEMENT": {
      // Only reset the edit transaction when selecting a *different* element.
      // Optimistic same-element style updates (slider drags) must not reset
      // lastEditKey or coalescing breaks.
      const prevXPath = state.selectedElement?.xpath ?? null;
      const nextXPath = action.element?.xpath ?? null;
      const isDifferent = prevXPath !== nextXPath;
      return {
        ...state,
        selectedElement: action.element,
        lastEditKey: isDifferent ? null : state.lastEditKey,
      };
    }


    case "ADD_MESSAGE":
      return {
        ...state,
        app: {
          ...state.app,
          messages: [...state.app.messages, action.message],
          updatedAt: Date.now(),
        },
      };

    case "UPDATE_MESSAGE": {
      const messages = state.app.messages.map((m) =>
        m.id === action.id ? { ...m, content: action.content } : m
      );
      return { ...state, app: { ...state.app, messages, updatedAt: Date.now() } };
    }

    case "SET_GENERATING":
      return { ...state, isGenerating: action.isGenerating, genStep: action.genStep ?? "" };

    case "SET_GEN_STEP":
      return { ...state, genStep: action.genStep };

    case "SET_SENDING":
      return { ...state, isSending: action.isSending };

    case "UPDATE_DS_COLOR": {
      if (!state.app.designSystem) return state;
      const colors = { ...state.app.designSystem.colors, [action.key]: action.value };
      return {
        ...state,
        app: { ...state.app, designSystem: { ...state.app.designSystem, colors }, updatedAt: Date.now() },
      };
    }

    case "UPDATE_DS_FONT": {
      if (!state.app.designSystem) return state;
      const fonts = { ...state.app.designSystem.fonts, [action.key]: action.value };
      return {
        ...state,
        app: { ...state.app, designSystem: { ...state.app.designSystem, fonts }, updatedAt: Date.now() },
      };
    }

    case "UPDATE_PLATFORM":
      return {
        ...state,
        app: { ...state.app, platform: action.platform, updatedAt: Date.now() },
      };

    case "CLEAR_FOR_REGEN":
      return {
        ...state,
        app: { ...state.app, screens: [], designSystem: null, messages: [], updatedAt: Date.now() },
        activeScreenId: null,
        selectedElement: null,
        undoStack: [],
        redoStack: [],
      };

    case "SYNC_DS_TO_SCREENS": {
      if (!state.app.designSystem || state.app.screens.length === 0) return state;
      const ds = state.app.designSystem;
      const updatedScreens = state.app.screens.map((s) => ({
        ...s,
        html: s.html ? applyDsToHtml(s.html, ds) : s.html,
      }));
      return {
        ...state,
        app: { ...state.app, screens: updatedScreens, updatedAt: Date.now() },
      };
    }

    case "ADD_AGENT_STEP": {
      const messages = state.app.messages.map((m) => {
        if (m.id !== action.messageId) return m;
        return { ...m, agentSteps: [...(m.agentSteps ?? []), action.step] };
      });
      return { ...state, app: { ...state.app, messages, updatedAt: Date.now() } };
    }

    case "UPDATE_AGENT_STEP": {
      const messages = state.app.messages.map((m) => {
        if (m.id !== action.messageId) return m;
        const steps = (m.agentSteps ?? []).map((s) =>
          s.id === action.stepId ? { ...s, ...action.updates } : s
        );
        return { ...m, agentSteps: steps };
      });
      return { ...state, app: { ...state.app, messages, updatedAt: Date.now() } };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const entry = state.undoStack[state.undoStack.length - 1];
      const idx = state.app.screens.findIndex((s) => s.id === entry.screenId);
      if (idx < 0) return { ...state, undoStack: state.undoStack.slice(0, -1), lastEditKey: null };

      const current = state.app.screens[idx];
      const screens = [...state.app.screens];
      screens[idx] = { ...screens[idx], html: entry.html };

      return {
        ...state,
        app: { ...state.app, screens, updatedAt: Date.now() },
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { screenId: entry.screenId, html: current.html }],
        lastEditKey: null,
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const entry = state.redoStack[state.redoStack.length - 1];
      const idx = state.app.screens.findIndex((s) => s.id === entry.screenId);
      if (idx < 0) return { ...state, redoStack: state.redoStack.slice(0, -1), lastEditKey: null };

      const current = state.app.screens[idx];
      const screens = [...state.app.screens];
      screens[idx] = { ...screens[idx], html: entry.html };

      return {
        ...state,
        app: { ...state.app, screens, updatedAt: Date.now() },
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, { screenId: entry.screenId, html: current.html }],
        lastEditKey: null,
      };
    }

    default:
      return state;
  }
}

/* --- Context --- */

interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

/* --- Provider --- */

export function WorkspaceProvider({
  initialApp,
  children,
}: {
  initialApp: WireframeApp;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    app: initialApp,
    activeScreenId: initialApp.screens[0]?.id ?? null,
    selectedElement: null,
    isGenerating: false,
    genStep: "",
    isSending: false,
    undoStack: [],
    redoStack: [],
    lastEditKey: null,
    lastEditAt: 0,
  });

  // Debounced API persistence for project metadata changes
  const prevAppRef = useRef(state.app);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.app === prevAppRef.current) return;
    const prev = prevAppRef.current;
    prevAppRef.current = state.app;

    // Only persist metadata changes (name, description, designSystem, platform)
    const metaChanged =
      prev.name !== state.app.name ||
      prev.description !== state.app.description ||
      prev.designSystem !== state.app.designSystem ||
      prev.platform !== state.app.platform;

    if (metaChanged) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/projects/${state.app.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: state.app.name,
            description: state.app.description,
            designSystem: state.app.designSystem,
            platform: state.app.platform,
          }),
        }).catch(() => {});
      }, 1500);
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.app]);

  // Debounced message persistence — saves full conversation to DB on any message change
  useEffect(() => {
    if (state.app.messages.length === 0) return;
    const projectId = state.app.id;
    const msgs = state.app.messages;
    if (msgSaveTimerRef.current) clearTimeout(msgSaveTimerRef.current);
    msgSaveTimerRef.current = setTimeout(() => {
      fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          msgs.map((m, i) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            image: m.image,
            agentSteps: m.agentSteps,
            sortOrder: i,
          }))
        ),
      }).catch(() => {});
    }, 1000);
  }, [state.app.id, state.app.messages]);

  /* Debounced screen-HTML persistence — covers PropertyPanel inline edits
     (opacity, color, classes, text). Without this, manual edits are lost on
     refresh. Each screen gets its own debounce timer so concurrent edits
     across screens don't trample each other. */
  const screenHtmlSnapshotRef = useRef<Map<string, string>>(new Map());
  const screenSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const projectId = state.app.id;
    for (const screen of state.app.screens) {
      if (!screen.html) continue;
      if (screen.isStreaming) continue;
      const prevHtml = screenHtmlSnapshotRef.current.get(screen.id);
      if (prevHtml === undefined) {
        // First time we see this screen with HTML — treat as baseline, don't save
        screenHtmlSnapshotRef.current.set(screen.id, screen.html);
        continue;
      }
      if (prevHtml === screen.html) continue;
      screenHtmlSnapshotRef.current.set(screen.id, screen.html);

      const existing = screenSaveTimersRef.current.get(screen.id);
      if (existing) clearTimeout(existing);
      const screenId = screen.id;
      const htmlToSave = screen.html;
      const timer = setTimeout(() => {
        fetch(`/api/projects/${projectId}/screens/${screenId}/html`, {
          method: "PUT",
          headers: { "Content-Type": "text/plain" },
          body: htmlToSave,
        }).catch(() => {});
        screenSaveTimersRef.current.delete(screenId);
      }, 1500);
      screenSaveTimersRef.current.set(screen.id, timer);
    }
  }, [state.app.id, state.app.screens]);

  // Flush all pending screen saves on unmount
  useEffect(() => {
    const timers = screenSaveTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) dispatch({ type: "REDO" });
        else dispatch({ type: "UNDO" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <WorkspaceContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
