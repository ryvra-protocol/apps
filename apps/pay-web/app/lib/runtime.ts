import { ApiClientError, createPayClient, type PayClient } from "@ryvra/api-client";
import { createStubAuthGuard, Role, type AuthDecision, type Session } from "@ryvra/auth";
import { loadPayConfig, type AppConfig } from "@ryvra/config";
import { createConsoleLogger, mapErrorToTaxonomy, type Logger } from "@ryvra/observability";

export interface PayRuntimeContext {
  config: AppConfig;
  logger: Logger;
  authDecision: AuthDecision;
  payClient: PayClient;
}

export interface PayUiError {
  code: string;
  message: string;
  retryable: boolean;
  source: string;
}

function getOptionalEnvValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function createPayRuntimeContext(scope: string): PayRuntimeContext {
  const config = loadPayConfig(process.env);
  const logger = createConsoleLogger(scope);
  const authGuard = createStubAuthGuard([Role.Member, Role.Admin]);
  const authToken = getOptionalEnvValue("RYVRA_PAY_AUTH_TOKEN");
  const authScheme = getOptionalEnvValue("RYVRA_PAY_AUTH_SCHEME");
  const requestIdHeader = getOptionalEnvValue("RYVRA_PAY_REQUEST_ID_HEADER");
  const correlationIdHeader = getOptionalEnvValue("RYVRA_PAY_CORRELATION_ID_HEADER");
  const idempotencyHeader = getOptionalEnvValue("RYVRA_PAY_IDEMPOTENCY_HEADER");
  const connectivityPath = getOptionalEnvValue("RYVRA_PAY_CONNECTIVITY_PATH");
  const payCompatibilityVersion = getOptionalEnvValue("RYVRA_PAY_COMPATIBILITY_VERSION");
  const payParityCheckMarker = getOptionalEnvValue("RYVRA_PAY_PARITY_CHECK_MARKER");
  const session: Session = {
    user: { id: "local-member", roles: [Role.Member] },
    issuedAt: new Date().toISOString(),
  };

  return {
    config,
    logger,
    authDecision: authGuard.authorize(session),
    payClient: createPayClient({
      mode: config.mode,
      baseUrl: config.apiBaseUrl,
      pay: {
        ...(authToken ? { authToken } : {}),
        ...(authScheme ? { authScheme } : {}),
        ...(requestIdHeader ? { requestIdHeader } : {}),
        ...(correlationIdHeader ? { correlationIdHeader } : {}),
        ...(idempotencyHeader ? { idempotencyHeader } : {}),
        ...(connectivityPath ? { connectivityPath } : {}),
      },
      ...(payCompatibilityVersion ? { payCompatibilityVersion } : {}),
      ...(payParityCheckMarker ? { payParityCheckMarker } : {}),
    }),
  };
}

export function capturePayPageError(logger: Logger, route: string, error: unknown): PayUiError {
  const taxonomy = mapErrorToTaxonomy(error);

  if (error instanceof ApiClientError) {
    const apiError = error.toApiError();
    logger.error("Pay page data fetch failed", {
      route,
      code: apiError.code,
      retryable: apiError.retryable,
      source: apiError.source,
      status: apiError.status,
      message: apiError.message,
    });

    return {
      code: apiError.code,
      message: apiError.message,
      retryable: apiError.retryable,
      source: apiError.source,
    };
  }

  logger.error("Pay page critical error", {
    route,
    code: taxonomy.code,
    retryable: taxonomy.retryable,
    source: "runtime",
    message: taxonomy.message,
  });

  return {
    code: taxonomy.code,
    message: taxonomy.message,
    retryable: taxonomy.retryable,
    source: "runtime",
  };
}
