import type { MarketOrderStatus, MarketSide } from "@ryvra/domain-markets";

export const MARKETS_PROTOCOL_SOURCE = "ryvra-protocol/markets" as const;
export const MARKETS_PROTOCOL_COMPATIBILITY_VERSION = "rfc-0007-v1-draft+phase9-mvp-read-model-adapter" as const;
export const MARKETS_PARITY_CHECK_MARKER = "phase-9-2026-08-08T05:30:18.630Z" as const;

export const marketsCanonicalSides = ["buy", "sell"] as const;
export const marketsCanonicalOrderStatuses = [
  "created",
  "validated",
  "routed",
  "partially_filled",
  "filled",
  "canceled",
  "expired",
  "failed",
  "settled",
] as const;
export const marketsCanonicalPolicyDecisions = ["ALLOW", "DENY", "REVIEW"] as const;
export const marketsCanonicalAssetClasses = ["crypto", "fiat", "rwa", "metal"] as const;

export const marketsRouteMap = {
  listInstruments: "/markets/instruments",
  getInstrumentSummary: "/markets/instruments/summary",
  listOrders: "/markets/orders",
  getOrderSummary: "/markets/orders/summary",
  listPositions: "/markets/positions",
  getPositionSummary: "/markets/positions/summary",
  getMarketsOverview: "/markets/overview",
} as const;

const sideSet = new Set<MarketSide>(marketsCanonicalSides);
const orderStatusSet = new Set<MarketOrderStatus>(marketsCanonicalOrderStatuses);

export function isMarketSide(value: string): value is MarketSide {
  return sideSet.has(value as MarketSide);
}

export function isMarketOrderStatus(value: string): value is MarketOrderStatus {
  return orderStatusSet.has(value as MarketOrderStatus);
}
