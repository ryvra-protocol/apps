import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { UnauthorizedState } from "../components/page-states";
import { createMarketsRuntimeContext } from "../lib/runtime";

export default async function MarketsStatusPage() {
  const runtime = createMarketsRuntimeContext("markets-web:status");

  runtime.logger.info("Rendered markets status route", {
    mode: runtime.config.mode,
    authorized: runtime.authDecision.allowed,
  });

  const diagnostics = runtime.authDecision.allowed
    ? await runtime.marketsClient.getParityDiagnostics().catch((error) => ({
        mode: runtime.config.mode,
        baseUrl: runtime.config.apiBaseUrl,
        compatibilityVersion: "unknown",
        sourceOfTruth: "ryvra-protocol/markets",
        sourceOpenApiPath: "openapi/markets.openapi.yaml",
        sourceChangelogPath: "docs/api-contract-changelog.md",
        sourceOpenApiSha: "unknown",
        sourceOpenApiCommit: "unknown",
        parityCheckMarker: "unavailable",
        auth: {
          requiredForMarketsRoutes: runtime.config.mode === "http",
          hasAuthorization: false,
          requestIdHeader: "x-request-id",
          correlationIdHeader: "x-correlation-id",
        },
        accountScope: {
          ...(runtime.defaultAccountId ? { defaultAccountId: runtime.defaultAccountId } : {}),
          requiredEndpoints: [
            "/markets/orders",
            "/markets/orders/summary",
            "/markets/positions",
            "/markets/positions/summary",
            "/markets/overview",
          ] as const,
        },
        paginationPolicy: {
          preferredMode: "cursor" as const,
          deprecatedParam: "page" as const,
          deprecatedRemovalNotBefore: "2027-02-08" as const,
        },
        deprecatedFieldFallback: {
          canonicalField: "net_exposure_band" as const,
          fallbackField: "net_exposure_bucket" as const,
          fallbackRemovalNotBefore: "2027-02-08" as const,
        },
        connectivity: {
          checkedAt: new Date().toISOString(),
          path: runtime.config.connectivityPath ?? "/health",
          ok: false,
          source: "runtime" as const,
          message: error instanceof Error ? error.message : "Unknown parity diagnostics error",
        },
      }))
    : null;

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Markets Status" description="Operational snapshot for Markets parity and connectivity wiring.">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ModeBadge mode={runtime.config.mode} />
        </div>

        {!runtime.authDecision.allowed ? (
          <UnauthorizedState />
        ) : (
          <Card title="Service snapshot">
            <pre style={{ margin: 0 }}>
              {JSON.stringify(
                {
                  app: runtime.config.appId,
                  mode: runtime.config.mode,
                  apiBaseUrl: runtime.config.apiBaseUrl,
                  configuredAccountId: runtime.defaultAccountId ?? null,
                  parity: {
                    sourceOfTruth: diagnostics?.sourceOfTruth,
                    sourceOpenApiPath: diagnostics?.sourceOpenApiPath,
                    sourceChangelogPath: diagnostics?.sourceChangelogPath,
                    sourceOpenApiSha: diagnostics?.sourceOpenApiSha,
                    sourceOpenApiCommit: diagnostics?.sourceOpenApiCommit,
                    compatibilityVersion: diagnostics?.compatibilityVersion,
                    parityCheckMarker: diagnostics?.parityCheckMarker,
                  },
                  auth: diagnostics?.auth,
                  accountScope: diagnostics?.accountScope,
                  paginationPolicy: diagnostics?.paginationPolicy,
                  deprecatedFieldFallback: diagnostics?.deprecatedFieldFallback,
                  connectivity: diagnostics?.connectivity,
                  renderedAt: new Date().toISOString(),
                },
                null,
                2,
              )}
            </pre>
          </Card>
        )}
      </Section>
    </section>
  );
}
