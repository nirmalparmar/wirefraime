import type { WireframeApp } from "./types";
import { STORAGE_KEY } from "./constants";

/**
 * RFC-4122 v4 UUID. Ids from here are persisted into Postgres `uuid` columns
 * (e.g. messages.id), so they MUST be valid UUIDs — a base36 short id is
 * rejected with "invalid input syntax for type uuid". Prefer the native CSPRNG;
 * fall back to a Math.random v4 for non-secure contexts where it's unavailable.
 */
export function uuid(): string {
  const c: Crypto | undefined = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
