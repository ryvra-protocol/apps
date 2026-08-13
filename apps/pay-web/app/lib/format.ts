import { formatLocalizedCurrency, formatLocalizedDateTime } from "@ryvra/ui";

export function formatCurrencyMinor(amountMinor: number, currency: string): string {
  return formatLocalizedCurrency(amountMinor / 100, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currencyDisplay: "symbol",
  });
}

export function formatDateTime(isoTimestamp: string): string {
  return formatLocalizedDateTime(isoTimestamp, {
    fallback: "n/a",
  });
}
