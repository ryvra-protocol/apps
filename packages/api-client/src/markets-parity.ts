import type {
  MarketOrderStatus,
  MarketPolicyDecision,
  MarketSide,
} from "@ryvra/domain-markets";

export const MARKETS_PROTOCOL_SOURCE = "ryvra-protocol/markets" as const;
export const MARKETS_PROTOCOL_OPENAPI_PATH = "openapi/markets.openapi.yaml" as const;
export const MARKETS_PROTOCOL_CHANGELOG_PATH = "docs/api-contract-changelog.md" as const;
export const MARKETS_PROTOCOL_OPENAPI_SHA = "cc08c626f2f26e192fe86d744d2aa1798c9c690a" as const;
export const MARKETS_PROTOCOL_OPENAPI_COMMIT = "87b7bf6764be28a6f6b89ff6f6226fe1f40fda46" as const;
export const MARKETS_PROTOCOL_COMPATIBILITY_VERSION = "MARKETS_API_VERSION=2026-08-08" as const;
export const MARKETS_PARITY_CHECK_MARKER = "phase-9-5-v2-2026-08-08T06:30:01.561Z" as const;

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
export const marketsCanonicalErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "service_unavailable",
  "internal_error",
] as const;

export const marketsRouteMap = {
  listInstruments: "/markets/instruments",
  getInstrumentSummary: "/markets/instruments/summary",
  listOrders: "/markets/orders",
  getOrderSummary: "/markets/orders/summary",
  listPositions: "/markets/positions",
  getPositionSummary: "/markets/positions/summary",
  getMarketsOverview: "/markets/overview",
} as const;

export const marketsAccountScopedRoutes = [
  marketsRouteMap.listOrders,
  marketsRouteMap.getOrderSummary,
  marketsRouteMap.listPositions,
  marketsRouteMap.getPositionSummary,
  marketsRouteMap.getMarketsOverview,
] as const;

const sideSet = new Set<MarketSide>(marketsCanonicalSides);
const orderStatusSet = new Set<MarketOrderStatus>(marketsCanonicalOrderStatuses);
const policyDecisionSet = new Set<MarketPolicyDecision>(marketsCanonicalPolicyDecisions);

export function isMarketSide(value: string): value is MarketSide {
  return sideSet.has(value as MarketSide);
}

export function isMarketOrderStatus(value: string): value is MarketOrderStatus {
  return orderStatusSet.has(value as MarketOrderStatus);
}

export function isMarketPolicyDecision(value: string): value is MarketPolicyDecision {
  return policyDecisionSet.has(value as MarketPolicyDecision);
}
