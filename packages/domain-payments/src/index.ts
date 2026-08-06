export enum ReconciliationStatus {
  Pending = "pending",
  Matched = "matched",
  Mismatch = "mismatch",
  Settled = "settled",
}

export interface InvoiceDto {
  id: string;
  amountMinor: number;
  currency: string;
  status: "DRAFT" | "OPEN" | "PAID" | "VOID";
}

export interface PayoutDto {
  id: string;
  amountMinor: number;
  currency: string;
  status: "QUEUED" | "IN_FLIGHT" | "COMPLETED" | "FAILED";
}

export interface SubscriptionDto {
  id: string;
  customerId: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  renewalAt: string;
}

export interface IdempotencyKeyInput {
  scope: string;
  reference: string;
  nonce?: string;
}

export function createIdempotencyKey(input: IdempotencyKeyInput): string {
  return [input.scope, input.reference, input.nonce ?? "default"].join(":");
}
