export interface AgentStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
  screenId?: string;
  timestamp: number;
  /** Live model reasoning/thinking tail streamed during this step (if the model exposes it). */
  reasoning?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string; // base64 data URL
  timestamp: number;
  agentSteps?: AgentStep[];
}

export interface DesignSystem {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    error: string;
  };
  fonts: {
    primary: string;
    mono: string;
  };
  /** Layout tokens for cross-screen consistency. Optional for backward compat. */
  layout?: {
    borderRadius: string;
    borderRadiusLg: string;
    borderRadiusSm: string;
    shadow: string;
    shadowLg: string;
    spacingUnit: number;
    cardPadding: string;
    sectionGap: string;
    buttonHeight: string;
    inputHeight: string;
    navStyle: "sidebar" | "topbar" | "bottom-tabs" | "none";
    navHeight: string;
  };
  /** Shared chrome (sidebar / top nav / bottom tab bar) generated ONCE and
   *  reused verbatim on every screen so navigation stays identical. Optional
   *  for backward compatibility with apps created before shared shells. */
  shell?: {
    /** The complete navigation element (<aside>/<header>/<nav>) used on all screens. */
    navHtml: string;
  };
  /** Component library patterns to reuse across screens. */
  componentLibrary?: {
    buttonHtml: string;
    cardHtml: string;
    inputHtml: string;
  };
}

export interface Screen {
  id: string;
  name: string;
  html: string;
  isStreaming: boolean;
}

export type Platform = "web" | "mobile" | "tablet";

export interface WireframeApp {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  designSystem: DesignSystem | null;
  screens: Screen[];
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
