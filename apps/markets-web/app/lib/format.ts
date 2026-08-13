import { formatLocalizedDateTime, formatLocalizedNumber } from "@ryvra/ui";

export function formatDateTime(isoTimestamp: string): string {
  return formatLocalizedDateTime(isoTimestamp, {
    fallback: "n/a",
  });
}

export function formatDecimal(value: string | number, maximumFractionDigits = 4): string {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return formatLocalizedNumber(numericValue, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function formatSigned(value: string | undefined): string {
  if (!value) {
    return "n/a";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return value;
  }

  const prefix = numericValue > 0 ? "+" : "";
  return `${prefix}${formatDecimal(numericValue, 2)}`;
}
