import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const SHARE_DIR = join(process.cwd(), ".data", "shares");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await readFile(join(SHARE_DIR, `${id}.json`), "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
