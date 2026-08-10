import type { MarketsOverviewDto } from "@ryvra/domain-markets";
import type { RuntimeMode } from "@ryvra/config";
import { Card, Section, UnifiedBalanceCard, themeTokens, type InsightWindowOption } from "@ryvra/ui";
import { MarketsPortfolioInsightsCard } from "./markets-portfolio-insights-card";
import { ModeBadge } from "./mode-badge";
import { StatusBadge } from "./status-badge";
import { formatDateTime } from "../lib/format";
import { buildMarketsPortfolioInsights } from "../lib/portfolio-insights";
import type { MarketsUnifiedBalanceCardModel } from "../lib/unified-balance";

const historyUnavailableReason = "Historical windows are unavailable for markets overview snapshots.";
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

interface MarketsOverviewContentProps {
  title: string;
  description: string;
  mode: RuntimeMode;
  overview: MarketsOverviewDto;
  unifiedBalanceCard: MarketsUnifiedBalanceCardModel;
  workspaceId?: string;
  roleLabel: string;
}

export function MarketsOverviewContent({
  title,
  description,
  mode,
  overview,
  unifiedBalanceCard,
  workspaceId,
  roleLabel,
}: MarketsOverviewContentProps) {
  const portfolioInsights = buildMarketsPortfolioInsights({
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
          data-testid="markets-top-priority-zone"
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}
        >
          <div data-testid="markets-unified-balance-top-card">
            <UnifiedBalanceCard {...unifiedBalanceCard} />
          </div>
          <MarketsPortfolioInsightsCard model={portfolioInsights} windowOptions={windowOptions} />
        </div>

        <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Card title="Total instruments">
            <p style={{ margin: 0 }}>{overview.instruments.totalInstruments}</p>
          </Card>
          <Card title="Tradable instruments">
            <p style={{ margin: 0 }}>{overview.instruments.tradableInstruments}</p>
          </Card>
          <Card title="Open orders">
            <p style={{ margin: 0 }}>{overview.orders.openOrders}</p>
          </Card>
          <Card title="Positions">
            <p style={{ margin: 0 }}>{overview.positions.totalPositions}</p>
          </Card>
          <Card title="Open positions">
            <p style={{ margin: 0 }}>{overview.positions.openPositions}</p>
          </Card>
          <Card title="Net exposure">
            <p style={{ margin: 0 }}>{overview.positions.netExposureBand}</p>
          </Card>
        </div>

        <Card title="Canonical contract snapshot">
          <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
            <p style={{ margin: 0 }}>
              Account: <strong>{overview.accountId}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Workspace: <strong>{workspaceId ?? "workspace-core-1"}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Role: <strong>{roleLabel}</strong>
            </p>
            <p style={{ margin: 0 }}>
              API version: <strong>{overview.apiVersion}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Health: <StatusBadge status={overview.healthStatus} />
            </p>
            <p style={{ margin: 0 }}>As of: {formatDateTime(overview.asOf)}</p>
          </div>
        </Card>
      </Section>
    </section>
  );
}
