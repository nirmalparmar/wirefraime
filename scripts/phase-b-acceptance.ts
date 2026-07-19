/**
 * Phase B acceptance: 10 diverse prompts → each must yield 3–6 screens,
 * zero blank/broken previews. Run: bun scripts/phase-b-acceptance.ts
 */
const PROMPTS = [
  "a CRM for a small law firm",
  "a fitness coaching app where trainers manage client workout plans",
  "an invoicing tool for freelance designers",
  "a learning management system for a coding bootcamp",
  "a booking system for a hair salon",
  "an inventory manager for a restaurant kitchen",
  "a real estate agency tool for tracking listings and viewings",
  "an applicant tracking system for a startup's hiring",
  "a personal finance app for budgeting and savings goals",
  "an event ticketing dashboard for a music venue",
];

const BASE = process.env.BASE_URL || "http://localhost:3001";

type ScreenResult = { name: string; source: string; len: number };

async function runPrompt(prompt: string): Promise<{
  prompt: string;
  planSource?: string;
  screens: ScreenResult[];
  error?: string;
}> {
  const res = await fetch(`${BASE}/api/ds/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok || !res.body) {
    return { prompt, screens: [], error: `HTTP ${res.status}` };
  }
  const screens: ScreenResult[] = [];
  let planSource: string | undefined;
  let error: string | undefined;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const ev = /^event: (.+)$/m.exec(block)?.[1];
      const dataRaw = /^data: (.+)$/m.exec(block)?.[1];
      if (!ev || !dataRaw) continue;
      const data = JSON.parse(dataRaw);
      if (ev === "plan") planSource = data.source;
      if (ev === "screen_done")
        screens.push({ name: data.name, source: data.source, len: data.html.length });
      if (ev === "error") error = data.message;
    }
  }
  return { prompt, planSource, screens, error };
}

let hardFails = 0;
for (const prompt of PROMPTS) {
  const t0 = Date.now();
  const r = await runPrompt(prompt);
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const count = r.screens.length;
  const blanks = r.screens.filter((s) => s.len < 200).length;
  const placeholders = r.screens.filter((s) => s.source === "placeholder").length;
  const ok = !r.error && count >= 3 && count <= 6 && blanks === 0;
  if (!ok) hardFails++;
  console.log(
    `${ok ? "PASS" : "FAIL"} [${secs}s] "${prompt}" → plan:${r.planSource} screens:${count} blanks:${blanks} placeholders:${placeholders}${r.error ? " ERROR:" + r.error : ""}`,
  );
  for (const s of r.screens) {
    console.log(`       - ${s.name} (${s.source}, ${s.len}b)`);
  }
}
console.log(hardFails === 0 ? "\nALL PASS" : `\n${hardFails} FAILURES`);
process.exit(hardFails === 0 ? 0 : 1);
