import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLAN_PRODUCT_IDS } from "@/lib/payments/dodo";

export async function POST(req: NextRequest) {
  // Lazy import to avoid build crash when env var is missing
  const { Webhooks } = await import("@dodopayments/nextjs");

  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!webhookKey) {
    return new Response("Webhook key not configured", { status: 500 });
  }

  const handler = Webhooks({
    webhookKey,

    onSubscriptionActive: async (payload) => {
      await handleActivated(payload);
    },

    onSubscriptionRenewed: async (payload) => {
      await handleActivated(payload);
    },

    onSubscriptionPlanChanged: async (payload) => {
      await handleActivated(payload);
    },

    onSubscriptionCancelled: async (payload) => {
      await handleDeactivated(payload);
    },

    onSubscriptionExpired: async (payload) => {
      await handleDeactivated(payload);
    },

    onSubscriptionFailed: async (payload) => {
      await handleDeactivated(payload);
    },
  });

  return handler(req);
}

function extractClerkId(data: Record<string, unknown>): string | null {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.clerk_user_id ?? null;
}

function extractProductId(data: Record<string, unknown>): string {
  if (data.product_id) return data.product_id as string;
  const cart = data.product_cart as Array<{ product_id: string }> | undefined;
  return cart?.[0]?.product_id ?? "";
}

async function handleActivated(payload: { data: Record<string, unknown> }) {
  const data = payload.data;
  const clerkUserId = extractClerkId(data);
  if (!clerkUserId) {
    console.warn("[Webhook] No clerk_user_id in metadata, skipping");
    return;
  }

  const productId = extractProductId(data);
  const planId = PLAN_PRODUCT_IDS[productId] ?? "pro";
  const subscriptionId = (data.subscription_id as string) ?? null;

  console.log(`[Webhook] Activating plan=${planId} clerk=${clerkUserId} sub=${subscriptionId}`);

  await db
    .update(users)
    .set({
      plan: planId,
      subscriptionId,
      subscriptionStatus: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, clerkUserId));
}

async function handleDeactivated(payload: { data: Record<string, unknown> }) {
  const data = payload.data;
  const clerkUserId = extractClerkId(data);
  if (!clerkUserId) {
    console.warn("[Webhook] No clerk_user_id in metadata, skipping");
    return;
  }

  console.log(`[Webhook] Deactivating subscription for clerk=${clerkUserId}`);

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
