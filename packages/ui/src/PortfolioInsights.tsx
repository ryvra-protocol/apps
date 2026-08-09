import type { ReactNode } from "react";
import { Card } from "./Card";
import { themeTokens } from "./theme";

export type InsightModuleState = "loading" | "empty" | "error" | "success";
export type InsightWindow = "24h" | "7d" | "30d";

export interface InsightWindowOption {
  window: InsightWindow;
  href?: string;
  label?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface InsightTrendPoint {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
}

export interface InsightModuleCardProps {
  title: string;
  state: InsightModuleState;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  contentAriaLabel?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export interface InsightWindowSelectorProps {
  label: string;
  selectedWindow: InsightWindow;
  options: InsightWindowOption[];
  fallbackMessage?: string;
}

export interface InsightTrendBarsProps {
  ariaLabel: string;
  points: InsightTrendPoint[];
  emptyMessage?: string;
}

function normalizeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function toSafeUnitLabel(unit: string | undefined, fallback = "USD"): string {
  const normalized = unit?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export function formatInsightNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(normalizeNumber(value));
}

export function formatInsightPercent(value: number, maximumFractionDigits = 1): string {
  return `${formatInsightNumber(value, maximumFractionDigits)}%`;
}

export function formatInsightCurrency(value: number, currency: string, maximumFractionDigits = 2): string {
  return `${formatInsightNumber(value, maximumFractionDigits)} ${toSafeUnitLabel(currency)}`;
}

export function formatInsightTimestamp(isoTimestamp: string): string {
  const parsed = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsed)) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(parsed));
}

export function InsightModuleCard({
  title,
  state,
  loadingMessage = "Loading insight module…",
  emptyMessage = "No insight data is available for this view.",
  errorMessage = "Insight data is unavailable.",
  contentAriaLabel,
  children,
  footer,
}: InsightModuleCardProps) {
  return (
    <Card title={title}>
      <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        {state === "loading" ? (
          <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
            {loadingMessage}
          </p>
        ) : null}
        {state === "empty" ? <p style={{ margin: 0, color: themeTokens.color.textMuted }}>{emptyMessage}</p> : null}
        {state === "error" ? (
          <p role="alert" aria-live="assertive" style={{ margin: 0, color: themeTokens.color.danger }}>
            {errorMessage}
          </p>
        ) : null}
        {state === "success" ? (
          <div aria-label={contentAriaLabel} style={{ display: "grid", gap: themeTokens.spacing.sm }}>
            {children}
          </div>
        ) : null}
        {footer ? <div style={{ display: "grid", gap: themeTokens.spacing.xs }}>{footer}</div> : null}
      </div>
    </Card>
  );
}

export function InsightWindowSelector({ label, selectedWindow, options, fallbackMessage }: InsightWindowSelectorProps) {
  return (
    <div style={{ display: "grid", gap: themeTokens.spacing.xs }}>
      <span style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{label}</span>
      <nav aria-label={label}>
        <ul style={{ display: "flex", gap: themeTokens.spacing.sm, margin: 0, padding: 0, listStyle: "none", flexWrap: "wrap" }}>
          {options.map((option) => {
            const optionLabel = option.label ?? option.window.toUpperCase();
            const selected = option.window === selectedWindow;
            const sharedStyle = {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "3.4rem",
              borderRadius: themeTokens.radius.pill,
              border: `1px solid ${selected ? themeTokens.color.primary : themeTokens.color.borderStrong}`,
              padding: `${themeTokens.spacing.xs} ${themeTokens.spacing.md}`,
              fontSize: themeTokens.typography.size.sm,
              fontWeight: selected ? themeTokens.typography.weight.semibold : themeTokens.typography.weight.medium,
              textDecoration: "none",
              lineHeight: themeTokens.typography.lineHeight.tight,
            } as const;

            if (option.disabled || !option.href) {
              return (
                <li key={option.window}>
                  <span
                    aria-disabled="true"
                    tabIndex={0}
                    title={option.disabledReason}
                    style={{
                      ...sharedStyle,
                      background: themeTokens.color.disabledBackground,
                      color: themeTokens.color.disabledText,
                    }}
                  >
                    {optionLabel}
                  </span>
                </li>
              );
            }

            return (
              <li key={option.window}>
                <a
                  href={option.href}
                  aria-current={selected ? "page" : undefined}
                  style={{
                    ...sharedStyle,
                    background: selected ? themeTokens.color.primary : themeTokens.color.surface,
                    color: selected ? themeTokens.color.textInverse : themeTokens.color.text,
                  }}
                >
                  {optionLabel}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      {fallbackMessage ? (
        <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{fallbackMessage}</p>
      ) : null}
    </div>
  );
}

export function InsightTrendBars({ ariaLabel, points, emptyMessage = "Trend data is unavailable." }: InsightTrendBarsProps) {
  if (points.length === 0) {
    return (
      <p style={{ margin: 0, color: themeTokens.color.textMuted }} aria-label={ariaLabel}>
        {emptyMessage}
      </p>
    );
  }

  const max = Math.max(...points.map((point) => Math.max(Math.abs(normalizeNumber(point.value)), 0)));
  const divisor = max > 0 ? max : 1;

  return (
    <ul aria-label={ariaLabel} style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: themeTokens.spacing.sm }}>
      {points.map((point) => {
        const value = normalizeNumber(point.value);
        const width = Math.max(8, Math.round((Math.abs(value) / divisor) * 100));
        const barColor = value > 0 ? themeTokens.color.success : value < 0 ? themeTokens.color.warning : themeTokens.color.borderStrong;

        return (
          <li key={point.id} style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
              <span>{point.label}</span>
              <span style={{ color: themeTokens.color.textMuted }}>{point.valueLabel}</span>
            </div>
            <div
              style={{
                height: "0.375rem",
                borderRadius: themeTokens.radius.pill,
                background: themeTokens.color.surfaceMuted,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${width}%`,
                  height: "100%",
                  borderRadius: themeTokens.radius.pill,
                  background: barColor,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
