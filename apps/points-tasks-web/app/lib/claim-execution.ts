import { ApiClientError } from "@ryvra/api-client";
import { createIdempotencyKey, type PaymentIntent, type PaymentIntentState } from "@ryvra/domain-payments";

export interface DailyClaimScope {
  accountId: string;
  userId?: string;
  workspaceId?: string;
}

export interface ClaimExecutionAttempt {
  idempotencyKey: string;
  requestId: string;
  correlationId: string;
  intentId?: string;
}

export interface ClaimExecutionErrorEnvelope {
  code: string;
  message: string;
  retryable: boolean;
  source: string;
  status?: number;
  requestId: string;
  correlationId: string;
}

interface ClaimErrorCandidate {
  code?: unknown;
  message?: unknown;
  retryable?: unknown;
  source?: unknown;
  status?: unknown;
}

const dailyClaimReasonCode = "daily_points_claim";

/**
 * Idempotency strategy (Phase 12.5B):
 * - Each explicit user submit attempt gets a new base key (`points.daily_claim:<accountId>:<nonce>`).
 * - Retry of the same logical attempt reuses the exact same base key.
 * - Transition writes derive deterministic child keys from the same base key per target state.
 */
export function createDailyClaimIdempotencyKey(accountId: string, nonce?: string): string {
  return createIdempotencyKey({
    scope: "points.daily_claim",
    reference: accountId,
    nonce: nonce ?? createClientGeneratedId("nonce"),
  });
}

export function createClientGeneratedId(prefix = "claim"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createClaimExecutionAttempt(scope: DailyClaimScope, nonce?: string): ClaimExecutionAttempt {
  return {
    idempotencyKey: createDailyClaimIdempotencyKey(scope.accountId, nonce),
    requestId: createClientGeneratedId("req"),
    correlationId: createClientGeneratedId("corr"),
  };
}

export function buildClaimTransitionIdempotencyKey(idempotencyKey: string, toState: PaymentIntentState): string {
  return `${idempotencyKey}:transition:${toState}`;
}

export function buildDailyClaimIntent(scope: DailyClaimScope, attempt: Pick<ClaimExecutionAttempt, "idempotencyKey">, createdAt = new Date().toISOString()): PaymentIntent {
  const referenceId = `claim:daily:${scope.accountId}`;

  return {
    intent_id: createClientGeneratedId(`intent-${scope.accountId}`),
    reference_id: referenceId,
    idempotency_key: attempt.idempotencyKey,
    kind: "payout",
    sourceAccountId: `points-account:${scope.accountId}`,
    destinationAccountId: `points-claim:${scope.accountId}`,
    asset: {
      chain: "offchain",
      asset: "points",
      decimals: 0,
    },
    assetId: "points",
    amount: "1",
    reason_code: dailyClaimReasonCode,
    reason_codes: [dailyClaimReasonCode, "phase_12_5b_claim_execution"],
    metadata: {
      account_id: scope.accountId,
      ...(scope.userId ? { user_id: scope.userId } : {}),
      ...(scope.workspaceId ? { workspace_id: scope.workspaceId } : {}),
    },
    state: "created",
    created_at: createdAt,
  };
}

function fromCandidate(candidate: ClaimErrorCandidate | undefined, requestId: string, correlationId: string): ClaimExecutionErrorEnvelope {
  return {
    code: typeof candidate?.code === "string" ? candidate.code : "runtime_error",
    message: typeof candidate?.message === "string" ? candidate.message : "Daily claim execution failed",
    retryable: typeof candidate?.retryable === "boolean" ? candidate.retryable : true,
    source: typeof candidate?.source === "string" ? candidate.source : "runtime",
    ...(typeof candidate?.status === "number" ? { status: candidate.status } : {}),
    requestId,
    correlationId,
  };
}

export function normalizeClaimExecutionErrorEnvelope(
  error: unknown,
  requestId: string,
  correlationId: string,
): ClaimExecutionErrorEnvelope {
  if (error instanceof ApiClientError) {
    return fromCandidate(error.toApiError(), requestId, correlationId);
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as ClaimErrorCandidate & { error?: ClaimErrorCandidate };
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
    message: "Daily claim execution failed",
    retryable: true,
    source: "runtime",
    requestId,
    correlationId,
  };
}

export function resolveClaimFailurePresentation(error: Pick<ClaimExecutionErrorEnvelope, "retryable">): {
  retryCtaEnabled: boolean;
  guidance: string;
} {
  if (error.retryable) {
    return {
      retryCtaEnabled: true,
      guidance: "Retry is safe and will resume the same claim attempt.",
    };
  }

  return {
    retryCtaEnabled: false,
    guidance: "This claim attempt reached a terminal error. Resolve the issue and start a new attempt.",
  };
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

export const claimExecutionTransitions = ["authorized", "executing", "settled"] as const;

export const claimExecutionSyncTargets = [
  "daily_claim_status",
  "points_summary",
  "points_balance",
  "points_activity",
] as const;
