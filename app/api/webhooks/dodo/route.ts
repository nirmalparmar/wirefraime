import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLAN_PRODUCT_IDS } from "@/lib/payments/dodo";

export async function POST(req: NextRequest) {
  // Lazy import to avoid build-time crash when env var is empty
  const { Webhooks } = await import("@dodopayments/nextjs");

  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) {
    return NextResponse.json({ error: "Webhook key not configured" }, { status: 500 });
  }

  const handler = Webhooks({
    webhookKey,

    onSubscriptionActive: async (payload: any) => {
      await handleSubscriptionActivated(payload);
    },

    onSubscriptionRenewed: async (payload: any) => {
      await handleSubscriptionActivated(payload);
    },

    onSubscriptionCancelled: async (payload: any) => {
      await handleSubscriptionDeactivated(payload);
    },

    onSubscriptionExpired: async (payload: any) => {
      await handleSubscriptionDeactivated(payload);
    },

    onSubscriptionFailed: async (payload: any) => {
      await handleSubscriptionDeactivated(payload);
    },
  });

  return handler(req);
}

async function handleSubscriptionActivated(payload: any) {
  const data = payload.data;
  console.log("Subscription activated:", data);
  const clerkUserId = data?.metadata?.clerk_user_id;
  if (!clerkUserId) return;

  const productId = data.product_id as string;
  const planId = PLAN_PRODUCT_IDS[productId] ?? "pro";

  await db
    .update(users)
    .set({
      plan: planId,
      subscriptionId: data.subscription_id ?? null,
      subscriptionStatus: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, clerkUserId));
}

async function handleSubscriptionDeactivated(payload: any) {
  const data = payload.data;
  const clerkUserId = data?.metadata?.clerk_user_id;
  if (!clerkUserId) return;

  await db
    .update(users)
    .set({
      plan: "free",
      subscriptionId: null,
      subscriptionStatus: "inactive",
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, clerkUserId));
}
