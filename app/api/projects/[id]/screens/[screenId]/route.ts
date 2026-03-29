import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, screens } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, and } from "drizzle-orm";
import { deleteScreenFile } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string; screenId: string }> };

/** PATCH /api/projects/[id]/screens/[screenId] — update name, sortOrder */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const internalId = await resolveUserId(clerkId);
  const { id: projectId, screenId } = await ctx.params;

  // Verify ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, internalId)),
    columns: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  if (body.name !== undefined) allowed.name = body.name;
  if (body.sortOrder !== undefined) allowed.sortOrder = body.sortOrder;
  if (body.storageKey !== undefined) allowed.storageKey = body.storageKey;
  if (body.htmlSize !== undefined) allowed.htmlSize = body.htmlSize;
  allowed.updatedAt = new Date();

  const [row] = await db
    .update(screens)
    .set(allowed)
    .where(and(eq(screens.id, screenId), eq(screens.projectId, projectId)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

/** DELETE /api/projects/[id]/screens/[screenId] */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const internalId = await resolveUserId(clerkId);
  const { id: projectId, screenId } = await ctx.params;

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, internalId)),
    columns: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get storage key before deleting
  const screen = await db.query.screens.findFirst({
    where: and(eq(screens.id, screenId), eq(screens.projectId, projectId)),
    columns: { storageKey: true },
  });

  if (screen?.storageKey) {
    try { await deleteScreenFile(screen.storageKey); } catch {}
  }

  await db.delete(screens).where(and(eq(screens.id, screenId), eq(screens.projectId, projectId)));
  return NextResponse.json({ deleted: true });
}
