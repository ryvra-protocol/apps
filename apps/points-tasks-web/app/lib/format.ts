import { formatInsightNumber, formatInsightTimestamp } from "@ryvra/ui";

export function formatDateTime(isoTimestamp: string): string {
  return formatInsightTimestamp(isoTimestamp);
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return formatInsightNumber(value, maximumFractionDigits);
}

export function formatSignedPoints(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const prefix = normalized > 0 ? "+" : "";
  return `${prefix}${formatNumber(normalized)}`;
}
