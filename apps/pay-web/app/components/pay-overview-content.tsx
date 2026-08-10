import type { PayOverviewDto } from "@ryvra/domain-payments";
import type { RuntimeMode } from "@ryvra/config";
import { Card, DataTable, Section, UnifiedBalanceCard, themeTokens, type InsightWindowOption } from "@ryvra/ui";
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
  mode: RuntimeMode;
  overview: PayOverviewDto;
  unifiedBalanceCard: PayUnifiedBalanceCardModel;
  accountId: string;
  workspaceId?: string;
  roleLabel: string;
}

export function PayOverviewContent({
  title,
  description,
  mode,
  overview,
  unifiedBalanceCard,
  accountId,
  workspaceId,
  roleLabel,
}: PayOverviewContentProps) {
  const portfolioInsights = buildPayPortfolioInsights({
    overview,
    unifiedBalanceCard,
  });

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title={title} description={description}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ModeBadge mode={mode} />
        </div>

        <div
          data-testid="pay-top-priority-zone"
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}
        >
          <div data-testid="pay-unified-balance-top-card">
            <UnifiedBalanceCard {...unifiedBalanceCard} />
          </div>
          <PayPortfolioInsightsCard model={portfolioInsights} windowOptions={windowOptions} />
        </div>

        <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Card title="Open invoices">
            <p style={{ margin: 0 }}>{overview.metrics.openInvoiceCount}</p>
          </Card>
          <Card title="Pending invoice amount">
            <p style={{ margin: 0 }}>
              {formatCurrencyMinor(overview.metrics.pendingInvoiceAmountMinor, overview.metrics.currency)}
            </p>
          </Card>
          <Card title="Payouts in flight">
            <p style={{ margin: 0 }}>{overview.metrics.payoutInFlightCount}</p>
          </Card>
          <Card title="Payout processing amount">
            <p style={{ margin: 0 }}>
              {formatCurrencyMinor(overview.metrics.payoutProcessingAmountMinor, overview.metrics.currency)}
            </p>
          </Card>
          <Card title="Reconciliation mismatches">
            <p style={{ margin: 0 }}>{overview.metrics.reconciliationMismatchCount}</p>
          </Card>
        </div>

        <Card title="Runtime context">
          <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>
            Account: <strong>{accountId}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Workspace: <strong>{workspaceId ?? "workspace-core-1"}</strong>
          </p>
          <p style={{ marginTop: themeTokens.spacing.xs, marginBottom: 0 }}>
            Role: <strong>{roleLabel}</strong>
          </p>
        </Card>

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
      </Section>
    </section>
  );
}
