import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const SHARE_DIR = join(process.cwd(), ".data", "shares");

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const app = await req.json();
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await mkdir(SHARE_DIR, { recursive: true });
    await writeFile(join(SHARE_DIR, `${id}.json`), JSON.stringify(app));
    return NextResponse.json({ id, url: `/preview/${id}` });
  } catch (error) {
    console.error("[POST /api/share] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
