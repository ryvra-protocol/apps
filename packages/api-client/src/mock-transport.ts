import type { AssetDto, OrderDto, PositionDto } from "@ryvra/domain-markets";
import type { InvoiceDto, PayoutDto, SubscriptionDto } from "@ryvra/domain-payments";
import type { ConversionPreviewDto, EligibilityResult } from "@ryvra/domain-tokenomics";
import type { ApiRequest, ApiResult, Transport } from "./types";

const mockAssets: AssetDto[] = [
  { id: "asset-btc-usd", symbol: "BTC-USD", name: "Bitcoin / US Dollar" },
  { id: "asset-eth-usd", symbol: "ETH-USD", name: "Ether / US Dollar" },
];

const mockPositions: PositionDto[] = [{ id: "pos-1", assetId: "asset-btc-usd", quantity: 0.25, avgEntryPrice: 62200 }];

const mockInvoices: InvoiceDto[] = [{ id: "inv-1", amountMinor: 12500, currency: "USD", status: "OPEN" }];

const mockPayouts: PayoutDto[] = [{ id: "po-1", amountMinor: 5000, currency: "USD", status: "QUEUED" }];

const mockSubscriptions: SubscriptionDto[] = [
  { id: "sub-1", customerId: "cust-1", status: "ACTIVE", renewalAt: "2026-12-01T00:00:00Z" },
];

function success<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function createMockTransport(): Transport {
  return {
    async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
      if (request.method === "GET" && request.path === "/markets/assets") {
        return success(mockAssets as T);
      }

      if (request.method === "GET" && request.path === "/markets/positions") {
        return success(mockPositions as T);
      }

      if (request.method === "POST" && request.path === "/markets/execution/preview") {
        const body = (request.body ?? {}) as { assetId?: string; side?: "BUY" | "SELL"; quantity?: number };
        const order: OrderDto = {
          id: "preview-order-1",
          assetId: body.assetId ?? "asset-btc-usd",
          side: body.side ?? "BUY",
          quantity: body.quantity ?? 0,
          status: "PREVIEW",
        };
        return success(order as T);
      }

      if (request.method === "GET" && request.path === "/pay/invoices") {
        return success(mockInvoices as T);
      }

      if (request.method === "GET" && request.path === "/pay/payouts") {
        return success(mockPayouts as T);
      }

      if (request.method === "GET" && request.path === "/pay/subscriptions") {
        return success(mockSubscriptions as T);
      }

      if (request.method === "GET" && request.path.startsWith("/points-tasks/eligibility")) {
        const eligibility: EligibilityResult = {
          eligible: true,
          reasonCode: "mock-mode",
        };
        return success(eligibility as T);
      }

      if (request.method === "POST" && request.path === "/points-tasks/conversion/preview") {
        const body = (request.body ?? {}) as ConversionPreviewDto;
        const preview: ConversionPreviewDto = {
          sourcePoints: body.sourcePoints ?? 0,
          conversionRate: body.conversionRate ?? 0,
          targetToken: body.targetToken ?? "RYV",
          expectedTokens: body.sourcePoints && body.conversionRate ? body.sourcePoints * body.conversionRate : 0,
        };
        return success(preview as T);
      }

      return {
        ok: false,
        error: {
          status: 404,
          code: "mock_not_found",
          message: `No mock route for ${request.method} ${request.path}`,
        },
      };
    },
  };
}
