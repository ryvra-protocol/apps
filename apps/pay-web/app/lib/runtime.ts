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

export function createPayRuntimeContext(scope: string): PayRuntimeContext {
  const config = loadPayConfig(process.env);
  const logger = createConsoleLogger(scope);
  const authGuard = createStubAuthGuard([Role.Member, Role.Admin]);
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
