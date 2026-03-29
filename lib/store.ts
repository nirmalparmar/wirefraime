import type { WireframeApp } from "./types";
import { STORAGE_KEY } from "./constants";

export function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadApps(): WireframeApp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveApps(apps: WireframeApp[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export function loadApp(id: string): WireframeApp | undefined {
  return loadApps().find((a) => a.id === id);
}

export function saveApp(app: WireframeApp): void {
  const apps = loadApps();
  const idx = apps.findIndex((a) => a.id === app.id);
  if (idx >= 0) {
    apps[idx] = app;
  } else {
    apps.push(app);
  }
  saveApps(apps);
}
