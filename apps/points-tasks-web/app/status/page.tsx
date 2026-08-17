import {
  POINTS_TASKS_API_OPENAPI_AVAILABLE,
  POINTS_TASKS_CANONICAL_API_VERSION,
  POINTS_TASKS_DEPRECATED_PAGE_REMOVAL_NOT_BEFORE,
  POINTS_TASKS_PARITY_CHECK_MARKER,
  POINTS_TASKS_PROTOCOL_CHANGELOG_PATH,
  POINTS_TASKS_PROTOCOL_COMPATIBILITY_VERSION,
  POINTS_TASKS_PROTOCOL_OPENAPI_COMMIT,
  POINTS_TASKS_PROTOCOL_OPENAPI_PATH,
  POINTS_TASKS_PROTOCOL_OPENAPI_SHA,
  POINTS_TASKS_PROTOCOL_SOURCE,
  pointsTasksAccountScopedRoutes,
  pointsTasksAuthOptionalRoutes,
} from "@ryvra/api-client";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { createPointsTasksRuntimeContext } from "../lib/runtime";

export const dynamic = "force-dynamic";

export default async function PointsTasksStatusPage() {
  const runtime = createPointsTasksRuntimeContext("points-tasks-web:status");

  runtime.logger.info("Rendered points/tasks status route", {
    mode: runtime.config.mode,
    authorized: runtime.authDecision.allowed,
  });

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Ryvra Community Hub Status" description="Operational snapshot for Community Hub parity wiring.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const diagnostics = await runtime.pointsTasksClient.getParityDiagnostics().catch((error) => {
    runtime.logger.error("Failed to load points/tasks parity diagnostics", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      mode: runtime.config.mode,
      baseUrl: runtime.config.apiBaseUrl,
      compatibilityVersion: POINTS_TASKS_PROTOCOL_COMPATIBILITY_VERSION,
      sourceOfTruth: POINTS_TASKS_PROTOCOL_SOURCE,
      sourceOpenApiPath: POINTS_TASKS_PROTOCOL_OPENAPI_PATH,
      sourceChangelogPath: POINTS_TASKS_PROTOCOL_CHANGELOG_PATH,
      sourceOpenApiSha: POINTS_TASKS_PROTOCOL_OPENAPI_SHA,
      sourceOpenApiCommit: POINTS_TASKS_PROTOCOL_OPENAPI_COMMIT,
      canonicalApiVersion: POINTS_TASKS_CANONICAL_API_VERSION,
      sourceOpenApiPublished: POINTS_TASKS_API_OPENAPI_AVAILABLE,
      parityCheckMarker: POINTS_TASKS_PARITY_CHECK_MARKER,
      auth: {
        bearerRequiredByDefault: runtime.config.mode === "http",
        authOptionalRoutes: pointsTasksAuthOptionalRoutes,
        hasAuthorization: false,
        requestIdHeader: "x-request-id",
        correlationIdHeader: "x-correlation-id",
      },
      scope: {
        ...(runtime.defaultAccountId ? { defaultAccountId: runtime.defaultAccountId } : {}),
        requiredField: "account_id" as const,
        optionalFields: ["user_id", "workspace_id"] as const,
        requiredEndpoints: pointsTasksAccountScopedRoutes,
      },
      paginationPolicy: {
        preferredMode: "cursor" as const,
        deprecatedParam: "page" as const,
        deprecatedRemovalNotBefore: POINTS_TASKS_DEPRECATED_PAGE_REMOVAL_NOT_BEFORE,
      },
      connectivity: {
        checkedAt: new Date().toISOString(),
        path: runtime.config.connectivityPath ?? "/points-tasks/status",
        ok: false,
        source: "runtime" as const,
        message: error instanceof Error ? error.message : "Unknown parity diagnostics error",
      },
    };
  });

  const contractSourcePaths = [
    `${diagnostics.sourceOfTruth}/${diagnostics.sourceOpenApiPath}`,
    `${diagnostics.sourceOfTruth}/${diagnostics.sourceChangelogPath}`,
  ];

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Ryvra Community Hub Status" description="Operational snapshot for Community Hub parity wiring.">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
          <ModeBadge mode={runtime.config.mode} />
          <span style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
            Base URL: {runtime.config.apiBaseUrl}
          </span>
        </div>

        <Card title="Parity + connectivity snapshot">
          <pre style={{ margin: 0 }}>
            {JSON.stringify(
              {
                app: runtime.config.appId,
                mode: runtime.config.mode,
                apiBaseUrl: runtime.config.apiBaseUrl,
                configuredAccountId: runtime.defaultAccountId ?? null,
                parity: {
                  compatibilityVersion: diagnostics.compatibilityVersion,
                  canonicalApiVersion: diagnostics.canonicalApiVersion,
                  parityCheckMarker: diagnostics.parityCheckMarker,
                  openApiPublished: diagnostics.sourceOpenApiPublished,
                  openApiSha: diagnostics.sourceOpenApiSha,
                  openApiCommit: diagnostics.sourceOpenApiCommit,
                },
                contractSourcePaths,
                authHeaderPolicy: {
                  ...diagnostics.auth,
                  idempotencyPolicy: "No write/transition endpoints in canonical v1 surface.",
                  note: "No token values are exposed; only policy and presence flags.",
                },
                scopePolicy: diagnostics.scope,
                paginationPolicy: diagnostics.paginationPolicy,
                connectivity: diagnostics.connectivity,
                renderedAt: new Date().toISOString(),
              },
              null,
              2,
            )}
          </pre>
        </Card>

        {!diagnostics.connectivity.ok ? (
          <ErrorState
            title="Connectivity probe failed"
            message={diagnostics.connectivity.message}
            source={diagnostics.connectivity.source}
            retryable={false}
            retryLink={{ href: "/status", label: "Retry status" }}
          />
        ) : null}
      </Section>
    </section>
  );
}
