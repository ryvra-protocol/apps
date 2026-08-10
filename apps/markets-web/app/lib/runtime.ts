import { ApiClientError, createApiClient, resolveUnifiedBalanceAccountId, type MarketsClient } from "@ryvra/api-client";
import {
  createStubAuthGuard,
  Role,
  resolveStubSessionFromEnv,
  resolveWorkspaceRoleView,
  roleClaimsFromSession,
  type AuthDecision,
  type WorkspaceRoleView,
} from "@ryvra/auth";
import { loadMarketsIntegrationConfig, type MarketsIntegrationConfig } from "@ryvra/config";
import { createConsoleLogger, mapErrorToTaxonomy, type Logger } from "@ryvra/observability";

export interface MarketsRuntimeContext {
  config: MarketsIntegrationConfig;
  logger: Logger;
  authDecision: AuthDecision;
  marketsClient: MarketsClient;
  sessionUserId: string;
  sessionRoleClaims: string[];
  workspaceRole: WorkspaceRoleView;
  defaultAccountId?: string;
}

export interface MarketsUiError {
  code: string;
  message: string;
  retryable: boolean;
  source: string;
}

function getOptionalEnvValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function createMarketsRuntimeContext(scope: string): MarketsRuntimeContext {
  const config = loadMarketsIntegrationConfig(process.env);
  const logger = createConsoleLogger(scope);
  const authGuard = createStubAuthGuard([Role.Support, Role.Member, Role.Admin]);
  const authToken = getOptionalEnvValue("RYVRA_MARKETS_AUTH_TOKEN");
  const authScheme = getOptionalEnvValue("RYVRA_MARKETS_AUTH_SCHEME");
  const requestIdHeader = getOptionalEnvValue("RYVRA_MARKETS_REQUEST_ID_HEADER");
  const correlationIdHeader = getOptionalEnvValue("RYVRA_MARKETS_CORRELATION_ID_HEADER");
  const defaultAccountId = resolveUnifiedBalanceAccountId({
    mode: config.mode,
    ...(config.accountId ? { configuredAccountId: config.accountId } : {}),
  });
  const session = resolveStubSessionFromEnv({
    defaultUserId: "user-core-1",
    defaultRoles: [Role.Member],
  });
  const sessionRoleClaims = roleClaimsFromSession(session);
  const workspaceRole = resolveWorkspaceRoleView(sessionRoleClaims);
  const authDecision = authGuard.authorize(session);

  return {
    config,
    logger,
    authDecision,
    marketsClient: createApiClient({
      mode: config.mode,
      baseUrl: config.apiBaseUrl,
      markets: {
        ...(authToken ? { authToken } : {}),
        ...(authScheme ? { authScheme } : {}),
        ...(requestIdHeader ? { requestIdHeader } : {}),
        ...(correlationIdHeader ? { correlationIdHeader } : {}),
        ...(config.connectivityPath ? { connectivityPath: config.connectivityPath } : {}),
        ...(defaultAccountId ? { defaultAccountId } : {}),
      },
      ...(config.compatibilityVersion ? { marketsCompatibilityVersion: config.compatibilityVersion } : {}),
      ...(config.parityCheckMarker ? { marketsParityCheckMarker: config.parityCheckMarker } : {}),
    }).markets,
    sessionUserId: session.user?.id ?? "unknown-user",
    sessionRoleClaims,
    workspaceRole,
    ...(defaultAccountId ? { defaultAccountId } : {}),
  };
}

export function captureMarketsPageError(logger: Logger, route: string, error: unknown): MarketsUiError {
  const taxonomy = mapErrorToTaxonomy(error);

  if (error instanceof ApiClientError) {
    const apiError = error.toApiError();
    logger.error("Markets page data fetch failed", {
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

  logger.error("Markets page critical error", {
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
