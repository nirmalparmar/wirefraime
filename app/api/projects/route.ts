import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";
import { eq, desc } from "drizzle-orm";

/** GET /api/projects — list user's projects (metadata only) */
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const internalId = await resolveUserId(clerkId);

  const rows = await db.query.projects.findMany({
    where: eq(projects.userId, internalId),
    orderBy: [desc(projects.updatedAt)],
    with: {
      screens: {
        columns: { id: true, name: true, sortOrder: true, htmlSize: true },
        orderBy: (s, { asc }) => [asc(s.sortOrder)],
      },
    },
  });

  return NextResponse.json(rows);
}

/** POST /api/projects — create a project */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const internalId = await resolveUserId(clerkId);
  const body = await req.json();

  const [row] = await db
    .insert(projects)
    .values({
      userId: internalId,
      name: body.name,
      description: body.description ?? "",
      platform: body.platform ?? "web",
      designSystem: body.designSystem ?? null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
