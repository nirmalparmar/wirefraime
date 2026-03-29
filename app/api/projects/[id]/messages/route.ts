import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, messages } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, and } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/projects/[id]/messages — batch upsert messages */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const internalId = await resolveUserId(clerkId);
  const { id: projectId } = await ctx.params;

  // Verify ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, internalId)),
    columns: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const items: Array<{
    id?: string;
    role: string;
    content: string;
    image?: string;
    agentSteps?: unknown;
    sortOrder?: number;
  }> = Array.isArray(body) ? body : body.messages ?? [];

  const rows: unknown[] = [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const [row] = await db
      .insert(messages)
      .values({
        id: item.id ?? undefined,
        projectId,
        role: item.role,
        content: item.content ?? "",
        image: item.image ?? null,
        agentSteps: item.agentSteps ?? null,
        sortOrder: item.sortOrder ?? idx,
      })
      .onConflictDoUpdate({
        target: messages.id,
        set: {
          content: item.content ?? "",
          agentSteps: item.agentSteps ?? null,
        },
      })
      .returning();
    rows.push(row);
  }

  return NextResponse.json(rows, { status: 201 });
}
