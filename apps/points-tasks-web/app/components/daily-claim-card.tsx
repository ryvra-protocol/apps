import { Button, Card, themeTokens } from "@ryvra/ui";
import type { DailyClaimViewModel } from "../lib/daily-claim";
import { StatusBadge } from "./status-badge";

interface DailyClaimCardProps {
  model: DailyClaimViewModel;
}

export function DailyClaimCard({ model }: DailyClaimCardProps) {
  return (
    <Card title="Daily claim">
      <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
          <span style={{ color: themeTokens.color.textMuted }}>Status:</span>
          <StatusBadge status={model.status} />
          <span>{model.statusLabel}</span>
        </div>

        {model.nextEligibleLabel ? (
          <p style={{ margin: 0, color: themeTokens.color.textMuted }} aria-live="polite">
            Next eligible: {model.nextEligibleLabel}
          </p>
        ) : null}

        <div style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <Button
            type="button"
            disabled={!model.cta.enabled}
            aria-label={model.cta.enabled ? "Claim daily points" : `Claim disabled: ${model.cta.reason ?? "Unavailable"}`}
          >
            {model.cta.label}
          </Button>
          {!model.cta.enabled && model.cta.reason ? (
            <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{model.cta.reason}</p>
          ) : null}
        </div>

        {model.errorMessage ? (
          <p role="alert" style={{ margin: 0, color: themeTokens.color.danger }}>
            {model.errorMessage}
          </p>
        ) : null}
        {model.retryable && model.retryHref ? (
          <a
            href={model.retryHref}
            style={{
              display: "inline-flex",
              width: "fit-content",
              borderRadius: themeTokens.radius.md,
              border: `1px solid ${themeTokens.color.primary}`,
              padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.lg}`,
              color: themeTokens.color.primary,
              textDecoration: "none",
              fontWeight: themeTokens.typography.weight.medium,
            }}
          >
            Retry claim status
          </a>
        ) : null}
      </div>
    </Card>
  );
}
