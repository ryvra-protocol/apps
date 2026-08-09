import { ApiClientError } from "@ryvra/api-client";
import type { RuntimeMode } from "@ryvra/config";
import { createIdempotencyKey, type PaymentIntent } from "@ryvra/domain-payments";

export type ClaimUiState = "idle" | "confirming" | "submitting" | "success" | "failure";

export type ClaimUiEvent = "START_CONFIRM" | "SUBMIT" | "SUCCESS" | "FAILURE" | "CANCEL" | "RESET";

export interface ClaimPayoutCandidate {
  id: string;
  amountMinor: number;
  currency: string;
  destinationLabel: string;
  status: string;
}

export interface ClaimAvailabilityInput {
  mode: RuntimeMode;
  hasEligiblePayout: boolean;
  hasAuthToken: boolean;
  endpointAvailable?: boolean;
}

export interface ClaimAvailability {
  enabled: boolean;
  reason?: string;
  status: "active" | "disabled-with-reason";
}

export interface ClaimRequestContext {
  idempotencyKey: string;
  requestId: string;
  correlationId: string;
}

export interface ClaimErrorEnvelope {
  code: string;
  message: string;
  retryable: boolean;
  source: string;
  status?: number;
  requestId: string;
  correlationId: string;
}

interface ErrorEnvelopeCandidate {
  code?: unknown;
  message?: unknown;
  retryable?: unknown;
  source?: unknown;
  status?: unknown;
}

const defaultClaimReason = "reward_claim";

export function transitionClaimUiState(current: ClaimUiState, event: ClaimUiEvent): ClaimUiState {
  if (event === "RESET") {
    return "idle";
  }

  if (event === "CANCEL") {
    return current === "submitting" ? current : "idle";
  }

  if (event === "START_CONFIRM") {
    if (current === "submitting") {
      return current;
    }

    return "confirming";
  }

  if (event === "SUBMIT") {
    return current === "confirming" || current === "failure" ? "submitting" : current;
  }

  if (event === "SUCCESS") {
    return current === "submitting" ? "success" : current;
  }

  if (event === "FAILURE") {
    return current === "submitting" ? "failure" : current;
  }

  return current;
}

export function createClaimSubmissionLock() {
  let inFlight = false;

  return {
    acquire(): boolean {
      if (inFlight) {
        return false;
      }

      inFlight = true;
      return true;
    },
    release(): void {
      inFlight = false;
    },
    isLocked(): boolean {
      return inFlight;
    },
  };
}

export function resolveClaimAvailability({
  mode,
  hasEligiblePayout,
  hasAuthToken,
  endpointAvailable = true,
}: ClaimAvailabilityInput): ClaimAvailability {
  if (!endpointAvailable) {
    return {
      enabled: false,
      status: "disabled-with-reason",
      reason: "Claim endpoint is unavailable in this runtime mode.",
    };
  }

  if (mode === "http" && !hasAuthToken) {
    return {
      enabled: false,
      status: "disabled-with-reason",
      reason: "Set RYVRA_PAY_AUTH_TOKEN in HTTP mode to enable claim submission.",
    };
  }

  if (!hasEligiblePayout) {
    return {
      enabled: false,
      status: "disabled-with-reason",
      reason: "No eligible payout is available to claim.",
    };
  }

  return {
    enabled: true,
    status: "active",
  };
}

export function resolveClaimConfirmationDelay(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : 450;
}

export function getFingerprintAriaLabel(state: ClaimUiState): string {
  if (state === "submitting") {
    return "Claim is being submitted";
  }

  if (state === "success") {
    return "Claim submitted successfully";
  }

  if (state === "failure") {
    return "Claim submission failed";
  }

  if (state === "confirming") {
    return "Claim confirmation in progress";
  }

  return "Fingerprint-style claim confirmation control";
}

export function createClientGeneratedId(prefix = "claim"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createClaimIdempotencyKey(payoutId: string, nonce?: string): string {
  return createIdempotencyKey({
    scope: "pay.claim",
    reference: payoutId,
    nonce: nonce ?? createClientGeneratedId("nonce"),
  });
}

export function buildClaimRequestContext(idempotencyKey: string, requestId: string, correlationId: string): ClaimRequestContext {
  return {
    idempotencyKey,
    requestId,
    correlationId,
  };
}

export function buildClaimIntent(
  payout: ClaimPayoutCandidate,
  requestContext: ClaimRequestContext,
  createdAt = new Date().toISOString(),
): PaymentIntent {
  const normalizedCurrency = payout.currency.trim().toLowerCase() || "usd";

  return {
    intent_id: createClientGeneratedId(`intent-${payout.id}`),
    reference_id: `claim:${payout.id}`,
    idempotency_key: requestContext.idempotencyKey,
    kind: "payout",
    sourceAccountId: "acct-pay-claims-ui",
    destinationAccountId: `payout-destination:${payout.id}`,
    asset: {
      chain: "fiat",
      asset: normalizedCurrency,
      decimals: 2,
    },
    assetId: normalizedCurrency,
    amount: (payout.amountMinor / 100).toFixed(2),
    reason_code: defaultClaimReason,
    reason_codes: [defaultClaimReason, "fingerprint_style_ui_confirmation"],
    metadata: {
      payout_id: payout.id,
      payout_status: payout.status,
      destination_label: payout.destinationLabel,
    },
    state: "created",
    created_at: createdAt,
  };
}

function fromCandidate(
  candidate: ErrorEnvelopeCandidate | undefined,
  requestId: string,
  correlationId: string,
): ClaimErrorEnvelope {
  return {
    code: typeof candidate?.code === "string" ? candidate.code : "runtime_error",
    message: typeof candidate?.message === "string" ? candidate.message : "Claim submission failed",
    retryable: typeof candidate?.retryable === "boolean" ? candidate.retryable : true,
    source: typeof candidate?.source === "string" ? candidate.source : "runtime",
    ...(typeof candidate?.status === "number" ? { status: candidate.status } : {}),
    requestId,
    correlationId,
  };
}

export function normalizeClaimErrorEnvelope(error: unknown, requestId: string, correlationId: string): ClaimErrorEnvelope {
  if (error instanceof ApiClientError) {
    return fromCandidate(error.toApiError(), requestId, correlationId);
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as { error?: ErrorEnvelopeCandidate } & ErrorEnvelopeCandidate;
    if (candidate.error) {
      return fromCandidate(candidate.error, requestId, correlationId);
    }

    return fromCandidate(candidate, requestId, correlationId);
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
    message: "Claim submission failed",
    retryable: true,
    source: "runtime",
    requestId,
    correlationId,
  };
}

export function formatClaimErrorMeta(error: ClaimErrorEnvelope): string {
  return `Source: ${error.source} • Retryable: ${error.retryable ? "Yes" : "No"}`;
}
