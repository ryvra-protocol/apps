import {
  formatInsightCurrency,
  formatInsightPercent,
  InsightModuleCard,
  InsightTrendBars,
  InsightWindowSelector,
  themeTokens,
  type InsightWindowOption,
} from "@ryvra/ui";
import type { MarketsPortfolioInsightsModel } from "../lib/portfolio-insights";

interface MarketsPortfolioInsightsCardProps {
  model: MarketsPortfolioInsightsModel;
  windowOptions: InsightWindowOption[];
}

export function MarketsPortfolioInsightsCard({ model, windowOptions }: MarketsPortfolioInsightsCardProps) {
  return (
    <InsightModuleCard
      title="Portfolio & insights"
      state={model.state}
      contentAriaLabel="Markets portfolio insights"
      emptyMessage="No portfolio insight data is available for this account."
      errorMessage={model.errorMessage ?? "Unable to load portfolio insights."}
      footer={
        <InsightWindowSelector
          label="Insight window"
          selectedWindow="24h"
          options={windowOptions}
          {...(model.fallbackMessage ? { fallbackMessage: model.fallbackMessage } : {})}
        />
      }
    >
      <p style={{ margin: 0 }}>
        Total portfolio value: <strong>{model.totalValueLabel}</strong>
      </p>

      <InsightTrendBars
        ariaLabel="Asset allocation summary"
        points={model.allocation.map((allocation) => ({
          id: allocation.id,
          label: allocation.label,
          value: allocation.value,
          valueLabel: `${formatInsightPercent(allocation.sharePercent, 1)} • ${formatInsightCurrency(allocation.value, model.quoteAsset)}`,
        }))}
        emptyMessage="Allocation data is unavailable."
      />

      <div
        aria-label="Markets trend indicators"
        style={{ display: "grid", gap: themeTokens.spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
      >
        {model.trendKpis.map((kpi) => (
          <article
            key={kpi.id}
            style={{
              border: `1px solid ${themeTokens.color.border}`,
              borderRadius: themeTokens.radius.md,
              padding: themeTokens.spacing.sm,
              display: "grid",
              gap: themeTokens.spacing.xs,
            }}
          >
            <span style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{kpi.label}</span>
            <strong
              style={{
                color:
                  kpi.tone === "positive"
                    ? themeTokens.color.success
                    : kpi.tone === "warning"
                      ? themeTokens.color.warning
                      : themeTokens.color.text,
              }}
            >
              {kpi.value}
            </strong>
          </article>
        ))}
      </div>
    </InsightModuleCard>
  );
}
