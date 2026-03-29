import { Checkout } from "@dodopayments/nextjs";

export const POST = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL ?? "http://localhost:3001/dashboard/billing",
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ?? "test_mode",
  type: "session",
});
