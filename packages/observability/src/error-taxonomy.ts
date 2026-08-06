export enum ErrorTaxonomyCode {
  Unknown = "unknown",
  Validation = "validation",
  Auth = "auth",
  Network = "network",
}

export interface TaxonomyError {
  code: ErrorTaxonomyCode;
  message: string;
  retryable: boolean;
  cause?: unknown;
}

export function mapErrorToTaxonomy(error: unknown): TaxonomyError {
  if (error instanceof TypeError) {
    return {
      code: ErrorTaxonomyCode.Network,
      message: error.message,
      retryable: true,
      cause: error,
    };
  }

  if (error instanceof Error && /auth|unauthorized|forbidden/i.test(error.message)) {
    return {
      code: ErrorTaxonomyCode.Auth,
      message: error.message,
      retryable: false,
      cause: error,
    };
  }

  if (error instanceof Error && /validation|invalid/i.test(error.message)) {
    return {
      code: ErrorTaxonomyCode.Validation,
      message: error.message,
      retryable: false,
      cause: error,
    };
  }

  return {
    code: ErrorTaxonomyCode.Unknown,
    message: error instanceof Error ? error.message : "Unknown error",
    retryable: false,
    cause: error,
  };
}
