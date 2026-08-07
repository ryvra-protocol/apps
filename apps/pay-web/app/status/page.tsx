import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { UnauthorizedState } from "../components/page-states";
import { createPayRuntimeContext } from "../lib/runtime";

export default async function PayStatusPage() {
  const runtime = createPayRuntimeContext("pay-web:status");

  runtime.logger.info("Rendered pay status route", {
    mode: runtime.config.mode,
    authorized: runtime.authDecision.allowed,
  });

  const diagnostics = runtime.authDecision.allowed
    ? await runtime.payClient.getParityDiagnostics().catch((error) => ({
        mode: runtime.config.mode,
        baseUrl: runtime.config.apiBaseUrl,
        compatibilityVersion: "unknown",
        sourceOfTruth: "ryvra-protocol/pay",
        parityCheckMarker: "unavailable",
        connectivity: {
          checkedAt: new Date().toISOString(),
          path: process.env.RYVRA_PAY_CONNECTIVITY_PATH ?? "/health",
          ok: false,
          source: "runtime" as const,
          message: error instanceof Error ? error.message : "Unknown parity diagnostics error",
        },
      }))
    : null;

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Pay Status" description="Operational snapshot for Pay integration parity hardening.">
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
                  parity: {
                    sourceOfTruth: diagnostics?.sourceOfTruth,
                    compatibilityVersion: diagnostics?.compatibilityVersion,
                    parityCheckMarker: diagnostics?.parityCheckMarker,
                  },
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
