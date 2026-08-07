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

interface PayErrorShape {
  code?: string | undefined;
  message?: string | undefined;
  reasonCode?: string | undefined;
  reasonCodes?: string[] | undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const filtered = value.filter((entry): entry is string => typeof entry === "string");
  return filtered.length > 0 ? filtered : undefined;
}

function extractPayErrorShape(error: unknown): PayErrorShape {
  const candidate = asObject(error);
  if (!candidate) {
    return {};
  }

  const nested = asObject(candidate.error);

  return {
    code: getString(candidate.code) ?? getString(nested?.code),
    message: getString(candidate.message) ?? getString(nested?.message),
    reasonCode: getString(candidate.reason_code) ?? getString(nested?.reason_code),
    reasonCodes:
      getStringArray(candidate.reason_codes) ??
      getStringArray(nested?.reason_codes) ??
      (getString(candidate.reason_code) ? [getString(candidate.reason_code)!] : undefined),
  };
}

function includesText(candidate: string | undefined, text: string): boolean {
  return candidate?.toLowerCase().includes(text) ?? false;
}

function normalizeReasonCode(reasonCode: string): string {
  return reasonCode.trim().toLowerCase();
}

function normalizeKnownPayError(
  payShape: PayErrorShape,
  status: number | undefined,
): Pick<ApiError, "code" | "message" | "retryable" | "status"> | null {
  const normalizedCode = payShape.code?.trim().toLowerCase();
  const normalizedMessage = payShape.message?.trim();
  const reasonCode = payShape.reasonCode?.trim();
  const reasonCodes = payShape.reasonCodes ?? [];

  if (
    includesText(normalizedCode, "idempotency") ||
    includesText(normalizedMessage, "idempotency conflict") ||
    includesText(reasonCode, "idempotency")
  ) {
    return {
      code: "pay_idempotency_conflict",
      message: normalizedMessage ?? "Idempotency conflict",
      retryable: false,
      status: status ?? 409,
    };
  }

  if (
    includesText(normalizedCode, "invalid_payment_state_transition") ||
    includesText(normalizedMessage, "invalid payment state transition")
  ) {
    return {
      code: "pay_invalid_state_transition",
      message: normalizedMessage ?? "Invalid payment state transition",
      retryable: false,
      status: status ?? 422,
    };
  }

  if (
    includesText(normalizedCode, "policy_deny") ||
    includesText(normalizedMessage, "policy") ||
    reasonCodes.some((entry) => normalizeReasonCode(entry).includes("policy_deny"))
  ) {
    const normalizedReasonCode = reasonCodes[0] ? normalizeReasonCode(reasonCodes[0]) : "pay_policy_denied";
    return {
      code: normalizedReasonCode,
      message: normalizedMessage ?? "Policy denied pay operation",
      retryable: false,
      status: status ?? 403,
    };
  }

  if (
    includesText(normalizedMessage, " must ") ||
    includesText(normalizedMessage, " is required") ||
    includesText(normalizedMessage, "inconsistent") ||
    includesText(normalizedCode, "validation")
  ) {
    return {
      code: "pay_boundary_validation_error",
      message: normalizedMessage ?? "Pay boundary validation failed",
      retryable: false,
      status: status ?? 400,
    };
  }

  return null;
}

export function normalizeApiError(error: unknown, options: NormalizeApiErrorOptions = {}): ApiError {
  const fallbackStatus = options.fallbackStatus ?? 500;
  const fallbackSource = options.source ?? "unknown";

  if (isApiErrorCandidate(error) && typeof error.message === "string") {
    const status = typeof error.status === "number" ? error.status : undefined;
    const payShape = extractPayErrorShape(error.details);
    const knownPayError = normalizeKnownPayError(
      {
        ...payShape,
        code: payShape.code ?? error.code,
        message: payShape.message ?? error.message,
      },
      status,
    );
    const resolvedStatus = knownPayError?.status ?? status;

    return {
      code: knownPayError?.code ?? (typeof error.code === "string" ? error.code : "unknown_error"),
      message: knownPayError?.message ?? (payShape.message ?? error.message),
      retryable:
        knownPayError?.retryable ?? (typeof error.retryable === "boolean" ? error.retryable : inferRetryable(status)),
      source: error.source ?? fallbackSource,
      ...(typeof resolvedStatus === "number" ? { status: resolvedStatus } : {}),
      ...(typeof error.details === "undefined" ? {} : { details: error.details }),
    };
  }

  if (isApiErrorCandidate(error)) {
    const payShape = extractPayErrorShape(error);
    const knownPayError = normalizeKnownPayError(payShape, options.fallbackStatus);

    if (knownPayError) {
      return {
        code: knownPayError.code,
        message: knownPayError.message,
        retryable: knownPayError.retryable,
        source: fallbackSource,
        ...(typeof knownPayError.status === "number" ? { status: knownPayError.status } : {}),
        details: error,
      };
    }
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
