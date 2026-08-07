import type { ApiError, ApiErrorSource } from "./types";

interface NormalizeApiErrorOptions {
  fallbackStatus?: number;
  source?: ApiErrorSource;
}

function inferRetryable(status?: number): boolean {
  if (typeof status !== "number") {
    return true;
  }

  return status >= 500 || status === 429;
}

function isApiErrorCandidate(error: unknown): error is {
  status?: number;
  code?: string;
  message?: string;
  retryable?: boolean;
  source?: ApiErrorSource;
  details?: unknown;
} {
  return typeof error === "object" && error !== null;
}

export function normalizeApiError(error: unknown, options: NormalizeApiErrorOptions = {}): ApiError {
  const fallbackStatus = options.fallbackStatus ?? 500;
  const fallbackSource = options.source ?? "unknown";

  if (isApiErrorCandidate(error) && typeof error.message === "string") {
    const status = typeof error.status === "number" ? error.status : undefined;
    return {
      code: typeof error.code === "string" ? error.code : "unknown_error",
      message: error.message,
      retryable: typeof error.retryable === "boolean" ? error.retryable : inferRetryable(status),
      source: error.source ?? fallbackSource,
      ...(typeof status === "number" ? { status } : {}),
      ...(typeof error.details === "undefined" ? {} : { details: error.details }),
    };
  }

  if (error instanceof TypeError) {
    return {
      status: fallbackStatus,
      code: "network_error",
      message: error.message,
      retryable: true,
      source: "runtime",
      details: error,
    };
  }

  if (error instanceof Error) {
    return {
      status: fallbackStatus,
      code: "runtime_error",
      message: error.message,
      retryable: false,
      source: "runtime",
      details: error,
    };
  }

  return {
    status: fallbackStatus,
    code: "unknown_error",
    message: "Unknown API error",
    retryable: false,
    source: fallbackSource,
    details: error,
  };
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly source: ApiErrorSource;
  readonly status: number | undefined;
  readonly details: unknown | undefined;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.code = error.code;
    this.retryable = error.retryable;
    this.source = error.source;
    this.status = error.status;
    this.details = error.details;
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      source: this.source,
      ...(typeof this.status === "number" ? { status: this.status } : {}),
      ...(typeof this.details === "undefined" ? {} : { details: this.details }),
    };
  }
}
