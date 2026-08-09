import {
  aggregateUnifiedBalance,
  createUnifiedBalanceDisplayModel,
  mapPositionsToUnifiedBalanceRows,
  type MarketsClient,
} from "@ryvra/api-client";
import type { Logger } from "@ryvra/observability";
import type { UnifiedBalanceCardProps } from "@ryvra/ui";
import { capturePayPageError } from "./runtime";

export interface UnifiedBalancePortfolioSnapshotRow {
  id: string;
  symbol: string;
  notionalValue: number;
}

export interface UnifiedBalancePortfolioSnapshot {
  totalNotionalValue: number;
  totalQuoteAsset: string;
  rows: UnifiedBalancePortfolioSnapshotRow[];
}

export interface PayUnifiedBalanceCardModel extends UnifiedBalanceCardProps {
  portfolioSnapshot?: UnifiedBalancePortfolioSnapshot;
}

export async function loadPayUnifiedBalanceCard(input: {
  marketsClient: MarketsClient;
  logger: Logger;
  accountId?: string;
  route: string;
}): Promise<PayUnifiedBalanceCardModel> {
  if (!input.accountId) {
    return {
      state: "error",
      errorMessage:
        "Unified balance needs an account scope. Set RYVRA_MARKETS_ACCOUNT_ID (or keep mock mode default) and retry.",
      retryHref: input.route,
      retryLabel: "Retry unified balance",
    };
  }

  try {
    const positions = await input.marketsClient.listPositions({
      accountId: input.accountId,
      pagination: {
        limit: 250,
      },
    });

    const aggregation = aggregateUnifiedBalance({
      expectedAccountId: input.accountId,
      sources: [
        {
          source: "markets.positions",
          rows: mapPositionsToUnifiedBalanceRows(positions.items),
        },
      ],
    });
    const displayModel = createUnifiedBalanceDisplayModel(aggregation);
    const portfolioSnapshot: UnifiedBalancePortfolioSnapshot = {
      totalNotionalValue: aggregation.totalNotionalValue,
      totalQuoteAsset: aggregation.totalQuoteAsset,
      rows: aggregation.rows.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        notionalValue: row.notionalValue,
      })),
    };

    if (displayModel.rows.length === 0) {
      return {
        state: "empty",
        emptyMessage: "No unified assets are available for this account scope.",
        ...(displayModel.scopeMessage ? { statusMessage: displayModel.scopeMessage } : {}),
        retryHref: input.route,
        retryLabel: "Retry unified balance",
        portfolioSnapshot,
      };
    }

    return {
      state: "success",
      totalLabel: displayModel.totalLabel,
      rows: displayModel.rows,
      ...(displayModel.scopeMessage ? { statusMessage: displayModel.scopeMessage } : {}),
      portfolioSnapshot,
    };
  } catch (error) {
    const uiError = capturePayPageError(input.logger, `${input.route}:unified-balance`, error);
    return {
      state: "error",
      errorMessage: uiError.message,
      retryHref: input.route,
      retryLabel: "Retry unified balance",
    };
  }
}
