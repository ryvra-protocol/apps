export function formatDateTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoTimestamp));
}

export function formatDecimal(value: string | number, maximumFractionDigits = 4): string {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(numericValue);
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
