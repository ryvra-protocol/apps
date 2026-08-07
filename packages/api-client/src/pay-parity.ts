import type { PaymentIntentState } from "@ryvra/domain-payments";

export const PAY_PROTOCOL_SOURCE = "ryvra-protocol/pay" as const;
export const PAY_PROTOCOL_COMPATIBILITY_VERSION = "rfc-0006-v1-draft+phase8-read-model-adapter" as const;
export const PAY_PARITY_CHECK_MARKER = "phase-8.5-2026-08-07T01:25:40.481Z" as const;

export const payCanonicalPaymentIntentStates = [
  "created",
  "authorized",
  "executing",
  "settled",
  "failed",
  "reversed",
] as const;

export const payRouteMap = {
  listInvoices: "/pay/invoices",
  getInvoiceSummary: "/pay/invoices/summary",
  listPayouts: "/pay/payouts",
  getPayoutSummary: "/pay/payouts/summary",
  listReconciliationItems: "/pay/reconciliation/items",
  getReconciliationSummary: "/pay/reconciliation/summary",
  getPayOverview: "/pay/overview",
  listSubscriptions: "/pay/subscriptions",
  createPaymentIntent: "/pay/intents",
  transitionPaymentIntent: (intentId: string): string => `/pay/intents/${encodeURIComponent(intentId)}/transitions`,
  reconcileSettlement: (intentId: string): string => `/pay/reconciliation/intents/${encodeURIComponent(intentId)}`,
} as const;

const paymentIntentStateSet = new Set<PaymentIntentState>(payCanonicalPaymentIntentStates);

export function isPaymentIntentState(value: string): value is PaymentIntentState {
  return paymentIntentStateSet.has(value as PaymentIntentState);
}
