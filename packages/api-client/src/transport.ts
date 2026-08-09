import { normalizeApiError } from "./errors";
import type { ApiRequest, ApiResult, Transport } from "./types";

export interface FetchTransportOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  cacheTtlMs?: number;
  onRequestMetric?: (metric: FetchTransportRequestMetric) => void;
}

export interface FetchTransportRequestMetric {
  method: ApiRequest["method"];
  path: string;
  attemptCount: number;
  retryCount: number;
  totalDurationMs: number;
  fromCache: boolean;
  status: "success" | "error";
  finalStatusCode?: number;
  finalCode?: string;
}

function tryParseJson(payload: string): unknown {
  if (payload.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return payload;
  }
}

function extractHttpErrorMessage(statusText: string, payload: unknown): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (typeof payload === "object" && payload !== null) {
    const objectPayload = payload as Record<string, unknown>;
    if (typeof objectPayload.message === "string" && objectPayload.message.trim().length > 0) {
      return objectPayload.message;
    }

    if (
      typeof objectPayload.error === "object" &&
      objectPayload.error !== null &&
      typeof (objectPayload.error as Record<string, unknown>).message === "string"
    ) {
      const nestedMessage = (objectPayload.error as Record<string, unknown>).message as string;
      if (nestedMessage.trim().length > 0) {
        return nestedMessage;
      }
    }
  }

  return statusText || "Request failed";
}

interface TransportTimingDetails {
  attemptCount: number;
  retryCount: number;
  totalDurationMs: number;
  timeoutMs: number;
}

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 150;
const DEFAULT_MAX_RETRY_DELAY_MS = 1_000;
const DEFAULT_CACHE_TTL_MS = 750;

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isVolatileHeader(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.includes("request-id") || normalized.includes("correlation-id");
}

function resolveRequestUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

function normalizeMethod(method: ApiRequest["method"]): string {
  return method.toUpperCase();
}

function hasIdempotencyHeader(headers: Record<string, string>): boolean {
  return Object.entries(headers).some(([key, value]) => key.toLowerCase().includes("idempotency") && value.trim().length > 0);
}

function shouldRetryRequest(method: ApiRequest["method"], headers: Record<string, string>, retryable: boolean): boolean {
  if (!retryable) {
    return false;
  }

  const normalizedMethod = normalizeMethod(method);
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD") {
    return true;
  }

  if (normalizedMethod === "POST" || normalizedMethod === "PUT" || normalizedMethod === "PATCH" || normalizedMethod === "DELETE") {
    return hasIdempotencyHeader(headers);
  }

  return false;
}

function buildRequestCacheKey(url: string, request: ApiRequest): string {
  const normalizedHeaders = Object.entries(request.headers ?? {})
    .filter(([key, value]) => !isVolatileHeader(key) && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key.toLowerCase()}:${value.trim()}`)
    .join("|");

  return `${normalizeMethod(request.method)}:${url}:${normalizedHeaders}`;
}

function pruneExpiredEntries(cache: Map<string, { expiresAt: number; result: ApiResult<unknown> }>, now: number): void {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
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

function withTransportTimingDetails(
  error: ReturnType<typeof normalizeApiError>,
  timing: TransportTimingDetails,
): ReturnType<typeof normalizeApiError> {
  const baseDetails = typeof error.details === "object" && error.details !== null ? (error.details as Record<string, unknown>) : undefined;

  return {
    ...error,
    details: {
      ...(baseDetails ?? {}),
      transport: timing,
    },
  };
}

function computeRetryDelayMs(attemptIndex: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponentialDelay = Math.min(baseDelayMs * 2 ** attemptIndex, maxDelayMs);
  return Math.max(0, Math.round(exponentialDelay));
}

function emitMetric(options: FetchTransportOptions, metric: FetchTransportRequestMetric): void {
  if (!options.onRequestMetric) {
    return;
  }

  try {
    options.onRequestMetric(metric);
  } catch {
    // Observability callbacks must never break transport behavior.
  }
}

export function createFetchTransport(options: FetchTransportOptions): Transport {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  const maxRetryDelayMs = Math.max(retryDelayMs, options.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS);
  const cacheTtlMs = Math.max(0, options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);

  const responseCache = new Map<string, { expiresAt: number; result: ApiResult<unknown> }>();
  const inFlightGetRequests = new Map<string, Promise<ApiResult<unknown>>>();

  const executeAttempt = async (request: ApiRequest, mergedHeaders: Record<string, string>, requestUrl: string): Promise<ApiResult<unknown>> => {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const init: RequestInit = {
        method: request.method,
        headers: mergedHeaders,
        signal: abortController.signal,
      };

      if (request.body !== undefined) {
        init.body = JSON.stringify(request.body);
      }

      const response = await fetchImpl(requestUrl, init);
      const text = await response.text();
      const payload = tryParseJson(text);

      if (!response.ok) {
        return {
          ok: false,
          error: normalizeApiError(
            {
              status: response.status,
              code: "http_request_failed",
              message: extractHttpErrorMessage(response.statusText, payload),
              details: payload,
            },
            { fallbackStatus: response.status, source: "http" },
          ),
        };
      }

      return {
        ok: true,
        data: payload,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          ok: false,
          error: {
            status: 504,
            code: "request_timeout",
            message: `Request timed out after ${timeoutMs}ms`,
            retryable: true,
            source: "runtime",
          },
        };
      }

      if (isLikelyOfflineError(error)) {
        return {
          ok: false,
          error: {
            status: 503,
            code: "network_offline",
            message: "Network appears offline. Check connectivity and retry.",
            retryable: true,
            source: "runtime",
          },
        };
      }

      return {
        ok: false,
        error: normalizeApiError(error, { source: "http" }),
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  const executeWithRetries = async (request: ApiRequest, mergedHeaders: Record<string, string>, requestUrl: string): Promise<ApiResult<unknown>> => {
    const startedAt = Date.now();

    for (let attemptIndex = 0; attemptIndex <= maxRetries; attemptIndex += 1) {
      const result = await executeAttempt(request, mergedHeaders, requestUrl);

      if (result.ok) {
        const totalDurationMs = Date.now() - startedAt;
        emitMetric(options, {
          method: request.method,
          path: request.path,
          attemptCount: attemptIndex + 1,
          retryCount: attemptIndex,
          totalDurationMs,
          fromCache: false,
          status: "success",
        });

        return result;
      }

      const shouldRetry =
        attemptIndex < maxRetries && shouldRetryRequest(request.method, mergedHeaders, result.error.retryable);
      if (!shouldRetry) {
        const totalDurationMs = Date.now() - startedAt;
        const finalError = withTransportTimingDetails(result.error, {
          attemptCount: attemptIndex + 1,
          retryCount: attemptIndex,
          totalDurationMs,
          timeoutMs,
        });

        emitMetric(options, {
          method: request.method,
          path: request.path,
          attemptCount: attemptIndex + 1,
          retryCount: attemptIndex,
          totalDurationMs,
          fromCache: false,
          status: "error",
          ...(typeof finalError.status === "number" ? { finalStatusCode: finalError.status } : {}),
          finalCode: finalError.code,
        });

        return {
          ok: false,
          error: finalError,
        };
      }

      await sleep(computeRetryDelayMs(attemptIndex, retryDelayMs, maxRetryDelayMs));
    }

    return {
      ok: false,
      error: normalizeApiError(
        {
          code: "retry_exhausted",
          message: "Request retries were exhausted",
          retryable: true,
          source: "runtime",
          status: 503,
        },
        { fallbackStatus: 503, source: "runtime" },
      ),
    };
  };

  return {
    async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
      const mergedHeaders = {
        "content-type": "application/json",
        ...options.defaultHeaders,
        ...request.headers,
      };
      const requestWithHeaders: ApiRequest = {
        ...request,
        headers: mergedHeaders,
      };
      const requestUrl = resolveRequestUrl(options.baseUrl, request.path);
      const method = normalizeMethod(request.method);
      const isGetRequest = method === "GET";
      const cacheEnabled = isGetRequest && cacheTtlMs > 0;

      const executeNetworkRequest = async (): Promise<ApiResult<T>> => {
        const result = (await executeWithRetries(requestWithHeaders, mergedHeaders, requestUrl)) as ApiResult<T>;
        if (method !== "GET") {
          responseCache.clear();
        }
        return result;
      };

      if (!cacheEnabled) {
        return executeNetworkRequest();
      }

      const cacheKey = buildRequestCacheKey(requestUrl, requestWithHeaders);
      const now = Date.now();
      pruneExpiredEntries(responseCache, now);

      const cachedEntry = responseCache.get(cacheKey);
      if (cachedEntry && cachedEntry.expiresAt > now) {
        emitMetric(options, {
          method: request.method,
          path: request.path,
          attemptCount: 0,
          retryCount: 0,
          totalDurationMs: 0,
          fromCache: true,
          status: cachedEntry.result.ok ? "success" : "error",
          ...(cachedEntry.result.ok ? {} : { finalCode: cachedEntry.result.error.code }),
          ...(cachedEntry.result.ok || typeof cachedEntry.result.error.status !== "number"
            ? {}
            : { finalStatusCode: cachedEntry.result.error.status }),
        });
        return cachedEntry.result as ApiResult<T>;
      }

      const inFlight = inFlightGetRequests.get(cacheKey);
      if (inFlight) {
        const sharedResult = (await inFlight) as ApiResult<T>;
        emitMetric(options, {
          method: request.method,
          path: request.path,
          attemptCount: 0,
          retryCount: 0,
          totalDurationMs: 0,
          fromCache: true,
          status: sharedResult.ok ? "success" : "error",
          ...(sharedResult.ok ? {} : { finalCode: sharedResult.error.code }),
          ...(sharedResult.ok || typeof sharedResult.error.status !== "number"
            ? {}
            : { finalStatusCode: sharedResult.error.status }),
        });
        return sharedResult;
      }

      const requestPromise = executeNetworkRequest().then((result) => {
        if (result.ok) {
          responseCache.set(cacheKey, {
            expiresAt: Date.now() + cacheTtlMs,
            result: result as ApiResult<unknown>,
          });
        }
        return result as ApiResult<unknown>;
      });

      inFlightGetRequests.set(cacheKey, requestPromise);
      try {
        const result = (await requestPromise) as ApiResult<T>;
        return result;
      } finally {
        inFlightGetRequests.delete(cacheKey);
      }
    },
  };
}
