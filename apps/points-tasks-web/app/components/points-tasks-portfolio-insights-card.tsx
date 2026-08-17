import type { PortfolioInsightWindow } from "@ryvra/api-client";
import {
  formatInsightPercent,
  InsightModuleCard,
  InsightTrendBars,
  InsightWindowSelector,
  themeTokens,
  type InsightWindowOption,
} from "@ryvra/ui";
import type { PointsTasksPortfolioInsightsModel } from "../lib/portfolio-insights";

interface PointsTasksPortfolioInsightsCardProps {
  model: PointsTasksPortfolioInsightsModel;
  selectedWindow: PortfolioInsightWindow;
  windowOptions: InsightWindowOption[];
}

export function PointsTasksPortfolioInsightsCard({
  model,
  selectedWindow,
  windowOptions,
}: PointsTasksPortfolioInsightsCardProps) {
  return (
    <InsightModuleCard
      title="Portfolio & insights"
      state={model.state}
      contentAriaLabel="Ryvra Community Hub portfolio insights"
      emptyMessage="No community insight data is available for this selection."
      errorMessage={model.errorMessage ?? "Unable to load Community Hub portfolio insights."}
      footer={
        <InsightWindowSelector
          label="Insight window"
          selectedWindow={selectedWindow}
          options={windowOptions}
          {...(model.fallbackMessage ? { fallbackMessage: model.fallbackMessage } : {})}
        />
      }
    >
      <p style={{ margin: 0 }}>
        Total portfolio value: <strong>{model.totalValueLabel}</strong>
      </p>

      <div style={{ display: "grid", gap: themeTokens.spacing.xs }} aria-label="Task allocation mix">
        <strong style={{ fontSize: themeTokens.typography.size.sm }}>Task allocation mix</strong>
        {model.allocation.length === 0 ? (
          <p style={{ margin: 0, color: themeTokens.color.textMuted }}>Task allocation data is unavailable.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: themeTokens.spacing.xs }}>
            {model.allocation.map((slice) => (
              <li key={slice.id}>
                {slice.label}: {formatInsightPercent(slice.sharePercent, 1)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <InsightTrendBars ariaLabel="Points accumulation trend" points={model.trend} emptyMessage="No points accumulation trend is available." />

      <div
        aria-label="Task productivity indicators"
        style={{ display: "grid", gap: themeTokens.spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
      >
        {model.productivityKpis.map((kpi) => (
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

      {model.errorMessage ? (
        <p role="alert" style={{ margin: 0, color: themeTokens.color.warning }}>
          {model.errorMessage}
        </p>
      ) : null}
    </InsightModuleCard>
  );
}
