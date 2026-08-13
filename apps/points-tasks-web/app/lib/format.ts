import { formatLocalizedDateTime, formatLocalizedNumber } from "@ryvra/ui";

export function formatDateTime(isoTimestamp: string): string {
  return formatLocalizedDateTime(isoTimestamp, {
    fallback: "n/a",
  });
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return formatLocalizedNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function formatSignedPoints(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const prefix = normalized > 0 ? "+" : "";
  return `${prefix}${formatNumber(normalized)}`;
}
