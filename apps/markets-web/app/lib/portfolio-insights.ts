import {
  derivePortfolioAllocations,
  resolvePortfolioInsightState,
  resolveTrendDirection,
  type PortfolioAllocationRow,
  type PortfolioInsightModuleState,
} from "@ryvra/api-client";
import type { MarketsOverviewDto } from "@ryvra/domain-markets";
import type { MarketsUnifiedBalanceCardModel } from "./unified-balance";

export interface MarketsInsightKpi {
  id: string;
  label: string;
  value: string;
  tone: "positive" | "warning" | "neutral";
}

export interface MarketsPortfolioInsightsModel {
  state: PortfolioInsightModuleState;
  totalValueLabel: string;
  quoteAsset: string;
  allocation: PortfolioAllocationRow[];
  trendKpis: MarketsInsightKpi[];
  errorMessage?: string;
  fallbackMessage?: string;
}

function toPercent(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return (part / total) * 100;
}

function toTone(direction: ReturnType<typeof resolveTrendDirection>): MarketsInsightKpi["tone"] {
  if (direction === "up") {
    return "positive";
  }

  if (direction === "down") {
    return "warning";
  }

  return "neutral";
}

function resolveTotalValueLabel(unifiedBalanceCard: MarketsUnifiedBalanceCardModel | undefined): string {
  if (unifiedBalanceCard?.state === "success" && unifiedBalanceCard.totalLabel) {
    return unifiedBalanceCard.totalLabel;
  }

  return "Unavailable";
}

export function buildMarketsPortfolioInsights(input: {
  overview?: MarketsOverviewDto;
  unifiedBalanceCard?: MarketsUnifiedBalanceCardModel;
}): MarketsPortfolioInsightsModel {
  const state = resolvePortfolioInsightState({
    isLoading: input.unifiedBalanceCard?.state === "loading",
    hasError: input.unifiedBalanceCard?.state === "error",
    hasData: Boolean(input.overview),
  });

  if (!input.overview) {
    return {
      state,
      totalValueLabel: resolveTotalValueLabel(input.unifiedBalanceCard),
      quoteAsset: input.unifiedBalanceCard?.portfolioSnapshot?.totalQuoteAsset ?? "USD",
      allocation: [],
      trendKpis: [],
      fallbackMessage: "Markets overview data is unavailable for portfolio insights.",
      ...(input.unifiedBalanceCard?.state === "error" && input.unifiedBalanceCard.errorMessage
        ? { errorMessage: input.unifiedBalanceCard.errorMessage }
        : {}),
    };
  }

  const snapshot = input.unifiedBalanceCard?.portfolioSnapshot;
  const allocation = snapshot
    ? derivePortfolioAllocations({
        rows: snapshot.rows.map((row) => ({
          id: row.id,
          label: row.symbol,
          value: row.notionalValue,
        })),
        totalValue: snapshot.totalNotionalValue,
        limit: 5,
      })
    : [];

  const tradableCoverage = toPercent(input.overview.instruments.tradableInstruments, input.overview.instruments.totalInstruments);
  const openOrderPressure = toPercent(input.overview.orders.openOrders, input.overview.orders.totalOrders);
  const openPositionRatio = toPercent(input.overview.positions.openPositions, input.overview.positions.totalPositions);

  return {
    state,
    totalValueLabel: resolveTotalValueLabel(input.unifiedBalanceCard),
    quoteAsset: snapshot?.totalQuoteAsset ?? "USD",
    allocation,
    trendKpis: [
      {
        id: "tradable-coverage",
        label: "Tradable coverage",
        value: `${tradableCoverage.toFixed(1)}%`,
        tone: toTone(resolveTrendDirection(tradableCoverage - 50)),
      },
      {
        id: "open-order-pressure",
        label: "Open-order pressure",
        value: `${openOrderPressure.toFixed(1)}%`,
        tone: toTone(resolveTrendDirection(50 - openOrderPressure)),
      },
      {
        id: "open-position-ratio",
        label: "Open-position ratio",
        value: `${openPositionRatio.toFixed(1)}%`,
        tone: toTone(resolveTrendDirection(openPositionRatio - 50)),
      },
      {
        id: "net-exposure-band",
        label: "Net exposure",
        value: input.overview.positions.netExposureBand.toUpperCase(),
        tone: input.overview.positions.netExposureBand === "high" ? "warning" : "neutral",
      },
    ],
    ...(state === "error" && input.unifiedBalanceCard?.errorMessage ? { errorMessage: input.unifiedBalanceCard.errorMessage } : {}),
    fallbackMessage: "Historical 24h/7d/30d market windows are unavailable. Showing latest snapshot insights.",
  };
}
