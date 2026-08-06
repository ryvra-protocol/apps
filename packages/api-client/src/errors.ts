import type { ApiError } from "./types";

export function normalizeApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const typedError = error as { status: number; message: string; code?: string; details?: unknown };
    return {
      status: typedError.status,
      code: typedError.code ?? "unknown_error",
      message: typedError.message,
      details: typedError.details,
    };
  }

  if (error instanceof Error) {
    return {
      status: fallbackStatus,
      code: "runtime_error",
      message: error.message,
      details: error,
    };
  }

  return {
    status: fallbackStatus,
    code: "unknown_error",
    message: "Unknown API error",
    details: error,
  };
}
