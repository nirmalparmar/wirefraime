import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/db/helpers";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const app = await req.json();
    const internalId = await resolveUserId(clerkId);
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await db.insert(shares).values({ id, userId: internalId, data: app });
    return NextResponse.json({ id, url: `/preview/${id}` });
  } catch (error) {
    console.error("[POST /api/share] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
