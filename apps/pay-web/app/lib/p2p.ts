import { ApiClientError } from "@ryvra/api-client";
import type { RuntimeMode } from "@ryvra/config";
import {
  createIdempotencyKey,
  type InvoiceDto,
  type PayOverviewDto,
  type PaymentIntent,
  type PayoutDto,
} from "@ryvra/domain-payments";
import { redactIdentifier, redactMemo, sanitizeHandle } from "./privacy";

export type P2pSendStep = "entry" | "review" | "submitting" | "success" | "failure";
export type P2pSendEvent = "CONTINUE" | "BACK" | "SUBMIT" | "SUCCESS" | "FAILURE" | "RESET";

export interface P2pSendDraft {
  recipientHandle: string;
  amountInput: string;
  memo?: string;
  currency: string;
}

export interface P2pSendValidated {
  recipientHandle: string;
  amountMinor: number;
  amountDisplay: string;
  memo?: string;
  currency: string;
}

export interface P2pValidationErrors {
  recipientHandle?: string;
  amountInput?: string;
  memo?: string;
}

export interface P2pValidationResult {
  valid: boolean;
  errors: P2pValidationErrors;
  value?: P2pSendValidated;
}

export interface P2pRequestContext {
  idempotencyKey: string;
  requestId: string;
  correlationId: string;
}

export interface P2pSendAvailabilityInput {
  mode: RuntimeMode;
  hasAuthToken: boolean;
  canOperate: boolean;
  endpointAvailable?: boolean;
}

export interface P2pSendAvailability {
  enabled: boolean;
  reason?: string;
}

export interface P2pErrorEnvelope {
  code: string;
  message: string;
  retryable: boolean;
  source: string;
  status?: number;
  requestId: string;
  correlationId: string;
}

export type P2pNotificationStage = "initiated" | "processing" | "completed" | "failed";

export type P2pActivityKind = "send" | "receive" | "request";

export interface P2pActivityRow {
  id: string;
  kind: P2pActivityKind;
  status: string;
  amountMinor: number;
  currency: string;
  counterparty: string;
  createdAt: string;
  reference: string;
  source: "payouts" | "invoices" | "overview";
}

export interface P2pActivityFilters {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

function normalizeAmountInput(value: string): string {
  return value.replace(/,/g, "").trim();
}

function parseAmountMinor(value: string): number | null {
  const normalized = normalizeAmountInput(value);
  if (!/^\d+(\.\d{1,2})?$/u.test(normalized)) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function transitionP2pSendStep(current: P2pSendStep, event: P2pSendEvent): P2pSendStep {
  if (event === "RESET") {
    return "entry";
  }

  if (event === "CONTINUE") {
    return current === "entry" ? "review" : current;
  }

  if (event === "BACK") {
    return current === "review" || current === "failure" ? "entry" : current;
  }

  if (event === "SUBMIT") {
    return current === "review" || current === "failure" ? "submitting" : current;
  }

  if (event === "SUCCESS") {
    return current === "submitting" ? "success" : current;
  }

  if (event === "FAILURE") {
    return current === "submitting" ? "failure" : current;
  }

  return current;
}

export function validateP2pSendDraft(draft: P2pSendDraft): P2pValidationResult {
  const errors: P2pValidationErrors = {};
  const recipientHandle = sanitizeHandle(draft.recipientHandle);
  const amountMinor = parseAmountMinor(draft.amountInput);
  const memo = redactMemo(draft.memo);
  const normalizedCurrency = draft.currency.trim().toUpperCase() || "USD";

  if (!/^[@a-z0-9_.-]{3,48}$/u.test(recipientHandle)) {
    errors.recipientHandle = "Enter a valid recipient handle (3-48 characters; letters, numbers, ., _, -, @).";
  }

  if (amountMinor === null) {
    errors.amountInput = "Enter a valid amount with up to 2 decimals.";
  } else if (amountMinor > 100_000_000) {
    errors.amountInput = "Amount exceeds the current per-transfer preview limit.";
  }

  if (memo && memo.length > 96) {
    errors.memo = "Memo is too long for this transfer.";
  }

  if (Object.keys(errors).length > 0 || amountMinor === null) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    errors: {},
    value: {
      recipientHandle,
      amountMinor,
      amountDisplay: (amountMinor / 100).toFixed(2),
      ...(memo ? { memo } : {}),
      currency: normalizedCurrency,
    },
  };
}

export function createP2pClientGeneratedId(prefix = "p2p"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createP2pIdempotencyKey(senderAccountId: string, recipientHandle: string, nonce?: string): string {
  return createIdempotencyKey({
    scope: "pay.p2p.send",
    reference: `${senderAccountId}:${sanitizeHandle(recipientHandle)}`,
    nonce: nonce ?? createP2pClientGeneratedId("nonce"),
  });
}

export function resolveP2pSendAvailability({
  mode,
  hasAuthToken,
  canOperate,
  endpointAvailable = true,
}: P2pSendAvailabilityInput): P2pSendAvailability {
  if (!endpointAvailable) {
    return {
      enabled: false,
      reason: "P2P send is not available in this runtime.",
    };
  }

  if (!canOperate) {
    return {
      enabled: false,
      reason: "P2P send requires Operator or Admin workspace access.",
    };
  }

  if (mode === "http" && !hasAuthToken) {
    return {
      enabled: false,
      reason: "Set RYVRA_PAY_AUTH_TOKEN in HTTP mode to send funds.",
    };
  }

  return { enabled: true };
}

export function buildP2pSendIntent(
  input: P2pSendValidated,
  senderAccountId: string,
  context: P2pRequestContext,
  createdAt = new Date().toISOString(),
): PaymentIntent {
  const recipient = sanitizeHandle(input.recipientHandle);
  const assetCode = input.currency.trim().toLowerCase() || "usd";

  return {
    intent_id: createP2pClientGeneratedId("intent"),
    reference_id: `p2p:${senderAccountId}:${recipient}`,
    idempotency_key: context.idempotencyKey,
    kind: "treasury_transfer",
    sourceAccountId: senderAccountId,
    destinationAccountId: `p2p-handle:${recipient}`,
    asset: {
      chain: "fiat",
      asset: assetCode,
      decimals: 2,
    },
    assetId: assetCode,
    amount: input.amountDisplay,
    reason_code: "p2p_send",
    reason_codes: ["p2p_send", "phase_21_ui"],
    metadata: {
      channel: "p2p",
      recipient_handle_redacted: redactIdentifier(recipient, 2, 2),
      ...(input.memo ? { memo: input.memo } : {}),
    },
    state: "created",
    created_at: createdAt,
  };
}

function toP2pErrorEnvelope(candidate: Record<string, unknown> | undefined, requestId: string, correlationId: string): P2pErrorEnvelope {
  return {
    code: typeof candidate?.code === "string" ? candidate.code : "runtime_error",
    message: typeof candidate?.message === "string" ? candidate.message : "P2P send failed",
    retryable: typeof candidate?.retryable === "boolean" ? candidate.retryable : true,
    source: typeof candidate?.source === "string" ? candidate.source : "runtime",
    ...(typeof candidate?.status === "number" ? { status: candidate.status } : {}),
    requestId,
    correlationId,
  };
}

export function normalizeP2pErrorEnvelope(error: unknown, requestId: string, correlationId: string): P2pErrorEnvelope {
  if (error instanceof ApiClientError) {
    return toP2pErrorEnvelope(error.toApiError() as unknown as Record<string, unknown>, requestId, correlationId);
  }

  if (typeof error === "object" && error !== null) {
    const shape = error as Record<string, unknown>;
    if (typeof shape.error === "object" && shape.error !== null) {
      return toP2pErrorEnvelope(shape.error as Record<string, unknown>, requestId, correlationId);
    }

    return toP2pErrorEnvelope(shape, requestId, correlationId);
  }

  if (error instanceof Error) {
    return {
      code: "runtime_error",
      message: error.message,
      retryable: true,
      source: "runtime",
      requestId,
      correlationId,
    };
  }

  return {
    code: "runtime_error",
    message: "P2P send failed",
    retryable: true,
    source: "runtime",
    requestId,
    correlationId,
  };
}

export function resolveP2pNotificationStageFromIntentState(state: string | undefined): P2pNotificationStage {
  const normalized = state?.trim().toLowerCase() ?? "";

  if (normalized === "settled" || normalized === "completed") {
    return "completed";
  }

  if (normalized === "failed" || normalized === "reversed") {
    return "failed";
  }

  if (normalized === "authorized" || normalized === "executing" || normalized === "processing") {
    return "processing";
  }

  return "initiated";
}

function toEpoch(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isInRange(timestamp: string, from?: string, to?: string): boolean {
  const value = toEpoch(timestamp);
  if (value === 0) {
    return false;
  }

  const fromBoundary = from ? toEpoch(from.length === 10 ? `${from}T00:00:00.000Z` : from) : 0;
  const toBoundary = to ? toEpoch(to.length === 10 ? `${to}T23:59:59.999Z` : to) : Number.MAX_SAFE_INTEGER;

  return value >= fromBoundary && value <= toBoundary;
}

export function buildP2pHistoryRows(input: {
  payouts: PayoutDto[];
  invoices: InvoiceDto[];
  overview?: PayOverviewDto;
}): P2pActivityRow[] {
  const fromPayouts = input.payouts.map<P2pActivityRow>((item) => ({
    id: `p2p-send-${item.id}`,
    kind: "send",
    status: item.status,
    amountMinor: item.amountMinor,
    currency: item.currency,
    counterparty: redactIdentifier(item.destinationLabel, 4, 2),
    createdAt: item.createdAt,
    reference: item.id,
    source: "payouts",
  }));

  const fromInvoices = input.invoices.map<P2pActivityRow>((item) => ({
    id: `p2p-receive-${item.id}`,
    kind: "receive",
    status: item.status,
    amountMinor: item.amountMinor,
    currency: item.currency,
    counterparty: redactIdentifier(item.customerName, 4, 2),
    createdAt: item.issuedAt,
    reference: item.invoiceNumber,
    source: "invoices",
  }));

  const fromOverview =
    input.overview?.recentActivity
      .filter((item) => item.type === "payout" || item.type === "invoice")
      .map<P2pActivityRow>((item) => ({
        id: `p2p-overview-${item.id}`,
        kind: item.type === "payout" ? "send" : "receive",
        status: String(item.status),
        amountMinor: typeof item.amountMinor === "number" ? item.amountMinor : 0,
        currency: item.currency ?? "USD",
        counterparty: redactIdentifier(item.title, 4, 2),
        createdAt: item.createdAt,
        reference: item.id,
        source: "overview",
      })) ?? [];

  const deduped = new Map<string, P2pActivityRow>();
  for (const row of [...fromOverview, ...fromPayouts, ...fromInvoices]) {
    if (!deduped.has(row.reference)) {
      deduped.set(row.reference, row);
    }
  }

  return [...deduped.values()].sort((left, right) => toEpoch(right.createdAt) - toEpoch(left.createdAt));
}

export function filterP2pActivityRows(rows: readonly P2pActivityRow[], filters: P2pActivityFilters): P2pActivityRow[] {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const status = filters.status?.trim().toUpperCase();

  return rows.filter((row) => {
    if (status && status !== "ALL" && row.status.toUpperCase() !== status) {
      return false;
    }

    if (!isInRange(row.createdAt, filters.from, filters.to)) {
      return false;
    }

    if (search.length > 0) {
      const haystack = `${row.reference} ${row.counterparty} ${row.kind} ${row.status}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });
}
