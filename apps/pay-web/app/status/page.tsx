import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { capturePayPageError, createPayRuntimeContext } from "../lib/runtime";

export default async function PayStatusPage() {
  const runtime = createPayRuntimeContext("pay-web:status");

  runtime.logger.info("Rendered pay status route", {
    mode: runtime.config.mode,
    authorized: runtime.authDecision.allowed,
  });

  let diagnostics: Awaited<ReturnType<typeof runtime.payClient.getParityDiagnostics>> | null = null;
  let diagnosticsError: ReturnType<typeof capturePayPageError> | null = null;

  if (runtime.authDecision.allowed) {
    try {
      diagnostics = await runtime.payClient.getParityDiagnostics();
    } catch (error) {
      diagnosticsError = capturePayPageError(runtime.logger, "/status", error);
    }
  }

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Pay Status" description="Operational snapshot for Pay integration parity hardening.">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ModeBadge mode={runtime.config.mode} />
        </div>

        {!runtime.authDecision.allowed ? (
          <UnauthorizedState />
        ) : diagnosticsError || !diagnostics ? (
          <ErrorState
            title="Unable to load Pay diagnostics"
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
                    parity: {
                      sourceOfTruth: diagnostics.sourceOfTruth,
                      compatibilityVersion: diagnostics.compatibilityVersion,
                      parityCheckMarker: diagnostics.parityCheckMarker,
                    },
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
