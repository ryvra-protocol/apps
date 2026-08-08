import {
  POINTS_TASKS_CONTRACT_SCHEMA_VERSION,
  POINTS_TASKS_PARITY_CHECK_MARKER,
  POINTS_TASKS_PROTOCOL_COMPATIBILITY_VERSION,
  pointsTasksAccountScopedRoutes,
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
        <Section title="Points & Tasks Status" description="Operational snapshot for Points/Tasks parity wiring.">
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
      sourceOfTruth: "ryvra-protocol/protocol-core",
      sourcePolicy: "ryvra-protocol/policy-risk",
      sourceProtocolDocPath: "docs/tokenomics-proof-of-transaction.md",
      sourceProtocolFaqPath: "docs/tokenomics-faq.md",
      sourceContractsEventsPath: "contracts/src/events.ts",
      sourceContractsIdsPath: "contracts/src/ids.ts",
      sourcePolicyDocPath: "docs/anti-abuse-policy.md",
      sourceContractSchemaVersion: POINTS_TASKS_CONTRACT_SCHEMA_VERSION,
      sourceOpenApiPublished: false as const,
      parityCheckMarker: POINTS_TASKS_PARITY_CHECK_MARKER,
      auth: {
        requiredForPointsTasksRoutes: runtime.config.mode === "http",
        statusRouteAuthOptional: true,
        hasAuthorization: false,
        requestIdHeader: "x-request-id",
        correlationIdHeader: "x-correlation-id",
      },
      accountScope: {
        ...(runtime.defaultAccountId ? { defaultAccountId: runtime.defaultAccountId } : {}),
        requiredField: "account_id" as const,
        requiredEndpoints: pointsTasksAccountScopedRoutes,
      },
      paginationPolicy: {
        preferredMode: "cursor" as const,
        deprecatedParam: "page" as const,
        deprecatedRemovalNotBefore: "2027-06-30" as const,
      },
      deprecatedFieldFallback: {
        pointsCanonicalField: "running_balance" as const,
        pointsFallbackField: "balance_after" as const,
        tasksCanonicalField: "progress_percent" as const,
        tasksFallbackField: "progress" as const,
        fallbackRemovalNotBefore: "2027-06-30" as const,
      },
      connectivity: {
        checkedAt: new Date().toISOString(),
        path: runtime.config.connectivityPath ?? "/points-tasks/status/health",
        ok: false,
        source: "runtime" as const,
        message: error instanceof Error ? error.message : "Unknown parity diagnostics error",
      },
    };
  });

  const contractSourcePaths = [
    `${diagnostics.sourceOfTruth}/${diagnostics.sourceProtocolDocPath}`,
    `${diagnostics.sourceOfTruth}/${diagnostics.sourceProtocolFaqPath}`,
    `${diagnostics.sourceOfTruth}/${diagnostics.sourceContractsEventsPath}`,
    `${diagnostics.sourceOfTruth}/${diagnostics.sourceContractsIdsPath}`,
    `${diagnostics.sourcePolicy}/${diagnostics.sourcePolicyDocPath}`,
  ];

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Points & Tasks Status" description="Operational snapshot for Points/Tasks parity wiring.">
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
                  parityCheckMarker: diagnostics.parityCheckMarker,
                  contractSchemaVersion: diagnostics.sourceContractSchemaVersion,
                  openApiPublished: diagnostics.sourceOpenApiPublished,
                },
                contractSourcePaths,
                authHeaderPolicy: {
                  ...diagnostics.auth,
                  idempotencyPolicy: "No write/transition endpoints in Phase 10 MVP surface.",
                  note: "No token values are exposed; only policy and presence flags.",
                },
                accountScopePolicy: diagnostics.accountScope,
                paginationPolicy: diagnostics.paginationPolicy,
                deprecatedFieldFallback: diagnostics.deprecatedFieldFallback,
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
