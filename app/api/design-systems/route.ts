import { NextResponse } from "next/server";
import { listBrandPackages } from "@/lib/design/design-systems";

/** GET /api/design-systems — public brand catalog metadata for the picker. */
export async function GET() {
  const packages = listBrandPackages().map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    description: m.description,
    tags: m.tags,
  }));
  return NextResponse.json(packages);
}
