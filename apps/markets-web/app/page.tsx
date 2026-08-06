import { createApiClient, createMockTransport } from "@ryvra/api-client";
import { createStubAuthGuard, Role, type Session } from "@ryvra/auth";
import { loadMarketsConfig } from "@ryvra/config";
import type { ExecutionIntent } from "@ryvra/domain-markets";
import { createConsoleLogger } from "@ryvra/observability";
import { Button, Card, DataTable, Section } from "@ryvra/ui";

export default async function MarketsHomePage() {
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

  logger.info("Loaded markets scaffold page", {
    authorized: authDecision.allowed,
    runtimeMode: config.mode,
  });

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <Section
        title="Markets Platform"
        description="Scaffolded app shell wired to shared contracts for auth, config, API, and observability."
      >
        <Card title="Access State">
          <p>Authorized: {String(authDecision.allowed)}</p>
        </Card>

        <Card title="Execution Preview Boundary">
          <p>
            Preview order <strong>{previewOrder.id}</strong> for asset {previewOrder.assetId} ({previewOrder.side})
          </p>
          <Button type="button">Typed UI Primitive</Button>
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
      </Section>
    </main>
  );
}
