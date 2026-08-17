import { Card } from "./Card";
import { themeTokens } from "./theme";
import { translateRuntime } from "./i18n-runtime";

export type UnifiedBalanceCardState = "loading" | "empty" | "error" | "success";

export interface UnifiedBalanceCardRow {
  id: string;
  assetSymbol: string;
  chainLabel: string;
  quantityLabel: string;
  valueLabel: string;
}

export interface UnifiedBalanceCardProps {
  state: UnifiedBalanceCardState;
  title?: string;
  totalLabel?: string;
  rows?: UnifiedBalanceCardRow[];
  emptyMessage?: string;
  errorMessage?: string;
  retryHref?: string;
  retryLabel?: string;
  statusMessage?: string;
}

function RetryLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
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
      {label}
    </a>
  );
}

export function UnifiedBalanceCard({
  state,
  title = translateRuntime("unified.title", "Unified balance"),
  totalLabel,
  rows = [],
  emptyMessage = translateRuntime("unified.empty", "No unified assets are available for the active account scope."),
  errorMessage = translateRuntime("unified.error", "Unable to load unified balances."),
  retryHref,
  retryLabel = translateRuntime("unified.retry", "Retry unified balance"),
  statusMessage,
}: UnifiedBalanceCardProps) {
  if (state === "loading") {
    return (
      <Card title={title} tone="highlight">
        <div aria-live="polite" role="status" style={{ display: "grid", gap: themeTokens.spacing.sm }}>
          <div style={{ height: "1.4rem", width: "55%", background: themeTokens.color.surfaceMuted, borderRadius: themeTokens.radius.sm }} />
          <div style={{ height: "1rem", width: "90%", background: themeTokens.color.surfaceMuted, borderRadius: themeTokens.radius.sm }} />
          <div style={{ height: "1rem", width: "82%", background: themeTokens.color.surfaceMuted, borderRadius: themeTokens.radius.sm }} />
        </div>
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card title={title} tone="highlight">
        <div role="alert" aria-live="assertive" style={{ display: "grid", gap: themeTokens.spacing.sm }}>
          <p style={{ margin: 0 }}>{errorMessage}</p>
          {retryHref ? <RetryLink href={retryHref} label={retryLabel} /> : null}
        </div>
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card title={title} tone="highlight">
        <p style={{ margin: 0 }}>{emptyMessage}</p>
        {statusMessage ? (
          <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{statusMessage}</p>
        ) : null}
      </Card>
    );
  }

  return (
    <Card title={title} tone="highlight">
      <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
          {translateRuntime("unified.totalAggregated", "Total aggregated balance")}
        </p>
        <p style={{ margin: 0, fontSize: themeTokens.typography.size.xl, fontWeight: themeTokens.typography.weight.semibold }}>
          {totalLabel ?? "0 USD"}
        </p>
        {statusMessage ? (
          <p style={{ margin: 0, color: themeTokens.color.warning, fontSize: themeTokens.typography.size.sm }}>{statusMessage}</p>
        ) : null}
      </div>

      <details open={rows.length <= 4}>
        <summary style={{ cursor: "pointer", fontWeight: themeTokens.typography.weight.medium }}>
          {translateRuntime("unified.assetBreakdown", "Asset breakdown ({count})", { count: rows.length })}
        </summary>
        <div style={{ overflowX: "auto", marginTop: themeTokens.spacing.sm }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "18rem" }}>
            <thead>
              <tr style={{ textAlign: "start", color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
                <th style={{ padding: `${themeTokens.spacing.xs} 0` }}>
                  {translateRuntime("unified.column.asset", "Asset")}
                </th>
                <th style={{ padding: `${themeTokens.spacing.xs} 0` }}>
                  {translateRuntime("unified.column.chain", "Chain")}
                </th>
                <th style={{ padding: `${themeTokens.spacing.xs} 0` }}>
                  {translateRuntime("unified.column.quantity", "Quantity")}
                </th>
                <th style={{ padding: `${themeTokens.spacing.xs} 0` }}>
                  {translateRuntime("unified.column.value", "Value")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: `${themeTokens.spacing.xs} 0` }}>{row.assetSymbol}</td>
                  <td style={{ padding: `${themeTokens.spacing.xs} 0` }}>{row.chainLabel}</td>
                  <td style={{ padding: `${themeTokens.spacing.xs} 0` }}>{row.quantityLabel}</td>
                  <td style={{ padding: `${themeTokens.spacing.xs} 0` }}>{row.valueLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
