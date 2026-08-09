import {
  claimExecutionSyncTargets,
  normalizeClaimExecutionErrorEnvelope,
  resolveClaimFailurePresentation,
  type ClaimExecutionAttempt,
  type ClaimExecutionErrorEnvelope,
  type DailyClaimScope,
} from "./claim-execution";

interface ClaimExecutionResponsePayload {
  ok?: boolean;
  data?: {
    intentId?: string;
    state?: string;
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
    failedTransition?: string;
    syncTargets?: string[];
  };
  error?: unknown;
}

export type ExecuteDailyClaimAttemptResult =
  | {
      ok: true;
      attempt: ClaimExecutionAttempt;
      state: string;
      shouldRefresh: true;
      syncTargets: readonly string[];
    }
  | {
      ok: false;
      attempt: ClaimExecutionAttempt;
      error: ClaimExecutionErrorEnvelope;
      retry: {
        retryCtaEnabled: boolean;
        guidance: string;
      };
    };

interface ExecuteDailyClaimAttemptInput {
  scope: DailyClaimScope;
  attempt: ClaimExecutionAttempt;
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function withIntentFromPayload(attempt: ClaimExecutionAttempt, payload: ClaimExecutionResponsePayload | null): ClaimExecutionAttempt {
  const intentId = payload?.data?.intentId?.trim();
  if (!intentId) {
    return attempt;
  }

  return {
    ...attempt,
    intentId,
  };
}

function parsePayload(value: unknown): ClaimExecutionResponsePayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as ClaimExecutionResponsePayload;
}

export async function executeDailyClaimAttempt(input: ExecuteDailyClaimAttemptInput): Promise<ExecuteDailyClaimAttemptResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const endpoint = input.endpoint ?? "/api/claims/daily";
  const timeoutMs = input.timeoutMs ?? 15_000;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": input.attempt.requestId,
        "x-correlation-id": input.attempt.correlationId,
      },
      body: JSON.stringify({
        accountId: input.scope.accountId,
        ...(input.scope.userId ? { userId: input.scope.userId } : {}),
        ...(input.scope.workspaceId ? { workspaceId: input.scope.workspaceId } : {}),
        idempotencyKey: input.attempt.idempotencyKey,
        ...(input.attempt.intentId ? { intentId: input.attempt.intentId } : {}),
      }),
      signal: abortController.signal,
    });

    const payload = parsePayload(await response.json().catch(() => null));
    const attempt = withIntentFromPayload(input.attempt, payload);

    if (!response.ok || !payload?.ok) {
      const error = normalizeClaimExecutionErrorEnvelope(payload?.error ?? payload ?? undefined, attempt.requestId, attempt.correlationId);
      return {
        ok: false,
        attempt,
        error,
        retry: resolveClaimFailurePresentation(error),
      };
    }

    return {
      ok: true,
      attempt,
      state: payload.data?.state ?? "settled",
      shouldRefresh: true,
      syncTargets: payload.data?.syncTargets && payload.data.syncTargets.length > 0 ? payload.data.syncTargets : claimExecutionSyncTargets,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const normalized = isAbort
      ? {
          code: "request_timeout",
          message: "Daily claim request timed out. Retry to continue safely.",
          retryable: true,
          source: "runtime",
          requestId: input.attempt.requestId,
          correlationId: input.attempt.correlationId,
        }
      : normalizeClaimExecutionErrorEnvelope(error, input.attempt.requestId, input.attempt.correlationId);

    return {
      ok: false,
      attempt: input.attempt,
      error: normalized,
      retry: resolveClaimFailurePresentation(normalized),
    };
  } finally {
    clearTimeout(timeout);
  }
}
