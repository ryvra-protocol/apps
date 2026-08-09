import { formatInsightCurrency, formatInsightTimestamp } from "@ryvra/ui";

export function formatCurrencyMinor(amountMinor: number, currency: string): string {
  return formatInsightCurrency(amountMinor / 100, currency, 2);
}

export function formatDateTime(isoTimestamp: string): string {
  return formatInsightTimestamp(isoTimestamp);
}
