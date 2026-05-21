import "server-only";
import DodoPayments from "dodopayments";

const apiKey = process.env.DODO_PAYMENTS_API_KEY;
const environment =
  (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ?? "test_mode";

export const dodo = apiKey
  ? new DodoPayments({ bearerToken: apiKey, environment })
  : null;

export function requireDodo(): DodoPayments {
  if (!dodo) {
    throw new Error("DODO_PAYMENTS_API_KEY is not configured");
  }
  return dodo;
}
