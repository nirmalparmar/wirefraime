import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const row = await db.query.shares.findFirst({
      where: eq(shares.id, id),
      columns: { data: true },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row.data);
  } catch (error) {
    console.error("[GET /api/share/:id]", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
