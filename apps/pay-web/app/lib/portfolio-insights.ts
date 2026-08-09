import {
  derivePortfolioAllocations,
  resolvePortfolioInsightState,
  resolveTrendDirection,
  type PortfolioAllocationRow,
  type PortfolioInsightModuleState,
} from "@ryvra/api-client";
import type { PayOverviewDto } from "@ryvra/domain-payments";
import { formatCurrencyMinor } from "./format";
import type { PayUnifiedBalanceCardModel } from "./unified-balance";

export interface PayInsightKpi {
  id: string;
  label: string;
  value: string;
  tone: "positive" | "warning" | "neutral";
}

export interface PayPortfolioInsightsModel {
  state: PortfolioInsightModuleState;
  totalValueLabel: string;
  quoteAsset: string;
  allocation: PortfolioAllocationRow[];
  trendKpis: PayInsightKpi[];
  errorMessage?: string;
  fallbackMessage?: string;
}

function toTone(direction: ReturnType<typeof resolveTrendDirection>): PayInsightKpi["tone"] {
  if (direction === "up") {
    return "positive";
  }

  if (direction === "down") {
    return "warning";
  }

  return "neutral";
}

function resolveTotalValueLabel(unifiedBalanceCard: PayUnifiedBalanceCardModel | undefined): string {
  if (unifiedBalanceCard?.state === "success" && unifiedBalanceCard.totalLabel) {
    return unifiedBalanceCard.totalLabel;
  }

  return "Unavailable";
}

export function buildPayPortfolioInsights(input: {
  overview?: PayOverviewDto;
  unifiedBalanceCard?: PayUnifiedBalanceCardModel;
}): PayPortfolioInsightsModel {
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
      fallbackMessage: "Pay overview data is unavailable for portfolio insights.",
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

  const totalOperationalAmount = input.overview.metrics.pendingInvoiceAmountMinor + input.overview.metrics.payoutProcessingAmountMinor;
  const pendingShare =
    totalOperationalAmount > 0 ? (input.overview.metrics.pendingInvoiceAmountMinor / totalOperationalAmount) * 100 : 0;
  const reconciliationDirection = resolveTrendDirection(-input.overview.metrics.reconciliationMismatchCount);

  return {
    state,
    totalValueLabel: resolveTotalValueLabel(input.unifiedBalanceCard),
    quoteAsset: snapshot?.totalQuoteAsset ?? "USD",
    allocation,
    trendKpis: [
      {
        id: "pending-invoice-share",
        label: "Pending invoice share",
        value: `${pendingShare.toFixed(1)}%`,
        tone: toTone(resolveTrendDirection(50 - pendingShare)),
      },
      {
        id: "payout-processing",
        label: "Payout processing",
        value: formatCurrencyMinor(input.overview.metrics.payoutProcessingAmountMinor, input.overview.metrics.currency),
        tone: "neutral",
      },
      {
        id: "reconciliation-mismatch",
        label: "Reconciliation mismatches",
        value: String(input.overview.metrics.reconciliationMismatchCount),
        tone: toTone(reconciliationDirection),
      },
      {
        id: "recent-activity",
        label: "Recent activity",
        value: `${input.overview.recentActivity.length} events`,
        tone: toTone(resolveTrendDirection(input.overview.recentActivity.length - 5)),
      },
    ],
    ...(state === "error" && input.unifiedBalanceCard?.errorMessage ? { errorMessage: input.unifiedBalanceCard.errorMessage } : {}),
    fallbackMessage: "Historical 24h/7d/30d pay windows are unavailable. Showing latest operational snapshot.",
  };
}
