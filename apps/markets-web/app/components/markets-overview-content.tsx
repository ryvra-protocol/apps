import type { MarketsOverviewDto } from "@ryvra/domain-markets";
import type { RuntimeMode } from "@ryvra/config";
import { Card, DataTable, Section, themeTokens } from "@ryvra/ui";
import { formatDateTime } from "../lib/format";
import { ModeBadge } from "./mode-badge";
import { StatusBadge } from "./status-badge";

interface MarketsOverviewContentProps {
  title: string;
  description: string;
  mode: RuntimeMode;
  overview: MarketsOverviewDto;
}

export function MarketsOverviewContent({ title, description, mode, overview }: MarketsOverviewContentProps) {
  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title={title} description={description}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ModeBadge mode={mode} />
        </div>

        <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Card title="Total instruments">
            <p style={{ margin: 0 }}>{overview.metrics.totalInstruments}</p>
          </Card>
          <Card title="Active instruments">
            <p style={{ margin: 0 }}>{overview.metrics.activeInstruments}</p>
          </Card>
          <Card title="Open orders">
            <p style={{ margin: 0 }}>{overview.metrics.openOrders}</p>
          </Card>
          <Card title="Positions">
            <p style={{ margin: 0 }}>{overview.metrics.totalPositions}</p>
          </Card>
          <Card title="At-risk positions">
            <p style={{ margin: 0 }}>{overview.metrics.atRiskPositions}</p>
          </Card>
          <Card title="Net exposure">
            <p style={{ margin: 0 }}>{overview.metrics.netExposureBand}</p>
          </Card>
        </div>

        <Card title="Recent market activity">
          <DataTable
            caption="Recent markets activity"
            columns={[
              { key: "type", header: "Type" },
              { key: "title", header: "Title" },
              {
                key: "status",
                header: "Status",
                render: (value) => <StatusBadge status={String(value)} />,
              },
              { key: "symbol", header: "Symbol", render: (value) => (value ? String(value) : "n/a") },
              {
                key: "createdAt",
                header: "Time",
                render: (value) => formatDateTime(String(value)),
              },
            ]}
            rows={overview.recentActivity}
            getRowKey={(row) => row.id}
            emptyMessage="No recent markets activity available."
          />
        </Card>
      </Section>
    </section>
  );
}
