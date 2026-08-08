export function formatDateTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoTimestamp));
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function formatSignedPoints(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const prefix = normalized > 0 ? "+" : "";
  return `${prefix}${formatNumber(normalized)}`;
}
