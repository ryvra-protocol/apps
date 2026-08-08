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

interface MarketsErrorShape {
  code?: string | undefined;
  message?: string | undefined;
  retryable?: boolean | undefined;
  source?: ApiErrorSource | string | undefined;
  details?: unknown;
  decision?: string | undefined;
  reviewRequired?: boolean | undefined;
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

function extractMarketsErrorShape(error: unknown): MarketsErrorShape {
  const candidate = asObject(error);
  if (!candidate) {
    return {};
  }

  const nested = asObject(candidate.error);
  const reasonCodes = getStringArray(candidate.reason_codes) ?? getStringArray(nested?.reason_codes);
  const reasonCode = getString(candidate.reason_code) ?? getString(nested?.reason_code);
  const retryable =
    typeof candidate.retryable === "boolean"
      ? candidate.retryable
      : typeof nested?.retryable === "boolean"
        ? nested.retryable
        : undefined;
  const source = getString(candidate.source) ?? getString(nested?.source);
  const details = candidate.details ?? nested?.details;

  return {
    code: getString(candidate.code) ?? getString(nested?.code),
    message: getString(candidate.message) ?? getString(nested?.message),
    ...(typeof retryable === "boolean" ? { retryable } : {}),
    ...(source ? { source } : {}),
    ...(typeof details === "undefined" ? {} : { details }),
    decision: getString(candidate.decision) ?? getString(nested?.decision),
    reviewRequired:
      typeof candidate.review_required === "boolean"
        ? candidate.review_required
        : typeof nested?.review_required === "boolean"
          ? nested.review_required
          : undefined,
    reasonCodes: reasonCodes ?? (reasonCode ? [reasonCode] : undefined),
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

function hasReasonCode(reasonCodes: readonly string[], predicate: (reasonCode: string) => boolean): boolean {
  return reasonCodes.some((reasonCode) => predicate(reasonCode.trim().toLowerCase()));
}

function normalizeKnownMarketsError(
  marketsShape: MarketsErrorShape,
  status: number | undefined,
): Pick<ApiError, "code" | "message" | "retryable" | "status"> | null {
  const normalizedCode = marketsShape.code?.trim().toLowerCase();
  const normalizedMessage = marketsShape.message?.trim();
  const decision = marketsShape.decision?.trim().toUpperCase();
  const reasonCodes = marketsShape.reasonCodes ?? [];

  if (
    decision === "DENY" ||
    includesText(normalizedCode, "policy_denied") ||
    hasReasonCode(reasonCodes, (reasonCode) => reasonCode.startsWith("policy_") && reasonCode !== "policy_review_required")
  ) {
    return {
      code: "markets_policy_denied",
      message: normalizedMessage ?? "Markets policy denied the operation",
      retryable: false,
      status: status ?? 403,
    };
  }

  if (
    decision === "REVIEW" ||
    marketsShape.reviewRequired === true ||
    includesText(normalizedCode, "review_required") ||
    hasReasonCode(reasonCodes, (reasonCode) => reasonCode === "policy_review_required")
  ) {
    return {
      code: "markets_policy_review_required",
      message: normalizedMessage ?? "Markets policy requires review",
      retryable: false,
      status: status ?? 409,
    };
  }

  if (
    includesText(normalizedCode, "route_rejected") ||
    hasReasonCode(reasonCodes, (reasonCode) => reasonCode.startsWith("route_"))
  ) {
    return {
      code: "markets_route_rejected",
      message: normalizedMessage ?? "Execution route rejected the order",
      retryable: false,
      status: status ?? 422,
    };
  }

  if (
    includesText(normalizedCode, "quote_invalid") ||
    includesText(normalizedCode, "execution_guardrail_violation") ||
    includesText(normalizedMessage, "quote") ||
    includesText(normalizedMessage, "guardrail") ||
    hasReasonCode(reasonCodes, (reasonCode) => reasonCode === "quote_invalid" || reasonCode === "execution_guardrail_violation")
  ) {
    return {
      code: "markets_quote_invalid",
      message: normalizedMessage ?? "Markets quote or execution constraints failed",
      retryable: false,
      status: status ?? 422,
    };
  }

  if (
    includesText(normalizedCode, "unified_asset_") ||
    hasReasonCode(reasonCodes, (reasonCode) => reasonCode.startsWith("unified_asset_"))
  ) {
    const normalizedReasonCode = reasonCodes[0]?.trim().toLowerCase() ?? "unified_asset_validation_failed";
    return {
      code: normalizedReasonCode,
      message: normalizedMessage ?? "Unified asset normalization failed",
      retryable: false,
      status: status ?? 422,
    };
  }

  if (
    includesText(normalizedCode, "timeout") ||
    includesText(normalizedMessage, "timeout") ||
    hasReasonCode(reasonCodes, (reasonCode) => reasonCode.includes("timeout"))
  ) {
    return {
      code: "markets_dependency_timeout",
      message: normalizedMessage ?? "Markets dependency timeout",
      retryable: true,
      status: status ?? 504,
    };
  }

  if (
    includesText(normalizedCode, "execution_dependency_failed") ||
    includesText(normalizedMessage, "dependency failed") ||
    hasReasonCode(reasonCodes, (reasonCode) => reasonCode === "execution_dependency_failed")
  ) {
    return {
      code: "markets_dependency_failed",
      message: normalizedMessage ?? "Markets dependency failure",
      retryable: true,
      status: status ?? 502,
    };
  }

  return null;
}

function normalizeCanonicalMarketsEnvelope(
  marketsShape: MarketsErrorShape,
): Pick<ApiError, "code" | "message" | "retryable" | "source" | "details"> | null {
  if (
    typeof marketsShape.code !== "string" ||
    typeof marketsShape.message !== "string" ||
    typeof marketsShape.retryable !== "boolean"
  ) {
    return null;
  }

  return {
    code: marketsShape.code,
    message: marketsShape.message,
    retryable: marketsShape.retryable,
    source:
      typeof marketsShape.source === "string" &&
      (marketsShape.source === "mock" ||
        marketsShape.source === "http" ||
        marketsShape.source === "runtime" ||
        marketsShape.source === "unknown" ||
        marketsShape.source === "markets-api" ||
        marketsShape.source === "policy-risk" ||
        marketsShape.source === "asset-registry" ||
        marketsShape.source === "execution-router" ||
        marketsShape.source === "ledger-settlement" ||
        marketsShape.source === "accounts-runtime")
        ? marketsShape.source
        : "unknown",
    ...(typeof marketsShape.details === "undefined" ? {} : { details: marketsShape.details }),
  };
}

export function normalizeApiError(error: unknown, options: NormalizeApiErrorOptions = {}): ApiError {
  const fallbackStatus = options.fallbackStatus ?? 500;
  const fallbackSource = options.source ?? "unknown";

  if (isApiErrorCandidate(error) && typeof error.message === "string") {
    const status = typeof error.status === "number" ? error.status : undefined;
    const marketsShape = extractMarketsErrorShape(error.details);
    const canonicalMarketsError = normalizeCanonicalMarketsEnvelope(marketsShape);
    if (canonicalMarketsError) {
      return {
        ...canonicalMarketsError,
        ...(typeof status === "number" ? { status } : {}),
      };
    }

    const knownMarketsError = normalizeKnownMarketsError(
      {
        ...marketsShape,
        code: marketsShape.code ?? error.code,
        message: marketsShape.message ?? error.message,
      },
      status,
    );
    const payShape = extractPayErrorShape(error.details);
    const knownPayError = normalizeKnownPayError(
      {
        ...payShape,
        code: payShape.code ?? error.code,
        message: payShape.message ?? error.message,
      },
      status,
    );
    const resolvedStatus = knownMarketsError?.status ?? knownPayError?.status ?? status;

    return {
      code: knownMarketsError?.code ?? knownPayError?.code ?? (typeof error.code === "string" ? error.code : "unknown_error"),
      message: knownMarketsError?.message ?? knownPayError?.message ?? (payShape.message ?? error.message),
      retryable:
        knownMarketsError?.retryable ??
        knownPayError?.retryable ??
        (typeof error.retryable === "boolean" ? error.retryable : inferRetryable(status)),
      source: error.source ?? fallbackSource,
      ...(typeof resolvedStatus === "number" ? { status: resolvedStatus } : {}),
      ...(typeof error.details === "undefined" ? {} : { details: error.details }),
    };
  }

  if (isApiErrorCandidate(error)) {
    const marketsShape = extractMarketsErrorShape(error);
    const canonicalMarketsError = normalizeCanonicalMarketsEnvelope(marketsShape);
    if (canonicalMarketsError) {
      return {
        ...canonicalMarketsError,
        source: canonicalMarketsError.source === "unknown" ? fallbackSource : canonicalMarketsError.source,
        ...(typeof options.fallbackStatus === "number" ? { status: options.fallbackStatus } : {}),
      };
    }

    const knownMarketsError = normalizeKnownMarketsError(marketsShape, options.fallbackStatus);

    if (knownMarketsError) {
      return {
        code: knownMarketsError.code,
        message: knownMarketsError.message,
        retryable: knownMarketsError.retryable,
        source: fallbackSource,
        ...(typeof knownMarketsError.status === "number" ? { status: knownMarketsError.status } : {}),
        details: error,
      };
    }

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
