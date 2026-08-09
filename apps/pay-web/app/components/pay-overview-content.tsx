import type { PayOverviewDto } from "@ryvra/domain-payments";
import type { RuntimeMode } from "@ryvra/config";
import type { UnifiedBalanceCardProps } from "@ryvra/ui";
import { Card, DataTable, Section, UnifiedBalanceCard, themeTokens } from "@ryvra/ui";
import { formatCurrencyMinor, formatDateTime } from "../lib/format";
import { ModeBadge } from "./mode-badge";
import { StatusBadge } from "./status-badge";

interface PayOverviewContentProps {
  title: string;
  description: string;
  mode: RuntimeMode;
  overview: PayOverviewDto;
  unifiedBalanceCard: UnifiedBalanceCardProps;
}

export function PayOverviewContent({ title, description, mode, overview, unifiedBalanceCard }: PayOverviewContentProps) {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title={title} description={description}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ModeBadge mode={mode} />
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

        <UnifiedBalanceCard {...unifiedBalanceCard} />
      </Section>
    </section>
  );
}
