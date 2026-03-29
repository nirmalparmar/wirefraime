export interface AgentStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
  screenId?: string;
  timestamp: number;
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
