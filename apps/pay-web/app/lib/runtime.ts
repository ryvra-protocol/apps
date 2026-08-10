import {
  ApiClientError,
  createApiClient,
  resolveUnifiedBalanceAccountId,
  type MarketsClient,
  type PayClient,
} from "@ryvra/api-client";
import {
  createStubAuthGuard,
  Role,
  resolveStubSessionFromEnv,
  resolveWorkspaceRoleView,
  roleClaimsFromSession,
  type AuthDecision,
  type WorkspaceRoleView,
} from "@ryvra/auth";
import { loadPayConfig, type AppConfig } from "@ryvra/config";
import { createConsoleLogger, mapErrorToTaxonomy, type Logger } from "@ryvra/observability";

export interface PayRuntimeContext {
  config: AppConfig;
  logger: Logger;
  authDecision: AuthDecision;
  payClient: PayClient;
  marketsClient: MarketsClient;
  sessionUserId: string;
  sessionRoleClaims: string[];
  workspaceRole: WorkspaceRoleView;
  marketsAccountId?: string;
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
  const authGuard = createStubAuthGuard([Role.Support, Role.Member, Role.Admin]);
  const authToken = getOptionalEnvValue("RYVRA_PAY_AUTH_TOKEN");
  const authScheme = getOptionalEnvValue("RYVRA_PAY_AUTH_SCHEME");
  const requestIdHeader = getOptionalEnvValue("RYVRA_PAY_REQUEST_ID_HEADER");
  const correlationIdHeader = getOptionalEnvValue("RYVRA_PAY_CORRELATION_ID_HEADER");
  const idempotencyHeader = getOptionalEnvValue("RYVRA_PAY_IDEMPOTENCY_HEADER");
  const connectivityPath = getOptionalEnvValue("RYVRA_PAY_CONNECTIVITY_PATH");
  const payCompatibilityVersion = getOptionalEnvValue("RYVRA_PAY_COMPATIBILITY_VERSION");
  const payParityCheckMarker = getOptionalEnvValue("RYVRA_PAY_PARITY_CHECK_MARKER");
  const marketsAuthToken = getOptionalEnvValue("RYVRA_MARKETS_AUTH_TOKEN") ?? authToken;
  const marketsAuthScheme = getOptionalEnvValue("RYVRA_MARKETS_AUTH_SCHEME") ?? authScheme;
  const marketsRequestIdHeader = getOptionalEnvValue("RYVRA_MARKETS_REQUEST_ID_HEADER") ?? requestIdHeader;
  const marketsCorrelationIdHeader = getOptionalEnvValue("RYVRA_MARKETS_CORRELATION_ID_HEADER") ?? correlationIdHeader;
  const marketsConnectivityPath = getOptionalEnvValue("RYVRA_MARKETS_CONNECTIVITY_PATH");
  const configuredMarketsAccountId = getOptionalEnvValue("RYVRA_MARKETS_ACCOUNT_ID");
  const marketsAccountId = resolveUnifiedBalanceAccountId({
    mode: config.mode,
    ...(configuredMarketsAccountId ? { configuredAccountId: configuredMarketsAccountId } : {}),
  });
  const session = resolveStubSessionFromEnv({
    defaultUserId: "user-core-1",
    defaultRoles: [Role.Member],
  });
  const sessionRoleClaims = roleClaimsFromSession(session);
  const workspaceRole = resolveWorkspaceRoleView(sessionRoleClaims);
  const authDecision = authGuard.authorize(session);
  const apiClient = createApiClient({
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
    markets: {
      ...(marketsAuthToken ? { authToken: marketsAuthToken } : {}),
      ...(marketsAuthScheme ? { authScheme: marketsAuthScheme } : {}),
      ...(marketsRequestIdHeader ? { requestIdHeader: marketsRequestIdHeader } : {}),
      ...(marketsCorrelationIdHeader ? { correlationIdHeader: marketsCorrelationIdHeader } : {}),
      ...(marketsConnectivityPath ? { connectivityPath: marketsConnectivityPath } : {}),
      ...(marketsAccountId ? { defaultAccountId: marketsAccountId } : {}),
    },
    ...(payCompatibilityVersion ? { payCompatibilityVersion } : {}),
    ...(payParityCheckMarker ? { payParityCheckMarker } : {}),
  });

  return {
    config,
    logger,
    authDecision,
    payClient: apiClient.pay,
    marketsClient: apiClient.markets,
    sessionUserId: session.user?.id ?? "unknown-user",
    sessionRoleClaims,
    workspaceRole,
    ...(marketsAccountId ? { marketsAccountId } : {}),
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
