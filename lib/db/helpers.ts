import { db } from ".";
import { users } from "./schema";
import { eq } from "drizzle-orm";

/** Resolve Clerk user ID → internal Postgres UUID. Throws if not found. */
export async function resolveUserId(clerkId: string): Promise<string> {
  const row = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
    columns: { id: true },
  });
  if (!row) throw new Error("User not found");
  return row.id;
}
