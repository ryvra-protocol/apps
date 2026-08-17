import type { MarketsOverviewDto } from "@ryvra/domain-markets";
import type { RuntimeMode } from "@ryvra/config";
import {
  ActionToolbar,
  Card,
  GettingStartedChecklist,
  InlineStatusIndicators,
  Section,
  StatusBadge,
  UnifiedBalanceCard,
  themeTokens,
  type InsightWindowOption,
  type InlineIndicatorTone,
} from "@ryvra/ui";
import { MarketsPortfolioInsightsCard } from "./markets-portfolio-insights-card";
import { ModeBadge } from "./mode-badge";
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
  route: string;
  mode: RuntimeMode;
  overview: MarketsOverviewDto;
  unifiedBalanceCard: MarketsUnifiedBalanceCardModel;
  workspaceId?: string;
}

function resolveHealthTone(healthStatus: string): InlineIndicatorTone {
  const normalized = healthStatus.trim().toLowerCase();

  if (normalized.includes("healthy") || normalized.includes("ok")) {
    return "success";
  }

  if (normalized.includes("degraded") || normalized.includes("warning")) {
    return "warning";
  }

  if (normalized.includes("down") || normalized.includes("failed") || normalized.includes("error")) {
    return "danger";
  }

  return "neutral";
}

export function MarketsOverviewContent({
  title,
  description,
  route,
  mode,
  overview,
  unifiedBalanceCard,
  workspaceId,
}: MarketsOverviewContentProps) {
  const portfolioInsights = buildMarketsPortfolioInsights({
    overview,
    unifiedBalanceCard,
  });
  const scopeSearchParams = new URLSearchParams({
    account_id: overview.accountId,
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
  });
  const scopeQuery = scopeSearchParams.toString();
  const withScope = (href: string): string => (scopeQuery.length > 0 ? `${href}?${scopeQuery}` : href);

  const moduleCards = [
    {
      id: "spot",
      title: "Classified Spot",
      description: "High-liquidity spot routing for classified pairs and curated books.",
      ctaLabel: "Open Spot",
      href: withScope("/spot"),
      deferredReason: "Live spot execution is deferred until the classified matching backend is enabled.",
    },
    {
      id: "perps",
      title: "Perps Trading",
      description: "Perpetual strategy routing with margin health and liquidation awareness.",
      ctaLabel: "Open Perps",
      href: withScope("/perps"),
      deferredReason: "Perps order execution is deferred until derivatives routing is enabled.",
    },
    {
      id: "staking",
      title: "Staking",
      description: "Yield and lockup management with governance-aware staking plans.",
      ctaLabel: "Stake Now",
      href: withScope("/staking"),
      deferredReason: "Staking transactions are deferred until staking custody endpoints are available.",
    },
  ] as const;

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title={title} description={description}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
          <ModeBadge mode={mode} />
          <ActionToolbar
            ariaLabel="Markets key actions"
            items={[
              { id: "send", label: "Send", href: withScope("/orders"), variant: "primary" },
              { id: "receive", label: "Receive", href: withScope("/positions") },
              { id: "transfer", label: "Transfer", disabled: true, disabledReason: "Transfer execution is deferred in Markets." },
              { id: "view-history", label: "View History", href: withScope("/orders") },
              {
                id: "export",
                label: "Export",
                disabled: true,
                disabledReason: "Export reports are deferred until markets reporting APIs are enabled.",
              },
            ]}
          />
        </div>

        <div data-testid="markets-snapshot-indicators">
          <InlineStatusIndicators
            ariaLabel="Markets canonical indicators"
            items={[
              {
                id: "markets-health-indicator",
                label: "Health",
                value: overview.healthStatus,
                tone: resolveHealthTone(overview.healthStatus),
              },
              {
                id: "markets-api-version-indicator",
                label: "API",
                value: overview.apiVersion,
                tone: "brand",
              },
              {
                id: "markets-snapshot-asof-indicator",
                label: "Snapshot",
                value: formatDateTime(overview.asOf),
                tone: "neutral",
              },
            ]}
          />
        </div>

        <div
          data-testid="markets-top-priority-zone"
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}
        >
          <div data-testid="markets-unified-balance-top-card">
            <UnifiedBalanceCard {...unifiedBalanceCard} />
          </div>
          <MarketsPortfolioInsightsCard model={portfolioInsights} windowOptions={windowOptions} />
          <GettingStartedChecklist
            appId="markets-web"
            route={route}
            scope={{
              accountId: overview.accountId,
              ...(workspaceId ? { workspaceId } : {}),
            }}
            scopeHref={withScope(route)}
            unifiedBalanceHref={withScope("/overview")}
            firstActionHref={withScope("/orders")}
            firstActionLabel="Complete first task action"
            notificationsHref={withScope("/status")}
          />
        </div>

        <Card title="Markets modules" tone="highlight">
          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {moduleCards.map((module) => (
              <Card key={module.id} title={module.title} tone="muted">
                <p style={{ margin: 0 }}>{module.description}</p>
                <ActionToolbar
                  ariaLabel={`${module.title} actions`}
                  items={[
                    {
                      id: `${module.id}-cta`,
                      label: module.ctaLabel,
                      href: module.href,
                      variant: "primary",
                    },
                  ]}
                />
                <InlineStatusIndicators
                  items={[
                    {
                      id: `${module.id}-deferred`,
                      label: "Execution",
                      value: "Deferred backend",
                      tone: "warning",
                    },
                  ]}
                />
                <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
                  {module.deferredReason}
                </p>
              </Card>
            ))}
          </div>
        </Card>

        <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Card title="Total instruments" tone="muted">
            <p style={{ margin: 0 }}>{overview.instruments.totalInstruments}</p>
          </Card>
          <Card title="Tradable instruments" tone="muted">
            <p style={{ margin: 0 }}>{overview.instruments.tradableInstruments}</p>
          </Card>
          <Card title="Open orders" tone="muted">
            <p style={{ margin: 0 }}>{overview.orders.openOrders}</p>
          </Card>
          <Card title="Positions" tone="muted">
            <p style={{ margin: 0 }}>{overview.positions.totalPositions}</p>
          </Card>
          <Card title="Open positions" tone="muted">
            <p style={{ margin: 0 }}>{overview.positions.openPositions}</p>
          </Card>
          <Card title="Net exposure" tone="muted">
            <p style={{ margin: 0 }}>{overview.positions.netExposureBand}</p>
          </Card>
        </div>

        <div data-testid="markets-snapshot-details-card">
          <Card title="Canonical snapshot details" tone="muted">
            <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
              <p style={{ margin: 0 }}>
                Account reference: <strong>{overview.accountId}</strong>
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
        </div>
      </Section>
    </section>
  );
}
