import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PLAN_PRODUCT_IDS, type PlanId } from "@/lib/payments/dodo";

/**
 * Dodo Payments webhook receiver — single source of truth for subscription
 * state. We capture both subscription_id AND customer_id from every event so
 * the customer portal can be opened directly without a roundtrip lookup, and
 * the user still has a working portal even after their subscription churns
 * (cancel + resubscribe creates a new sub_id but the same cus_id).
 *
 * Event coverage matches the Dodo subscription-integration skill:
 *   subscription.active       → activate
 *   subscription.renewed      → activate (refresh + log)
 *   subscription.plan_changed → activate with new plan mapping
 *   subscription.on_hold      → mark past_due, keep entitlements briefly
 *   subscription.cancelled    → cancel_pending (cancel at period end) OR inactive
 *   subscription.failed       → mandate failed, revoke
 *   subscription.expired      → term ended, revoke
 */
export async function POST(req: NextRequest) {
  const { Webhooks } = await import("@dodopayments/nextjs");

  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!webhookKey) {
    console.error("[dodo-webhook] DODO_PAYMENTS_WEBHOOK_SECRET not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  const handler = Webhooks({
    webhookKey,
    onSubscriptionActive: async (p) => activate(p, "active"),
    onSubscriptionRenewed: async (p) => activate(p, "renewed"),
    onSubscriptionPlanChanged: async (p) => activate(p, "plan_changed"),
    onSubscriptionOnHold: async (p) => setStatus(p, "past_due", "on_hold"),
    onSubscriptionCancelled: async (p) => onCancelled(p),
    onSubscriptionFailed: async (p) => setStatus(p, "inactive", "failed", { revoke: true }),
    onSubscriptionExpired: async (p) => setStatus(p, "inactive", "expired", { revoke: true }),
  });

  try {
    return await handler(req);
  } catch (error) {
    console.error("[dodo-webhook] handler error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

/* ── Payload helpers ────────────────────────────────────────── */

type WebhookPayload = { data: Record<string, unknown> };
type Customer = { customer_id?: string; email?: string };

function getClerkId(data: Record<string, unknown>): string | null {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.clerk_user_id ?? null;
}

function getCustomer(data: Record<string, unknown>): Customer {
  return (data.customer as Customer) ?? {};
}

function getProductId(data: Record<string, unknown>): string {
  if (data.product_id) return data.product_id as string;
  const cart = data.product_cart as Array<{ product_id: string }> | undefined;
  return cart?.[0]?.product_id ?? "";
}

function getSubscriptionId(data: Record<string, unknown>): string | null {
  return (data.subscription_id as string) ?? null;
}

/**
 * Resolve our internal user — first via clerk_user_id in metadata (set by our
 * checkout route), then by customer email. Email-fallback handles cases where
 * the subscription was created outside the normal checkout flow.
 */
async function findUser(data: Record<string, unknown>) {
  const clerkId = getClerkId(data);
  if (clerkId) {
    const byClerk = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
    if (byClerk) return byClerk;
  }
  const email = getCustomer(data).email;
  if (email) {
    const byEmail = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (byEmail) return byEmail;
  }
  return null;
}

/* ── Handlers ───────────────────────────────────────────────── */

async function activate(payload: WebhookPayload, kind: string) {
  const data = payload.data;
  const user = await findUser(data);
  const subscriptionId = getSubscriptionId(data);
  const customerId = getCustomer(data).customer_id ?? null;

  if (!user) {
    console.warn(`[dodo-webhook:${kind}] no user match`, {
      sub: subscriptionId,
      email: getCustomer(data).email,
      clerk: getClerkId(data),
    });
    return;
  }

  const productId = getProductId(data);
  const mappedPlan = PLAN_PRODUCT_IDS[productId];
  const planId: PlanId = mappedPlan ?? (user.plan as PlanId) ?? "pro";

  await db
    .update(users)
    .set({
      plan: planId,
      subscriptionId: subscriptionId ?? user.subscriptionId,
      dodoCustomerId: customerId ?? user.dodoCustomerId,
      subscriptionStatus: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`[dodo-webhook:${kind}] activated`, {
    user: user.id,
    plan: planId,
    sub: subscriptionId,
    cus: customerId,
  });
}

async function setStatus(
  payload: WebhookPayload,
  status: "active" | "past_due" | "inactive" | "cancel_pending",
  kind: string,
  opts: { revoke?: boolean } = {}
) {
  const data = payload.data;
  const user = await findUser(data);
  if (!user) {
    console.warn(`[dodo-webhook:${kind}] no user match`, { sub: getSubscriptionId(data) });
    return;
  }

  // Always capture customer_id if present — it's useful for portal access
  // regardless of what status transition we're recording.
  const customerId = getCustomer(data).customer_id ?? null;

  await db
    .update(users)
    .set({
      subscriptionStatus: status,
      ...(opts.revoke ? { plan: "free" } : {}),
      dodoCustomerId: customerId ?? user.dodoCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`[dodo-webhook:${kind}] status=${status} revoke=${!!opts.revoke}`, {
    user: user.id,
  });
}

async function onCancelled(payload: WebhookPayload) {
  const data = payload.data;
  const user = await findUser(data);
  if (!user) {
    console.warn("[dodo-webhook:cancelled] no user match", { sub: getSubscriptionId(data) });
    return;
  }

  // If cancel_at_next_billing_date is true, the user retains access until
  // period end. We mark cancel_pending and let `expired` move them to free.
  // Otherwise it's an immediate cancellation.
  const cancelAtPeriodEnd = !!data.cancel_at_next_billing_date;
  const customerId = getCustomer(data).customer_id ?? null;

  await db
    .update(users)
    .set({
      subscriptionStatus: cancelAtPeriodEnd ? "cancel_pending" : "inactive",
      ...(cancelAtPeriodEnd ? {} : { plan: "free" }),
      dodoCustomerId: customerId ?? user.dodoCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log("[dodo-webhook:cancelled]", { user: user.id, cancelAtPeriodEnd });
}
