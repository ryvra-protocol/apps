import { createApiClient, createMockTransport } from "@ryvra/api-client";
import { createStubAuthGuard, Role, type Session } from "@ryvra/auth";
import { buildDeepLink, loadPointsTasksConfig, parseDeepLink } from "@ryvra/config";
import type { ConversionPreviewDto } from "@ryvra/domain-tokenomics";
import { createConsoleLogger } from "@ryvra/observability";
import { Button, Card, DataTable, Section, themeTokens } from "@ryvra/ui";

interface PointsTasksHomePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function hasContextParams(value: ReturnType<typeof parseDeepLink>): boolean {
  return Object.values(value.params).some((param) => typeof param === "string" && param.length > 0);
}

export default async function PointsTasksHomePage({ searchParams }: PointsTasksHomePageProps) {
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
  const deepLinkContext = parseDeepLink(searchParams);
  const contextAvailable = hasContextParams(deepLinkContext);

  const crossAppLinks = [
    {
      label: "Open invoice queue in Pay",
      href: buildDeepLink({
        product: "pay",
        path: "/invoices",
        ref: "points",
        entity: "task",
        id: "task-reward-review",
        ctx: "source=points-overview",
      }),
    },
    {
      label: "Open positions watchlist in Markets",
      href: buildDeepLink({
        product: "markets",
        path: "/positions",
        ref: "points",
        entity: "task",
        id: "task-risk-follow-up",
        ctx: "workflow=post-reward",
      }),
    },
  ];

  logger.info("Loaded points/tasks unified shell dashboard", {
    authorized: authDecision.allowed,
    eligible: eligibility.eligible,
    deepLinkValid: deepLinkContext.valid,
  });

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title="Points Overview" description="Unified shell entry for points, eligibility, and tasks.">
        <Card title="Access State">
          <p style={{ margin: 0 }}>Authorized: {String(authDecision.allowed)}</p>
          <p style={{ marginBottom: 0 }}>Eligibility: {String(eligibility.eligible)}</p>
        </Card>

        <Card title="Conversion Preview Boundary">
          <p style={{ marginTop: 0 }}>
            Preview: {preview.sourcePoints} points {"->"} {preview.expectedTokens} {preview.targetToken}.
          </p>
          <Button type="button">Queue Review Task</Button>
        </Card>

        <Card title="Conversion Snapshot">
          <DataTable
            columns={[
              { key: "sourcePoints", header: "Source Points" },
              { key: "conversionRate", header: "Rate" },
              { key: "expectedTokens", header: "Expected Tokens" },
            ]}
            rows={[preview]}
          />
        </Card>

        <Card title="Cross-App Workflow Links">
          <p style={{ marginTop: 0 }}>Jump into finance and markets views while preserving context.</p>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.5rem" }}>
            {crossAppLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} style={{ color: themeTokens.color.primary }}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Incoming Deep-Link Context">
          {deepLinkContext.valid ? (
            contextAvailable ? (
              <pre style={{ margin: 0 }}>{JSON.stringify(deepLinkContext.params, null, 2)}</pre>
            ) : (
              <p style={{ margin: 0 }}>No inbound deep-link context detected.</p>
            )
          ) : (
            <p style={{ margin: 0 }}>Deep-link parse error: {deepLinkContext.errors.join("; ")}</p>
          )}
        </Card>
      </Section>
    </section>
  );
}
