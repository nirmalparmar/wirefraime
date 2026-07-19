import { describe, expect, test } from "bun:test";
import {
  assembleDesignerSystemPrompt,
  buildScreenPrompt,
  buildRetryPrompt,
} from "../lib/agent/prompts";
import { pickExamples, loadGuidelines, loadComponentCatalog } from "../lib/agent/references";

/** Plan §6: prompt-assembly code has a unit test asserting the
 * references are ACTUALLY included — quality lives in those files. */

describe("prompt assembly", () => {
  const screen = { name: "Dashboard", purpose: "Overview of gym member activity" };
  const system = assembleDesignerSystemPrompt(screen);

  test("includes guidelines.md content verbatim", () => {
    // A distinctive phrase from guidelines.md — if this fails, the file
    // was edited; update the marker, don't weaken the test.
    expect(loadGuidelines()).toContain("Content before decoration");
    expect(system).toContain("Content before decoration");
  });

  test("includes the full class catalog", () => {
    expect(loadComponentCatalog()).toContain("Component & class catalog");
    expect(system).toContain("Component & class catalog");
    expect(system).toContain('.shell.shell-sidebar');
  });

  test("includes 1–2 relevant example screens with their HTML", () => {
    expect(system).toContain("Example screen: dashboard");
    expect(system).toContain('<div class="shell shell-sidebar">');
  });

  test("pickExamples routes by screen intent", () => {
    expect(pickExamples("Dashboard", "overview of stats")[0]).toBe("dashboard");
    expect(pickExamples("Settings", "notification preferences")[0]).toBe("settings");
    expect(pickExamples("Members", "list of all gym members")[0]).toBe("crm-list");
    expect(pickExamples("Welcome", "sign up flow")[0]).toBe("onboarding");
    expect(pickExamples("Plans", "pricing tiers")[0]).toBe("pricing");
    expect(pickExamples("Reports", "usage analytics charts")[0]).toBe("analytics");
    // Unknown intent falls back to dashboard + a second example
    const fallback = pickExamples("Mystery", "???");
    expect(fallback[0]).toBe("dashboard");
    expect(fallback.length).toBeLessThanOrEqual(2);
  });

  test("screen prompt carries app context and nav consistency", () => {
    const ctx = {
      appName: "FitTrack",
      userPrompt: "a fitness app for gyms",
      screens: [screen, { name: "Members", purpose: "member list" }],
      screen,
    };
    const p = buildScreenPrompt(ctx);
    expect(p).toContain("FitTrack");
    expect(p).toContain("a fitness app for gyms");
    expect(p).toContain("Members");
    expect(p).toContain("this screen — mark active");
  });

  test("retry prompt appends validator complaints", () => {
    const ctx = {
      appName: "FitTrack",
      userPrompt: "a fitness app",
      screens: [screen],
      screen,
    };
    const p = buildRetryPrompt(ctx, ["missing shell", "unknown classes"]);
    expect(p).toContain("rejected by the validator");
    expect(p).toContain("- missing shell");
    expect(p).toContain("- unknown classes");
  });
});
