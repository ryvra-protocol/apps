import { createApiClient, createMockTransport } from "@ryvra/api-client";
import { createStubAuthGuard, Role, type Session } from "@ryvra/auth";
import { loadPointsTasksConfig } from "@ryvra/config";
import type { ConversionPreviewDto } from "@ryvra/domain-tokenomics";
import { createConsoleLogger } from "@ryvra/observability";
import { Button, Card, DataTable, Section } from "@ryvra/ui";

export default async function PointsTasksHomePage() {
  const config = loadPointsTasksConfig(process.env);
  const logger = createConsoleLogger("points-tasks-web");
  const authGuard = createStubAuthGuard([Role.Member, Role.Admin]);
  const session: Session = {
    user: { id: "local-member", roles: [Role.Member] },
    issuedAt: new Date().toISOString(),
  };
  const authDecision = authGuard.authorize(session);

  const api = createApiClient({
    mode: config.mode,
    baseUrl: config.apiBaseUrl,
    transport: createMockTransport(),
  });

  const conversionInput: ConversionPreviewDto = {
    sourcePoints: 1200,
    conversionRate: 0.02,
    targetToken: "RYV",
    expectedTokens: 24,
  };

  const preview = await api.pointsTasks.previewConversion(conversionInput);
  const eligibility = await api.pointsTasks.getEligibility("local-member");

  logger.info("Loaded points/tasks scaffold page", {
    authorized: authDecision.allowed,
    eligible: eligibility.eligible,
  });

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <Section title="Points/Tasks Platform" description="Scaffolded rewards app shell using shared contracts.">
        <Card title="Access State">
          <p>Authorized: {String(authDecision.allowed)}</p>
          <p>Eligibility: {String(eligibility.eligible)}</p>
        </Card>

        <Card title="Conversion Preview Boundary">
          <p>
            Preview: {preview.sourcePoints} points {"->"} {preview.expectedTokens} {preview.targetToken}
          </p>
          <Button type="button">Shared UI Primitive</Button>
        </Card>

        <Card title="Conversion DTO Snapshot">
          <DataTable
            columns={[
              { key: "sourcePoints", header: "Source Points" },
              { key: "conversionRate", header: "Rate" },
              { key: "expectedTokens", header: "Expected Tokens" },
            ]}
            rows={[preview]}
          />
        </Card>
      </Section>
    </main>
  );
}
