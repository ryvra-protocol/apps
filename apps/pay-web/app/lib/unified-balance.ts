import { createUnifiedBalanceDisplayModelFromPositions, type MarketsClient } from "@ryvra/api-client";
import type { Logger } from "@ryvra/observability";
import type { UnifiedBalanceCardProps } from "@ryvra/ui";
import { capturePayPageError } from "./runtime";

export async function loadPayUnifiedBalanceCard(input: {
  marketsClient: MarketsClient;
  logger: Logger;
  accountId?: string;
  route: string;
}): Promise<UnifiedBalanceCardProps> {
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

    const displayModel = createUnifiedBalanceDisplayModelFromPositions({
      positions: positions.items,
      expectedAccountId: input.accountId,
      source: "markets.positions",
    });

    if (displayModel.rows.length === 0) {
      return {
        state: "empty",
        emptyMessage: "No unified assets are available for this account scope.",
        ...(displayModel.scopeMessage ? { statusMessage: displayModel.scopeMessage } : {}),
        retryHref: input.route,
        retryLabel: "Retry unified balance",
      };
    }

    return {
      state: "success",
      totalLabel: displayModel.totalLabel,
      rows: displayModel.rows,
      ...(displayModel.scopeMessage ? { statusMessage: displayModel.scopeMessage } : {}),
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
