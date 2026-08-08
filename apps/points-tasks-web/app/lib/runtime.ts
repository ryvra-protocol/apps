import { ApiClientError, createApiClient, type PointsTasksClient } from "@ryvra/api-client";
import { createStubAuthGuard, Role, type AuthDecision, type Session } from "@ryvra/auth";
import { loadPointsTasksIntegrationConfig, type PointsTasksIntegrationConfig } from "@ryvra/config";
import { createConsoleLogger, mapErrorToTaxonomy, type Logger } from "@ryvra/observability";

export interface PointsTasksRuntimeContext {
  config: PointsTasksIntegrationConfig;
  logger: Logger;
  authDecision: AuthDecision;
  pointsTasksClient: PointsTasksClient;
  defaultAccountId?: string;
}

export interface PointsTasksUiError {
  code: string;
  message: string;
  retryable: boolean;
  source: string;
}

function getOptionalEnvValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function createPointsTasksRuntimeContext(scope: string): PointsTasksRuntimeContext {
  const config = loadPointsTasksIntegrationConfig(process.env);
  const logger = createConsoleLogger(scope);
  const authGuard = createStubAuthGuard([Role.Member, Role.Admin]);
  const authToken = getOptionalEnvValue("RYVRA_POINTS_TASKS_AUTH_TOKEN");
  const authScheme = getOptionalEnvValue("RYVRA_POINTS_TASKS_AUTH_SCHEME");
  const requestIdHeader = getOptionalEnvValue("RYVRA_POINTS_TASKS_REQUEST_ID_HEADER");
  const correlationIdHeader = getOptionalEnvValue("RYVRA_POINTS_TASKS_CORRELATION_ID_HEADER");
  const session: Session = {
    user: { id: "local-member", roles: [Role.Member] },
    issuedAt: new Date().toISOString(),
  };
  const defaultAccountId = config.accountId ?? (config.mode === "mock" ? "acct-core-1" : undefined);

  return {
    config,
    logger,
    authDecision: authGuard.authorize(session),
    pointsTasksClient: createApiClient({
      mode: config.mode,
      baseUrl: config.apiBaseUrl,
      pointsTasks: {
        ...(authToken ? { authToken } : {}),
        ...(authScheme ? { authScheme } : {}),
        ...(requestIdHeader ? { requestIdHeader } : {}),
        ...(correlationIdHeader ? { correlationIdHeader } : {}),
        ...(config.connectivityPath ? { connectivityPath: config.connectivityPath } : {}),
        ...(defaultAccountId ? { defaultAccountId } : {}),
      },
      ...(config.compatibilityVersion ? { pointsTasksCompatibilityVersion: config.compatibilityVersion } : {}),
      ...(config.parityCheckMarker ? { pointsTasksParityCheckMarker: config.parityCheckMarker } : {}),
    }).pointsTasks,
    ...(defaultAccountId ? { defaultAccountId } : {}),
  };
}

export function capturePointsTasksPageError(logger: Logger, route: string, error: unknown): PointsTasksUiError {
  const taxonomy = mapErrorToTaxonomy(error);

  if (error instanceof ApiClientError) {
    const apiError = error.toApiError();
    logger.error("Points/Tasks page data fetch failed", {
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

  logger.error("Points/Tasks page critical error", {
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
