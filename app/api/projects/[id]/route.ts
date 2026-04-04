import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, screens, messages } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, and, asc } from "drizzle-orm";
import { deleteProjectFiles } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/projects/[id] — full project with screens metadata + messages */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const internalId = await resolveUserId(clerkId);
    const { id } = await ctx.params;

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.userId, internalId)),
      with: {
        screens: {
          columns: { id: true, name: true, sortOrder: true, storageKey: true, htmlSize: true, createdAt: true, updatedAt: true },
          orderBy: [asc(screens.sortOrder)],
        },
        messages: {
          orderBy: [asc(messages.sortOrder)],
        },
      },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error("[GET /api/projects/[id]] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/** PATCH /api/projects/[id] — update metadata, designSystem, platform */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const internalId = await resolveUserId(clerkId);
    const { id } = await ctx.params;
    const body = await req.json();

    const allowed: Record<string, unknown> = {};
    if (body.name !== undefined) allowed.name = body.name;
    if (body.description !== undefined) allowed.description = body.description;
    if (body.platform !== undefined) allowed.platform = body.platform;
    if (body.designSystem !== undefined) allowed.designSystem = body.designSystem;
    allowed.updatedAt = new Date();

    const [row] = await db
      .update(projects)
      .set(allowed)
      .where(and(eq(projects.id, id), eq(projects.userId, internalId)))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error("[PATCH /api/projects/[id]] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/** DELETE /api/projects/[id] — delete project + cascade S3 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const internalId = await resolveUserId(clerkId);
    const { id } = await ctx.params;

    // Delete from S3
    try {
      await deleteProjectFiles(internalId, id);
    } catch (err) {
      console.warn("[DELETE /api/projects/[id]] S3 cleanup warning:", err);
    }

    // Cascade deletes screens + messages via FK
    const [row] = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, internalId)))
      .returning({ id: projects.id });

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
