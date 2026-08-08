export const marketSides = ["buy", "sell"] as const;
export type MarketSide = (typeof marketSides)[number];

export const marketOrderStatuses = [
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
export type MarketOrderStatus = (typeof marketOrderStatuses)[number];

export const marketOrderTypes = ["market"] as const;
export type MarketOrderType = (typeof marketOrderTypes)[number];

export const marketPolicyDecisions = ["ALLOW", "DENY", "REVIEW"] as const;
export type MarketPolicyDecision = (typeof marketPolicyDecisions)[number];

export const marketInstrumentClasses = ["crypto", "fiat", "rwa", "metal"] as const;
export type MarketInstrumentClass = (typeof marketInstrumentClasses)[number];

export const marketInstrumentStatuses = ["active", "inactive", "suspended", "delisted"] as const;
export type MarketInstrumentStatus = (typeof marketInstrumentStatuses)[number];

export const marketInstrumentAvailabilities = ["tradable", "close_only", "halted", "view_only"] as const;
export type MarketInstrumentAvailability = (typeof marketInstrumentAvailabilities)[number];

export const marketPositionStates = ["open", "reducing", "closed", "liquidating", "suspended"] as const;
export type MarketPositionState = (typeof marketPositionStates)[number];

export const marketPositionSides = ["long", "short", "flat"] as const;
export type MarketPositionSide = (typeof marketPositionSides)[number];

export const marketRiskFlags = [
  "size_limit_near",
  "size_limit_breached",
  "concentration_limit_near",
  "concentration_limit_breached",
  "volatility_halt",
  "eligibility_restricted",
  "manual_review_required",
] as const;
export type MarketRiskFlag = (typeof marketRiskFlags)[number];

export const marketNetExposureBands = ["flat", "low", "medium", "high", "critical"] as const;
export type MarketNetExposureBand = (typeof marketNetExposureBands)[number];

export type MarketSortDirection = "asc" | "desc";
export type MarketsOverviewHealthStatus = "pass" | "degraded" | "fail";

export interface MarketsDateRangeFilter {
  from?: string;
  to?: string;
}

export interface MarketsPaginationRequest {
  limit?: number;
  cursor?: string;
  /**
   * @deprecated Canonical pagination is cursor-first; retained for compatibility through at least 2027-02-08.
   */
  page?: number;
  /**
   * @deprecated Use `limit`.
   */
  pageSize?: number;
}

export interface MarketsSortRequest {
  field: string;
  direction: MarketSortDirection;
}

export interface MarketsPaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
  /**
   * @deprecated Canonical pagination is cursor-first.
   */
  page?: number;
}

export interface MarketsListRequest<TFilters extends object> {
  filters?: TFilters;
  pagination?: MarketsPaginationRequest;
  sort?: MarketsSortRequest;
}

export interface MarketsAccountScopedRequest {
  accountId: string;
}

export interface MarketsAccountScopedListRequest<TFilters extends object>
  extends MarketsListRequest<TFilters>,
    MarketsAccountScopedRequest {}

export interface MarketsAccountScopedSummaryRequest<TFilters extends object> extends MarketsAccountScopedRequest {
  filters?: TFilters;
}

export interface InstrumentFilters {
  q?: string;
  assetClass?: MarketInstrumentClass;
  status?: MarketInstrumentStatus;
  availability?: MarketInstrumentAvailability;
  chainId?: number;
  /**
   * @deprecated Use `q`.
   */
  search?: string;
}

export interface OrderFilters {
  referenceId?: string;
  correlationId?: string;
  routeId?: string;
  status?: MarketOrderStatus;
  side?: MarketSide;
  type?: MarketOrderType;
  policyDecision?: MarketPolicyDecision;
  createdAfter?: string;
  createdBefore?: string;
  /**
   * @deprecated Use `referenceId`.
   */
  search?: string;
  /**
   * @deprecated Use `createdAfter`/`createdBefore`.
   */
  dateRange?: MarketsDateRangeFilter;
}

export interface PositionFilters {
  assetClass?: MarketInstrumentClass;
  state?: MarketPositionState;
  side?: MarketPositionSide;
  riskFlags?: MarketRiskFlag[];
  /**
   * @deprecated Use `state`.
   */
  riskState?: MarketPositionState;
  /**
   * @deprecated Not in canonical contract.
   */
  symbol?: string;
  /**
   * @deprecated Not in canonical contract.
   */
  search?: string;
  /**
   * @deprecated Not in canonical contract.
   */
  dateRange?: MarketsDateRangeFilter;
}

export interface InstrumentDto {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  assetClass: MarketInstrumentClass;
  availability: MarketInstrumentAvailability;
  status: MarketInstrumentStatus;
  chainId: number;
  tickSize: string;
  lotSize: string;
  minNotional: string;
  maxNotional: string;
  pricePrecision: number;
  sizePrecision: number;
  updatedAt: string;
}

export interface InstrumentSummaryDto {
  asOf: string;
  totalInstruments: number;
  tradableInstruments: number;
  haltedInstruments: number;
  byAssetClass: Record<string, number>;
  byStatus: Record<string, number>;
  byAvailability: Record<string, number>;
}

export interface OrderDto {
  id: string;
  referenceId: string;
  idempotencyKey: string;
  correlationId: string;
  accountId: string;
  routeId?: string;
  side: MarketSide;
  type: MarketOrderType;
  status: MarketOrderStatus;
  policyDecision: MarketPolicyDecision;
  reasonCodes: string[];
  baseAsset: string;
  quoteAsset: string;
  size: string;
  filledSize?: string;
  avgExecutionPrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummaryDto {
  asOf: string;
  accountId: string;
  totalOrders: number;
  openOrders: number;
  terminalOrders: number;
  reviewRequiredOrders: number;
  blockedOrders: number;
  byStatus: Record<string, number>;
  bySide: Record<string, number>;
}

export interface UnifiedAssetSnapshotDto {
  canonicalId: string;
  symbol: string;
  decimals: number;
  chainId: number;
  address?: string;
  assetClass?: MarketInstrumentClass;
}

export interface PositionDto {
  id: string;
  accountId: string;
  asset: UnifiedAssetSnapshotDto;
  state: MarketPositionState;
  side: MarketPositionSide;
  quantity: string;
  notionalQuoteAsset: string;
  notionalValue: string;
  netExposureBand: MarketNetExposureBand;
  riskFlags: MarketRiskFlag[];
  updatedAt: string;
}

export interface PositionSummaryDto {
  asOf: string;
  accountId: string;
  totalPositions: number;
  openPositions: number;
  byState: Record<string, number>;
  bySide: Record<string, number>;
  netExposureQuoteAsset: string;
  netExposureValue: string;
  netExposureBand: MarketNetExposureBand;
  riskFlags: MarketRiskFlag[];
}

export interface MarketsListResponse<TItem> {
  asOf: string;
  items: TItem[];
  pagination: MarketsPaginationMeta;
}

export interface MarketsOverviewDto {
  asOf: string;
  apiVersion: string;
  accountId: string;
  healthStatus: MarketsOverviewHealthStatus;
  instruments: InstrumentSummaryDto;
  orders: OrderSummaryDto;
  positions: PositionSummaryDto;
}

export const marketsCanonicalErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "service_unavailable",
  "internal_error",
] as const;
export type MarketsCanonicalErrorCode = (typeof marketsCanonicalErrorCodes)[number];

export interface MarketsServiceErrorDto {
  code: MarketsCanonicalErrorCode | string;
  message: string;
  retryable: boolean;
  source: string;
  reasonCodes?: string[];
  details?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
}
