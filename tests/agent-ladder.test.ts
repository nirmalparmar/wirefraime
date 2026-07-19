import { describe, expect, test } from "bun:test";
import type { LlmClient } from "../lib/llm";
import { generateScreenHtml } from "../lib/agent/generate-screen";
import { generatePlan, fallbackPlan } from "../lib/agent/plan";
import type { ScreenPromptContext } from "../lib/agent/prompts";

/** Phase B acceptance: kill-switch test — a designer model returning
 * garbage still completes with placeholder screens; every rung of the
 * ladder behaves. */

const GOOD_SCREEN = `<div class="shell shell-sidebar">
  <aside class="sidebar"><div class="brand"><span class="brand-mark">F</span> FitTrack</div>
    <nav class="nav"><a class="nav-item active">Dashboard</a><a class="nav-item">Members</a></nav>
  </aside>
  <main class="page">
    <header class="page-header"><div><h1 class="page-title">Dashboard</h1>
    <p class="page-desc">Today at Iron Works Gym.</p></div></header>
    <div class="grid-3">
      <div class="card"><p class="stat-label">Check-ins today</p><p class="stat">148</p></div>
      <div class="card"><p class="stat-label">Active members</p><p class="stat">1,204</p></div>
      <div class="card"><p class="stat-label">Classes running</p><p class="stat">6</p></div>
    </div>
  </main>
</div>`;

const ctx: ScreenPromptContext = {
  appName: "FitTrack",
  userPrompt: "a fitness app for gym owners",
  screens: [{ name: "Dashboard", purpose: "daily overview" }],
  screen: { name: "Dashboard", purpose: "daily overview" },
};

function fakeLlm(handlers: {
  stream?: (role: string, prompt: string, call: number) => string | Promise<string>;
  json?: (role: string, prompt: string, call: number) => unknown;
}): LlmClient & { streamCalls: Array<{ role: string; prompt: string }> } {
  const streamCalls: Array<{ role: string; prompt: string }> = [];
  let jsonCalls = 0;
  return {
    streamCalls,
    async streamHtml({ role, prompt, onChunk }) {
      streamCalls.push({ role, prompt });
      const text = await (handlers.stream?.(role, prompt, streamCalls.length) ??
        Promise.reject(new Error("no stream handler")));
      onChunk?.(text);
      return text;
    },
    async generateJson({ role, prompt, schema }) {
      jsonCalls++;
      const value = handlers.json?.(role, prompt, jsonCalls);
      if (value instanceof Error) throw value;
      return schema.parse(value) as never;
    },
  };
}

describe("generateScreenHtml fallback ladder", () => {
  test("rung 1: good designer output passes straight through, sanitized", async () => {
    const llm = fakeLlm({ stream: () => "```html\n" + GOOD_SCREEN + "\n```" });
    const r = await generateScreenHtml({ ctx, llm });
    expect(r.source).toBe("designer");
    expect(r.html).toContain('<div class="shell shell-sidebar">');
    expect(r.html).not.toContain("```");
    expect(llm.streamCalls.length).toBe(1);
  });

  test("rung 2: bad first attempt → retry prompt carries complaints → succeeds", async () => {
    const llm = fakeLlm({
      stream: (_role, _prompt, call) => (call === 1 ? "<p>oops</p>" : GOOD_SCREEN),
    });
    const r = await generateScreenHtml({ ctx, llm });
    expect(r.source).toBe("designer-retry");
    expect(llm.streamCalls[1].prompt).toContain("rejected by the validator");
    expect(llm.streamCalls[1].role).toBe("designer");
  });

  test("rung 3: designer keeps failing → fast model simple version", async () => {
    const llm = fakeLlm({
      stream: (role) => (role === "designer" ? "garbage" : GOOD_SCREEN),
    });
    const r = await generateScreenHtml({ ctx, llm });
    expect(r.source).toBe("fast");
    expect(llm.streamCalls.map((c) => c.role)).toEqual(["designer", "designer", "fast"]);
    expect(llm.streamCalls[2].prompt).toContain("Keep it SIMPLE");
  });

  test("kill-switch: every model returns garbage → placeholder still ships", async () => {
    const llm = fakeLlm({ stream: () => "<<<TOTALLY BROKEN ###" });
    const r = await generateScreenHtml({ ctx, llm });
    expect(r.source).toBe("placeholder");
    expect(r.html).toContain('<div class="shell shell-topnav">');
    expect(r.html).toContain("Dashboard");
    expect(r.html).toContain("empty-state");
  });

  test("kill-switch: every model THROWS → placeholder still ships", async () => {
    const llm = fakeLlm({
      stream: () => {
        throw new Error("model exploded");
      },
    });
    const r = await generateScreenHtml({ ctx, llm });
    expect(r.source).toBe("placeholder");
  });
});

describe("generatePlan", () => {
  const validPlan = {
    appName: "FitTrack",
    theme: {
      background: "#fafaf9",
      card: "#ffffff",
      muted: "#f1f0ee",
      border: "#e5e4e0",
      primary: "#c2410c",
      radius: 10,
      displayFont: "Sora",
      bodyFont: "Inter",
    },
    screens: [
      { name: "Dashboard", purpose: "Daily gym overview" },
      { name: "Members", purpose: "Member roster" },
    ],
  };

  test("valid model plan → clamped theme + trimmed screens", async () => {
    const llm = fakeLlm({ json: () => validPlan });
    const { plan, source } = await generatePlan("a fitness app", llm);
    expect(source).toBe("model");
    expect(plan.appName).toBe("FitTrack");
    expect(plan.screens.length).toBe(2);
    expect(plan.theme.colors.primary).toBe("#c2410c");
    expect(plan.theme.fonts.display).toBe("Sora");
    // Derived foreground repaired to AA against the chosen background
    expect(plan.theme.colors.foreground).toBeTruthy();
  });

  test("more than 6 screens gets clamped to 6", async () => {
    const big = {
      ...validPlan,
      screens: Array.from({ length: 9 }, (_, i) => ({
        name: `Screen ${i + 1}`,
        purpose: "p",
      })),
    };
    const llm = fakeLlm({ json: () => big });
    const { plan } = await generatePlan("x y z", llm);
    expect(plan.screens.length).toBe(6);
  });

  test("invalid then valid → retry succeeds", async () => {
    const llm = fakeLlm({
      json: (_r, _p, call) => (call === 1 ? { nope: true } : validPlan),
    });
    const { source } = await generatePlan("a fitness app", llm);
    expect(source).toBe("model");
  });

  test("model always fails → deterministic fallback plan", async () => {
    const llm = fakeLlm({ json: () => new Error("api down") });
    const { plan, source } = await generatePlan("invoicing tool for plumbers", llm);
    expect(source).toBe("fallback");
    expect(plan.screens.length).toBe(3);
    expect(plan.appName).toBe("Invoicing Tool");
    expect(plan.screens[0].purpose).toContain("invoicing tool for plumbers");
  });

  test("fallbackPlan never throws on weird prompts", () => {
    for (const p of ["", "   ", "!!!", "日本語のアプリ"]) {
      const plan = fallbackPlan(p);
      expect(plan.screens.length).toBe(3);
      expect(plan.appName.length).toBeGreaterThan(0);
    }
  });
});
