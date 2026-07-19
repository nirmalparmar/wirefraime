/** Last rung of the fallback ladder — a static screen that always renders. */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function placeholderScreen(name: string, purpose: string): string {
  return `<div class="shell shell-topnav">
  <header class="topnav">
    <div class="brand"><span class="brand-mark">•</span> ${esc(name)}</div>
  </header>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">${esc(name)}</h1>
        <p class="page-desc">${esc(purpose)}</p>
      </div>
    </header>
    <div class="empty-state">
      <div class="empty-state-icon">◇</div>
      <p class="empty-state-title">This screen needs another pass</p>
      <p class="empty-state-desc">Generation didn't finish for this screen. Ask in chat to redesign it and it will fill in.</p>
    </div>
  </main>
</div>`;
}
