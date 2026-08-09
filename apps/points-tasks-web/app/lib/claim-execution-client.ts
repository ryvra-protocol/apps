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
  maxRetries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 200;

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

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isLikelyOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && "onLine" in navigator && navigator.onLine === false) {
    return true;
  }

  if (!(error instanceof TypeError)) {
    return false;
  }

  return /network|fetch|offline|failed/i.test(error.message);
}

export async function executeDailyClaimAttempt(input: ExecuteDailyClaimAttemptInput): Promise<ExecuteDailyClaimAttemptResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const endpoint = input.endpoint ?? "/api/claims/daily";
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = Math.max(0, input.maxRetries ?? DEFAULT_MAX_RETRIES);
  const retryDelayMs = Math.max(0, input.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);

  let currentAttempt = input.attempt;

  for (let attemptIndex = 0; attemptIndex <= maxRetries; attemptIndex += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": currentAttempt.requestId,
          "x-correlation-id": currentAttempt.correlationId,
        },
        body: JSON.stringify({
          accountId: input.scope.accountId,
          ...(input.scope.userId ? { userId: input.scope.userId } : {}),
          ...(input.scope.workspaceId ? { workspaceId: input.scope.workspaceId } : {}),
          idempotencyKey: currentAttempt.idempotencyKey,
          ...(currentAttempt.intentId ? { intentId: currentAttempt.intentId } : {}),
        }),
        signal: abortController.signal,
      });

      const payload = parsePayload(await response.json().catch(() => null));
      currentAttempt = withIntentFromPayload(currentAttempt, payload);

      if (!response.ok || !payload?.ok) {
        const error = normalizeClaimExecutionErrorEnvelope(
          payload?.error ?? payload ?? undefined,
          currentAttempt.requestId,
          currentAttempt.correlationId,
        );
        const canRetry = attemptIndex < maxRetries && error.retryable;

        if (!canRetry) {
          return {
            ok: false,
            attempt: currentAttempt,
            error,
            retry: resolveClaimFailurePresentation(error),
          };
        }

        await sleep(retryDelayMs * (attemptIndex + 1));
        continue;
      }

      return {
        ok: true,
        attempt: currentAttempt,
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
            requestId: currentAttempt.requestId,
            correlationId: currentAttempt.correlationId,
          }
        : isLikelyOfflineError(error)
          ? {
              code: "network_offline",
              message: "Network appears offline. Reconnect and retry daily claim.",
              retryable: true,
              source: "runtime",
              requestId: currentAttempt.requestId,
              correlationId: currentAttempt.correlationId,
            }
          : normalizeClaimExecutionErrorEnvelope(error, currentAttempt.requestId, currentAttempt.correlationId);
      const canRetry = attemptIndex < maxRetries && normalized.retryable;

      if (!canRetry) {
        return {
          ok: false,
          attempt: currentAttempt,
          error: normalized,
          retry: resolveClaimFailurePresentation(normalized),
        };
      }

      await sleep(retryDelayMs * (attemptIndex + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  const exhausted = normalizeClaimExecutionErrorEnvelope(
    {
      code: "retry_exhausted",
      message: "Daily claim retries were exhausted. Try again.",
      retryable: true,
      source: "runtime",
    },
    currentAttempt.requestId,
    currentAttempt.correlationId,
  );

  return {
    ok: false,
    attempt: currentAttempt,
    error: exhausted,
    retry: resolveClaimFailurePresentation(exhausted),
  };
}
