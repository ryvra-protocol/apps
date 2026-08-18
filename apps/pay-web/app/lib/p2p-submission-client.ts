import { normalizeP2pErrorEnvelope, type P2pErrorEnvelope, type P2pSendValidated } from "./p2p";

interface P2pSubmissionResponsePayload {
  ok?: boolean;
  data?: {
    intentId?: string;
    state?: string;
    stage?: string;
    idempotencyKey?: string;
    requestId?: string;
    correlationId?: string;
  };
  error?: unknown;
}

export interface P2pSubmissionSuccessData {
  intentId?: string;
  state?: string;
  stage?: string;
  idempotencyKey?: string;
  requestId?: string;
  correlationId?: string;
}

export type ExecuteP2pSendSubmissionResult =
  | {
      ok: true;
      data: P2pSubmissionSuccessData;
      shouldRefresh: true;
    }
  | {
      ok: false;
      error: P2pErrorEnvelope;
      retry: {
        retryCtaEnabled: boolean;
        guidance: string;
      };
    };

interface ExecuteP2pSendSubmissionInput {
  transfer: P2pSendValidated;
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
const DEFAULT_RETRY_DELAY_MS = 240;

function parsePayload(value: unknown): P2pSubmissionResponsePayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as P2pSubmissionResponsePayload;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function shouldRetry(error: P2pErrorEnvelope): boolean {
  return error.retryable;
}

function resolveRetryPresentation(error: Pick<P2pErrorEnvelope, "retryable">): {
  retryCtaEnabled: boolean;
  guidance: string;
} {
  if (error.retryable) {
    return {
      retryCtaEnabled: true,
      guidance: "Retry is safe and will reuse the same idempotency key.",
    };
  }

  return {
    retryCtaEnabled: false,
    guidance: "Retry is not available automatically. Review details and start a new transfer.",
  };
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

export async function executeP2pSendSubmission(input: ExecuteP2pSendSubmissionInput): Promise<ExecuteP2pSendSubmissionResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const endpoint = input.endpoint ?? "/api/p2p/send";
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
          recipientHandle: input.transfer.recipientHandle,
          amountMinor: input.transfer.amountMinor,
          currency: input.transfer.currency,
          memo: input.transfer.memo,
          idempotencyKey: input.idempotencyKey,
        }),
        signal: abortController.signal,
      });

      const payload = parsePayload(await response.json().catch(() => null));
      if (!response.ok || !payload?.ok) {
        const error = normalizeP2pErrorEnvelope(payload?.error ?? payload ?? undefined, input.requestId, input.correlationId);
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
          ? normalizeP2pErrorEnvelope(
              {
                code: "request_timeout",
                message: `P2P request timed out after ${timeoutMs}ms.`,
                retryable: true,
                source: "runtime",
              },
              input.requestId,
              input.correlationId,
            )
          : isLikelyOfflineError(error)
            ? normalizeP2pErrorEnvelope(
                {
                  code: "network_offline",
                  message: "Network appears offline. Reconnect and retry transfer.",
                  retryable: true,
                  source: "runtime",
                },
                input.requestId,
                input.correlationId,
              )
            : normalizeP2pErrorEnvelope(error, input.requestId, input.correlationId);

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

  const exhausted = normalizeP2pErrorEnvelope(
    {
      code: "retry_exhausted",
      message: "P2P retries were exhausted. Try again.",
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
