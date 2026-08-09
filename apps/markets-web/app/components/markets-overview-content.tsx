import type { MarketsOverviewDto } from "@ryvra/domain-markets";
import type { RuntimeMode } from "@ryvra/config";
import type { UnifiedBalanceCardProps } from "@ryvra/ui";
import { Card, Section, UnifiedBalanceCard, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "./mode-badge";
import { StatusBadge } from "./status-badge";

interface MarketsOverviewContentProps {
  title: string;
  description: string;
  mode: RuntimeMode;
  overview: MarketsOverviewDto;
  unifiedBalanceCard: UnifiedBalanceCardProps;
}

export function MarketsOverviewContent({ title, description, mode, overview, unifiedBalanceCard }: MarketsOverviewContentProps) {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title={title} description={description}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ModeBadge mode={mode} />
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
              API version: <strong>{overview.apiVersion}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Health: <StatusBadge status={overview.healthStatus} />
            </p>
            <p style={{ margin: 0 }}>As of: {overview.asOf}</p>
          </div>
        </Card>

        <UnifiedBalanceCard {...unifiedBalanceCard} />
      </Section>
    </section>
  );
}
