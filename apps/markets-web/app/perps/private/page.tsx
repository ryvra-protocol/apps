import { Card, InlineStatusIndicators, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../../components/page-states";
import { createAgentGatewayClient } from "../../lib/agent-gateway-client";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../lib/runtime";
import { formatDateTime } from "../../lib/format";

interface PerpsPrivatePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function PerpsPrivatePage({ searchParams }: PerpsPrivatePageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:perps:private");
  if (!runtime.authDecision.allowed) {
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Perps private" description="Private perps account controls."><UnauthorizedState /></Section></section>;
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.defaultAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: accountId, workspace_id: workspaceId }).toString();

    const gateway = createAgentGatewayClient(runtime);
    const summary = await gateway.getPerpsPrivateSummary(accountId);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Perps private" description="Private account margin and collateral state.">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <ModeBadge mode={runtime.config.mode} />
            <div style={{ display: "flex", gap: themeTokens.spacing.md }}>
              <a href={`/perps/positions?${query}`}>Positions</a>
              <a href={`/perps/history?${query}`}>History</a>
            </div>
          </div>

          <InlineStatusIndicators
            ariaLabel="Perps private indicators"
            items={[
              { id: "acct", label: "Account", value: summary.accountId, tone: "brand" },
              { id: "margin", label: "Margin mode", value: summary.marginMode, tone: "neutral" },
              { id: "authority", label: "Authority", value: "Backend only", tone: "warning" },
            ]}
          />

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Card title="Collateral"><p style={{ margin: 0 }}>${summary.totalCollateralUsd.toLocaleString()}</p></Card>
            <Card title="Maintenance margin"><p style={{ margin: 0 }}>${summary.maintenanceMarginUsd.toLocaleString()}</p></Card>
            <Card title="Unrealized PnL"><p style={{ margin: 0 }}>${summary.unrealizedPnlUsd.toLocaleString()}</p></Card>
          </div>

          <Card title="Snapshot">
            <p style={{ margin: 0 }}>Updated: {formatDateTime(summary.updatedAt)}</p>
          </Card>
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/perps/private", error);
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Perps private" description="Private perps account controls."><ErrorState title="Unable to load private perps view" message={uiError.message} source={uiError.source} retryable={uiError.retryable} retryLink={{ href: "/perps/private", label: "Retry" }} /></Section></section>;
  }
}
