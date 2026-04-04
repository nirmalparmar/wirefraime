import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, screens } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, and } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/projects/[id]/screens — create a screen row */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const internalId = await resolveUserId(clerkId);
    const { id: projectId } = await ctx.params;

    // Verify ownership
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.userId, internalId)),
      columns: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    const [row] = await db
      .insert(screens)
      .values({
        id: body.id ?? undefined,
        projectId,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
        storageKey: body.storageKey ?? null,
        htmlSize: body.htmlSize ?? 0,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects/[id]/screens] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
