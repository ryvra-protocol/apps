import { DataTable, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../../components/page-states";
import { createAgentGatewayClient, type PerpsHistoryRow } from "../../lib/agent-gateway-client";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../lib/runtime";
import { formatDateTime } from "../../lib/format";

interface PerpsHistoryPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function PerpsHistoryPage({ searchParams }: PerpsHistoryPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:perps:history");
  if (!runtime.authDecision.allowed) {
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Perps history" description="Private perps execution history."><UnauthorizedState /></Section></section>;
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.defaultAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: accountId, workspace_id: workspaceId }).toString();
    const gateway = createAgentGatewayClient(runtime);
    const rows = await gateway.listPerpsHistory(accountId);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Perps history" description="Private perps intents, authorization, and execution outcomes.">
          <div style={{ display: "flex", justifyContent: "space-between" }}><ModeBadge mode={runtime.config.mode} /><a href={`/perps/private?${query}`}>Back to private summary</a></div>
          <DataTable<PerpsHistoryRow>
            caption="Perps history"
            rows={rows}
            getRowKey={(row) => row.id}
            emptyMessage="No perps history entries available."
            columns={[
              { key: "timestamp", header: "Time", render: (value) => formatDateTime(String(value)) },
              { key: "action", header: "Action" },
              { key: "symbol", header: "Symbol" },
              { key: "size", header: "Size" },
              { key: "price", header: "Price" },
              { key: "feeUsd", header: "Fee (USD)" },
              { key: "state", header: "State" },
              { key: "correlationId", header: "Correlation" },
            ]}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/perps/history", error);
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Perps history" description="Private perps execution history."><ErrorState title="Unable to load perps history" message={uiError.message} source={uiError.source} retryable={uiError.retryable} retryLink={{ href: "/perps/history", label: "Retry" }} /></Section></section>;
  }
}
