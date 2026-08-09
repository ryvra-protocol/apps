export const portfolioInsightWindows = ["24h", "7d", "30d"] as const;
export type PortfolioInsightWindow = (typeof portfolioInsightWindows)[number];

export type PortfolioInsightModuleState = "loading" | "empty" | "error" | "success";

export interface PortfolioAllocationInputRow {
  id: string;
  label: string;
  value: number;
}

export interface PortfolioAllocationRow extends PortfolioAllocationInputRow {
  sharePercent: number;
}

export interface PortfolioWindowCoverage {
  covered: boolean;
  spanHours?: number;
  message?: string;
}

export type TrendDirection = "up" | "down" | "flat";

const WINDOW_HOURS: Record<PortfolioInsightWindow, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

function toFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function normalizePortfolioInsightWindow(value: string | undefined): PortfolioInsightWindow {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "24h" || normalized === "7d" || normalized === "30d") {
    return normalized;
  }

  return "24h";
}

export function resolvePortfolioInsightState(input: {
  isLoading?: boolean;
  hasError?: boolean;
  hasData?: boolean;
}): PortfolioInsightModuleState {
  if (input.isLoading) {
    return "loading";
  }

  if (input.hasError) {
    return "error";
  }

  if (!input.hasData) {
    return "empty";
  }

  return "success";
}

export function derivePortfolioAllocations(input: {
  rows: PortfolioAllocationInputRow[];
  totalValue?: number;
  limit?: number;
}): PortfolioAllocationRow[] {
  const normalizedRows = input.rows
    .map((row) => ({
      id: row.id,
      label: row.label,
      value: Math.max(0, toFinite(row.value)),
    }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label) || left.id.localeCompare(right.id));

  const computedTotal = normalizedRows.reduce((sum, row) => sum + row.value, 0);
  const totalValue = input.totalValue && Number.isFinite(input.totalValue) && input.totalValue > 0 ? input.totalValue : computedTotal;
  if (totalValue <= 0) {
    return [];
  }

  const limit = typeof input.limit === "number" && input.limit > 0 ? Math.floor(input.limit) : normalizedRows.length;
  return normalizedRows.slice(0, limit).map((row) => ({
    ...row,
    sharePercent: (row.value / totalValue) * 100,
  }));
}

export function evaluatePortfolioWindowCoverage(input: {
  windowStart?: string;
  windowEnd?: string;
  window: PortfolioInsightWindow;
}): PortfolioWindowCoverage {
  const parsedStart = Date.parse(input.windowStart ?? "");
  const parsedEnd = Date.parse(input.windowEnd ?? "");
  if (!Number.isFinite(parsedStart) || !Number.isFinite(parsedEnd) || parsedEnd < parsedStart) {
    return {
      covered: false,
      message: "Historical window data is unavailable for the selected range.",
    };
  }

  const spanHours = Math.max(0, (parsedEnd - parsedStart) / 3_600_000);
  const requiredHours = WINDOW_HOURS[input.window];
  if (spanHours + 0.01 < requiredHours) {
    return {
      covered: false,
      spanHours,
      message: `Historical data covers ${spanHours.toFixed(1)}h. ${input.window} insights are unavailable.`,
    };
  }

  return {
    covered: true,
    spanHours,
  };
}

export function resolveTrendDirection(delta: number, threshold = 0.0001): TrendDirection {
  const normalized = toFinite(delta);
  if (Math.abs(normalized) < threshold) {
    return "flat";
  }

  return normalized > 0 ? "up" : "down";
}
