import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    if (evt.type === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url, created_at } = evt.data;
      const primaryEmail =
        email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)?.email_address
        ?? email_addresses?.[0]?.email_address
        ?? null;

      await db.insert(users).values({
        clerkId: id,
        email: primaryEmail,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        avatarUrl: image_url ?? null,
        plan: "starter",
        createdAt: new Date(created_at),
      });
    }

    if (evt.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail =
        email_addresses?.find((e) => e.id === evt.data.primary_email_address_id)?.email_address
        ?? email_addresses?.[0]?.email_address
        ?? null;

      await db
        .update(users)
        .set({
          email: primaryEmail,
          firstName: first_name ?? null,
          lastName: last_name ?? null,
          avatarUrl: image_url ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, id));
    }

    if (evt.type === "user.deleted") {
      const { id } = evt.data;
      if (id) {
        await db.delete(users).where(eq(users.clerkId, id));
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[POST /api/webhooks/clerk] Webhook error:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }
}
