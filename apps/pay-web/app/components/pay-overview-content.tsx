import type { PayOverviewDto } from "@ryvra/domain-payments";
import type { RuntimeMode } from "@ryvra/config";
import {
  ActionToolbar,
  Card,
  DataTable,
  GettingStartedChecklist,
  InlineStatusIndicators,
  Section,
  UnifiedBalanceCard,
  themeTokens,
  type InsightWindowOption,
} from "@ryvra/ui";
import { formatCurrencyMinor, formatDateTime } from "../lib/format";
import { buildPayPortfolioInsights } from "../lib/portfolio-insights";
import type { PayUnifiedBalanceCardModel } from "../lib/unified-balance";
import { ModeBadge } from "./mode-badge";
import { PayPortfolioInsightsCard } from "./pay-portfolio-insights-card";
import { StatusBadge } from "./status-badge";

const historyUnavailableReason = "Historical windows are unavailable for pay overview snapshots.";
const windowOptions: InsightWindowOption[] = [
  {
    window: "24h",
    label: "24h",
    disabled: true,
    disabledReason: historyUnavailableReason,
  },
  {
    window: "7d",
    label: "7d",
    disabled: true,
    disabledReason: historyUnavailableReason,
  },
  {
    window: "30d",
    label: "30d",
    disabled: true,
    disabledReason: historyUnavailableReason,
  },
];

interface PayOverviewContentProps {
  title: string;
  description: string;
  route: string;
  mode: RuntimeMode;
  overview: PayOverviewDto;
  unifiedBalanceCard: PayUnifiedBalanceCardModel;
  accountId: string;
  workspaceId?: string;
  roleLabel: string;
  canOperate: boolean;
  operateDeniedReason?: string;
}

export function PayOverviewContent({
  title,
  description,
  route,
  mode,
  overview,
  unifiedBalanceCard,
  accountId,
  workspaceId,
  roleLabel,
  canOperate,
  operateDeniedReason,
}: PayOverviewContentProps) {
  const portfolioInsights = buildPayPortfolioInsights({
    overview,
    unifiedBalanceCard,
  });
  const scopeSearchParams = new URLSearchParams({
    account_id: accountId,
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
  });
  const scopeQuery = scopeSearchParams.toString();
  const withScope = (href: string): string => (scopeQuery.length > 0 ? `${href}?${scopeQuery}` : href);

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title={title} description={description}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
          <ModeBadge mode={mode} />
          <ActionToolbar
            ariaLabel="Pay key actions"
            items={[
              { id: "pay-send", label: "Send", href: withScope("/p2p/send"), variant: "primary" },
              { id: "pay-receive", label: "Receive", href: withScope("/p2p/receive") },
              { id: "pay-request", label: "Request", href: withScope("/p2p/receive?action=request") },
              {
                id: "pay-claim",
                label: "Claim",
                href: withScope("/payouts"),
                disabled: !canOperate,
                ...(!canOperate
                  ? {
                      disabledReason: operateDeniedReason ?? "Claim actions require operator access.",
                    }
                  : {}),
              },
              {
                id: "pay-merchant",
                label: "Merchant Dashboard",
                href: withScope("/merchant"),
              },
              { id: "pay-history", label: "View History", href: withScope("/p2p/history") },
              {
                id: "pay-export",
                label: "Export",
                disabled: true,
                disabledReason: "Export reports are deferred until pay reporting APIs are enabled.",
              },
            ]}
          />
        </div>

        <InlineStatusIndicators
          ariaLabel="Pay overview indicators"
          items={[
            { id: "pay-open-invoices", label: "Open invoices", value: String(overview.metrics.openInvoiceCount), tone: "brand" },
            { id: "pay-payouts-flight", label: "Payouts in flight", value: String(overview.metrics.payoutInFlightCount), tone: "neutral" },
            {
              id: "pay-mismatch-count",
              label: "Mismatches",
              value: String(overview.metrics.reconciliationMismatchCount),
              tone: overview.metrics.reconciliationMismatchCount > 0 ? "warning" : "success",
            },
          ]}
        />

        <div
          data-testid="pay-top-priority-zone"
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}
        >
          <div data-testid="pay-unified-balance-top-card">
            <UnifiedBalanceCard {...unifiedBalanceCard} />
          </div>
          <PayPortfolioInsightsCard model={portfolioInsights} windowOptions={windowOptions} />
          <GettingStartedChecklist
            appId="pay-web"
            route={route}
            scope={{
              accountId,
              ...(workspaceId ? { workspaceId } : {}),
            }}
            scopeHref={withScope(route)}
            unifiedBalanceHref={withScope("/overview")}
            firstActionHref={withScope("/payouts")}
            firstActionLabel="Complete first payout action"
            notificationsHref={withScope("/status")}
          />
        </div>

        <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Card title="Open invoices" tone="muted">
            <p style={{ margin: 0 }}>{overview.metrics.openInvoiceCount}</p>
          </Card>
          <Card title="Pending invoice amount" tone="muted">
            <p style={{ margin: 0 }}>
              {formatCurrencyMinor(overview.metrics.pendingInvoiceAmountMinor, overview.metrics.currency)}
            </p>
          </Card>
          <Card title="Payouts in flight" tone="muted">
            <p style={{ margin: 0 }}>{overview.metrics.payoutInFlightCount}</p>
          </Card>
          <Card title="Payout processing amount" tone="muted">
            <p style={{ margin: 0 }}>
              {formatCurrencyMinor(overview.metrics.payoutProcessingAmountMinor, overview.metrics.currency)}
            </p>
          </Card>
          <Card title="Reconciliation mismatches" tone="muted">
            <p style={{ margin: 0 }}>{overview.metrics.reconciliationMismatchCount}</p>
          </Card>
        </div>

        <Card title="Recent activity">
          <DataTable
            caption="Recent pay activity"
            columns={[
              { key: "type", header: "Type" },
              { key: "title", header: "Title" },
              {
                key: "status",
                header: "Status",
                render: (value) => <StatusBadge status={String(value)} />,
              },
              {
                key: "amountMinor",
                header: "Amount",
                render: (value, row) =>
                  typeof value === "number" && row.currency ? formatCurrencyMinor(value, row.currency) : "n/a",
              },
              {
                key: "createdAt",
                header: "Time",
                render: (value) => formatDateTime(String(value)),
              },
            ]}
            rows={overview.recentActivity}
            getRowKey={(row) => row.id}
            emptyMessage="No recent pay activity available."
          />
        </Card>

        <div data-testid="pay-snapshot-details-card">
          <Card title="Operational snapshot details" tone="muted">
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>
              Account reference: <strong>{accountId}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Access level: <strong>{roleLabel}</strong>
            </p>
          </Card>
        </div>
      </Section>
    </section>
  );
}
