import { createApiClient, createMockTransport } from "@ryvra/api-client";
import { createStubAuthGuard, Role, type Session } from "@ryvra/auth";
import { buildDeepLink, loadMarketsConfig, parseDeepLink } from "@ryvra/config";
import type { ExecutionIntent } from "@ryvra/domain-markets";
import { createConsoleLogger } from "@ryvra/observability";
import { Button, Card, DataTable, Section, themeTokens } from "@ryvra/ui";

interface MarketsHomePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function hasContextParams(value: ReturnType<typeof parseDeepLink>): boolean {
  return Object.values(value.params).some((param) => typeof param === "string" && param.length > 0);
}

export default async function MarketsHomePage({ searchParams }: MarketsHomePageProps) {
  const config = loadMarketsConfig(process.env);
  const logger = createConsoleLogger("markets-web");
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

  const assets = await api.markets.listAssets();
  const intent: ExecutionIntent = {
    assetId: assets[0]?.id ?? "asset-btc-usd",
    side: "BUY",
    quantity: 1,
  };
  const previewOrder = await api.markets.previewExecution(intent);
  const deepLinkContext = parseDeepLink(searchParams);
  const contextAvailable = hasContextParams(deepLinkContext);

  const crossAppLinks = [
    {
      label: "Open linked invoice in Pay",
      href: buildDeepLink({
        product: "pay",
        path: "/invoices",
        ref: "markets",
        entity: "order",
        id: previewOrder.id,
        ctx: "from=markets-dashboard",
      }),
    },
    {
      label: "Review reward activity in Points",
      href: buildDeepLink({
        product: "points",
        path: "/activity",
        ref: "markets",
        entity: "order",
        id: previewOrder.id,
        ctx: "campaign=maker-liquidity",
      }),
    },
  ];

  logger.info("Loaded markets unified shell dashboard", {
    authorized: authDecision.allowed,
    runtimeMode: config.mode,
    deepLinkValid: deepLinkContext.valid,
  });

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section
        title="Markets Dashboard"
        description="Unified shell entry for market operations with cross-app context handoff."
      >
        <Card title="Access State">
          <p style={{ margin: 0 }}>Authorized: {String(authDecision.allowed)}</p>
          <p style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>Runtime mode: {config.mode}</p>
        </Card>

        <Card title="Execution Preview Boundary">
          <p style={{ marginTop: 0 }}>
            Preview order <strong>{previewOrder.id}</strong> for asset {previewOrder.assetId} ({previewOrder.side}).
          </p>
          <Button type="button">Create Conditional Alert</Button>
        </Card>

        <Card title="Assets Boundary">
          <DataTable
            columns={[
              { key: "symbol", header: "Symbol" },
              { key: "name", header: "Name" },
            ]}
            rows={assets}
          />
        </Card>

        <Card title="Cross-App Workflow Links">
          <p style={{ marginTop: 0 }}>Route into related workstreams while preserving context (`ref/entity/id/ctx`).</p>
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
