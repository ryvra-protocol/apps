import { DataTable, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../../components/page-states";
import { createAgentGatewayClient, type PerpsPositionRow } from "../../lib/agent-gateway-client";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../lib/runtime";
import { formatDateTime } from "../../lib/format";

interface PerpsPositionsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function PerpsPositionsPage({ searchParams }: PerpsPositionsPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:perps:positions");
  if (!runtime.authDecision.allowed) {
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Perps positions" description="Private perps position view."><UnauthorizedState /></Section></section>;
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.defaultAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: accountId, workspace_id: workspaceId }).toString();
    const gateway = createAgentGatewayClient(runtime);
    const rows = await gateway.listPerpsPositions(accountId);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Perps positions" description="Open private derivatives positions for the selected account.">
          <div style={{ display: "flex", justifyContent: "space-between" }}><ModeBadge mode={runtime.config.mode} /><a href={`/perps/private?${query}`}>Back to private summary</a></div>
          <DataTable<PerpsPositionRow>
            caption="Perps positions"
            rows={rows}
            getRowKey={(row) => row.id}
            emptyMessage="No private perps positions returned."
            columns={[
              { key: "symbol", header: "Symbol" },
              { key: "side", header: "Side" },
              { key: "size", header: "Size" },
              { key: "entryPrice", header: "Entry" },
              { key: "markPrice", header: "Mark" },
              { key: "leverage", header: "Leverage" },
              { key: "liquidationPrice", header: "Liq. price" },
              { key: "pnlUsd", header: "PnL" },
              { key: "updatedAt", header: "Updated", render: (value) => formatDateTime(String(value)) },
            ]}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/perps/positions", error);
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Perps positions" description="Private perps position view."><ErrorState title="Unable to load perps positions" message={uiError.message} source={uiError.source} retryable={uiError.retryable} retryLink={{ href: "/perps/positions", label: "Retry" }} /></Section></section>;
  }
}
