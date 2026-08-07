import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { UnauthorizedState } from "../components/page-states";
import { createPayRuntimeContext } from "../lib/runtime";

export default function PayStatusPage() {
  const runtime = createPayRuntimeContext("pay-web:status");

  runtime.logger.info("Rendered pay status route", {
    mode: runtime.config.mode,
    authorized: runtime.authDecision.allowed,
  });

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Pay Status" description="Operational snapshot for the pay MVP data wiring phase.">
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
                  healthy: true,
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
