import { normalizeClaimErrorEnvelope, type ClaimErrorEnvelope, type ClaimPayoutCandidate } from "./claim-ux";

interface ClaimSubmissionResponsePayload {
  ok?: boolean;
  data?: {
    intentId?: string;
    state?: string;
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
  error?: unknown;
}

export interface ClaimSubmissionSuccessData {
  intentId?: string;
  state?: string;
  idempotencyKey?: string;
  requestId?: string;
  correlationId?: string;
}

export type ExecuteClaimSubmissionResult =
  | {
      ok: true;
      data: ClaimSubmissionSuccessData;
      shouldRefresh: true;
    }
  | {
      ok: false;
      error: ClaimErrorEnvelope;
      retry: {
        retryCtaEnabled: boolean;
        guidance: string;
      };
    };

interface ExecuteClaimSubmissionInput {
  payout: ClaimPayoutCandidate;
  idempotencyKey: string;
  requestId: string;
  correlationId: string;
  endpoint?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 200;

function parsePayload(value: unknown): ClaimSubmissionResponsePayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as ClaimSubmissionResponsePayload;
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

function resolveRetryPresentation(error: Pick<ClaimErrorEnvelope, "retryable">): {
  retryCtaEnabled: boolean;
  guidance: string;
} {
  if (error.retryable) {
    return {
      retryCtaEnabled: true,
      guidance: "Retry is safe and reuses the same claim idempotency key.",
    };
  }

  return {
    retryCtaEnabled: false,
    guidance: "Claim is not retryable automatically. Review the error details and start a new attempt if needed.",
  };
}

function shouldRetry(error: ClaimErrorEnvelope): boolean {
  return error.retryable;
}

export async function executeClaimSubmission(input: ExecuteClaimSubmissionInput): Promise<ExecuteClaimSubmissionResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const endpoint = input.endpoint ?? "/api/claims/payout";
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = Math.max(0, input.maxRetries ?? DEFAULT_MAX_RETRIES);
  const retryDelayMs = Math.max(0, input.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);

  for (let attemptIndex = 0; attemptIndex <= maxRetries; attemptIndex += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": input.requestId,
          "x-correlation-id": input.correlationId,
        },
        body: JSON.stringify({
          payout: input.payout,
          idempotencyKey: input.idempotencyKey,
        }),
        signal: abortController.signal,
      });

      const payload = parsePayload(await response.json().catch(() => null));
      if (!response.ok || !payload?.ok) {
        const error = normalizeClaimErrorEnvelope(payload?.error ?? payload ?? undefined, input.requestId, input.correlationId);
        const canRetry = attemptIndex < maxRetries && shouldRetry(error);

        if (!canRetry) {
          return {
            ok: false,
            error,
            retry: resolveRetryPresentation(error),
          };
        }

        await sleep(retryDelayMs * (attemptIndex + 1));
        continue;
      }

      return {
        ok: true,
        data: payload.data ?? {},
        shouldRefresh: true,
      };
    } catch (error) {
      const normalizedError =
        error instanceof Error && error.name === "AbortError"
          ? normalizeClaimErrorEnvelope(
              {
                code: "request_timeout",
                message: `Claim request timed out after ${timeoutMs}ms.`,
                retryable: true,
                source: "runtime",
              },
              input.requestId,
              input.correlationId,
            )
          : isLikelyOfflineError(error)
            ? normalizeClaimErrorEnvelope(
                {
                  code: "network_offline",
                  message: "Network appears offline. Reconnect and retry claim submission.",
                  retryable: true,
                  source: "runtime",
                },
                input.requestId,
                input.correlationId,
              )
            : normalizeClaimErrorEnvelope(error, input.requestId, input.correlationId);

      const canRetry = attemptIndex < maxRetries && shouldRetry(normalizedError);
      if (!canRetry) {
        return {
          ok: false,
          error: normalizedError,
          retry: resolveRetryPresentation(normalizedError),
        };
      }

      await sleep(retryDelayMs * (attemptIndex + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  const exhausted = normalizeClaimErrorEnvelope(
    {
      code: "retry_exhausted",
      message: "Claim retries were exhausted. Try again.",
      retryable: true,
      source: "runtime",
    },
    input.requestId,
    input.correlationId,
  );

  return {
    ok: false,
    error: exhausted,
    retry: resolveRetryPresentation(exhausted),
  };
}
