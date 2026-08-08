import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

export default async function MarketsStatusPage() {
  const runtime = createMarketsRuntimeContext("markets-web:status");

  runtime.logger.info("Rendered markets status route", {
    mode: runtime.config.mode,
    authorized: runtime.authDecision.allowed,
  });

  let diagnostics: Awaited<ReturnType<typeof runtime.marketsClient.getParityDiagnostics>> | null = null;
  let diagnosticsError: ReturnType<typeof captureMarketsPageError> | null = null;

  if (runtime.authDecision.allowed) {
    try {
      diagnostics = await runtime.marketsClient.getParityDiagnostics();
    } catch (error) {
      diagnosticsError = captureMarketsPageError(runtime.logger, "/status", error);
    }
  }

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Markets Status" description="Operational snapshot for Markets parity and connectivity wiring.">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ModeBadge mode={runtime.config.mode} />
        </div>

        {!runtime.authDecision.allowed ? (
          <UnauthorizedState />
        ) : diagnosticsError || !diagnostics ? (
          <ErrorState
            title="Unable to load Markets diagnostics"
            message={diagnosticsError?.message ?? "Diagnostics were unavailable."}
            source={diagnosticsError?.source ?? "runtime"}
            retryable={diagnosticsError?.retryable ?? true}
            retryLink={{ href: "/status", label: "Retry status" }}
          />
        ) : (
          <>
            <Card title="Service snapshot">
              <pre style={{ margin: 0 }}>
                {JSON.stringify(
                  {
                    app: runtime.config.appId,
                    mode: runtime.config.mode,
                    apiBaseUrl: runtime.config.apiBaseUrl,
                    configuredAccountId: runtime.defaultAccountId ?? null,
                    parity: {
                      sourceOfTruth: diagnostics.sourceOfTruth,
                      sourceOpenApiPath: diagnostics.sourceOpenApiPath,
                      sourceChangelogPath: diagnostics.sourceChangelogPath,
                      sourceOpenApiSha: diagnostics.sourceOpenApiSha,
                      sourceOpenApiCommit: diagnostics.sourceOpenApiCommit,
                      compatibilityVersion: diagnostics.compatibilityVersion,
                      parityCheckMarker: diagnostics.parityCheckMarker,
                    },
                    auth: diagnostics.auth,
                    accountScope: diagnostics.accountScope,
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
          </>
        )}
      </Section>
    </section>
  );
}
