import { asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { dsProjects, dsScreens } from "./schema";
import type { Theme } from "@/lib/ds";
import type { ScreenSource } from "@/lib/agent";

export type DsProject = typeof dsProjects.$inferSelect;
export type DsScreen = typeof dsScreens.$inferSelect;

export async function createDsProject(input: {
  clerkUserId: string | null;
  name: string;
  prompt: string;
  theme: Theme;
}): Promise<DsProject> {
  const [row] = await db.insert(dsProjects).values(input).returning();
  return row;
}

export async function setDsProjectStatus(
  id: string,
  status: "generating" | "ready" | "error",
): Promise<void> {
  await db
    .update(dsProjects)
    .set({ status, updatedAt: new Date() })
    .where(eq(dsProjects.id, id));
}

export async function setDsProjectTheme(id: string, theme: Theme): Promise<void> {
  await db
    .update(dsProjects)
    .set({ theme, updatedAt: new Date() })
    .where(eq(dsProjects.id, id));
}

export async function insertDsScreen(input: {
  projectId: string;
  name: string;
  purpose: string;
  html: string;
  source: ScreenSource;
  sortOrder: number;
}): Promise<DsScreen> {
  const [row] = await db.insert(dsScreens).values(input).returning();
  return row;
}

export async function getDsProjectWithScreens(
  id: string,
): Promise<{ project: DsProject; screens: DsScreen[] } | null> {
  const [project] = await db.select().from(dsProjects).where(eq(dsProjects.id, id));
  if (!project) return null;
  const screens = await db
    .select()
    .from(dsScreens)
    .where(eq(dsScreens.projectId, id))
    .orderBy(asc(dsScreens.sortOrder));
  return { project, screens };
}

export async function listDsProjects(clerkUserId: string): Promise<DsProject[]> {
  return db
    .select()
    .from(dsProjects)
    .where(eq(dsProjects.clerkUserId, clerkUserId))
    .orderBy(desc(dsProjects.updatedAt));
}
