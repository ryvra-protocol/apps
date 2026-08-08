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

export const marketOrderTypes = ["market", "limit", "rfq"] as const;
export type MarketOrderType = (typeof marketOrderTypes)[number];

export const marketInstrumentClasses = ["crypto", "fiat", "rwa", "metal", "other"] as const;
export type MarketInstrumentClass = (typeof marketInstrumentClasses)[number];

export const marketInstrumentStatuses = ["active", "halted", "delisted"] as const;
export type MarketInstrumentStatus = (typeof marketInstrumentStatuses)[number];

export const marketInstrumentAvailabilities = ["tradable", "close_only", "suspended"] as const;
export type MarketInstrumentAvailability = (typeof marketInstrumentAvailabilities)[number];

export const marketPositionSides = ["long", "short", "flat"] as const;
export type MarketPositionSide = (typeof marketPositionSides)[number];

export const marketPositionRiskStates = ["normal", "watch", "at_risk"] as const;
export type MarketPositionRiskState = (typeof marketPositionRiskStates)[number];

export const marketRiskFlags = [
  "policy_review_required",
  "policy_denied",
  "route_rejected",
  "execution_guardrail_violation",
  "exposure_limit",
  "volatility_halt",
  "liquidity_stress",
] as const;
export type MarketRiskFlag = (typeof marketRiskFlags)[number];

export const marketNetExposureBands = ["net_long", "neutral", "net_short"] as const;
export type MarketNetExposureBand = (typeof marketNetExposureBands)[number];

export type MarketSortDirection = "asc" | "desc";

export interface MarketsDateRangeFilter {
  from?: string;
  to?: string;
}

export interface MarketsPaginationRequest {
  page: number;
  pageSize: number;
}

export interface MarketsSortRequest {
  field: string;
  direction: MarketSortDirection;
}

export interface MarketsPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MarketsListRequest<TFilters extends object> {
  filters?: TFilters;
  pagination?: MarketsPaginationRequest;
  sort?: MarketsSortRequest;
}

export interface MarketsListResponse<TItem> {
  items: TItem[];
  pagination: MarketsPaginationMeta;
}

export interface InstrumentFilters {
  search?: string;
  assetClass?: MarketInstrumentClass;
  status?: MarketInstrumentStatus;
}

export interface OrderFilters {
  search?: string;
  status?: MarketOrderStatus;
  side?: MarketSide;
  type?: MarketOrderType;
  dateRange?: MarketsDateRangeFilter;
}

export interface PositionFilters {
  search?: string;
  symbol?: string;
  side?: MarketPositionSide;
  riskState?: MarketPositionRiskState;
  dateRange?: MarketsDateRangeFilter;
}

export interface InstrumentDto {
  id: string;
  symbol: string;
  name: string;
  assetClass: MarketInstrumentClass;
  availability: MarketInstrumentAvailability;
  status: MarketInstrumentStatus;
  tradable: boolean;
  updatedAt: string;
}

export interface InstrumentSummaryDto {
  totalCount: number;
  activeCount: number;
  haltedCount: number;
  tradableCount: number;
}

export interface OrderDto {
  id: string;
  referenceId: string;
  symbol: string;
  side: MarketSide;
  type: MarketOrderType;
  quantity: string;
  notionalValue: string;
  status: MarketOrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummaryDto {
  totalCount: number;
  openCount: number;
  filledCount: number;
  canceledCount: number;
  failedCount: number;
}

export interface PositionDto {
  id: string;
  accountId: string;
  assetId: string;
  symbol: string;
  side: MarketPositionSide;
  quantity: string;
  entryPrice?: string;
  markPrice?: string;
  unrealizedPnl?: string;
  riskState: MarketPositionRiskState;
  riskFlags: MarketRiskFlag[];
  updatedAt: string;
}

export interface PositionSummaryDto {
  totalCount: number;
  longCount: number;
  shortCount: number;
  flatCount: number;
  atRiskCount: number;
  netExposureBand: MarketNetExposureBand;
}

export interface MarketsOverviewMetricsDto {
  totalInstruments: number;
  activeInstruments: number;
  openOrders: number;
  totalPositions: number;
  atRiskPositions: number;
  netExposureBand: MarketNetExposureBand;
}

export interface MarketsActivityItemDto {
  id: string;
  type: "order" | "position" | "instrument" | "settlement";
  title: string;
  status: string;
  createdAt: string;
  symbol?: string;
  detail?: string;
}

export interface MarketsOverviewDto {
  metrics: MarketsOverviewMetricsDto;
  recentActivity: MarketsActivityItemDto[];
}

export const marketsCanonicalErrorCodes = [
  "policy_denied",
  "policy_review_required",
  "quote_invalid",
  "route_rejected",
  "execution_guardrail_violation",
  "execution_dependency_timeout",
  "execution_dependency_failed",
  "unified_asset_invalid_chain",
  "unified_asset_invalid_decimals",
  "unified_asset_duplicate_pair",
  "unified_asset_invalid_address",
] as const;
export type MarketsCanonicalErrorCode = (typeof marketsCanonicalErrorCodes)[number];

export interface MarketsServiceErrorDto {
  code: MarketsCanonicalErrorCode | string;
  message: string;
  reasonCodes?: string[];
  policyVersion?: string;
  explanation?: string;
  retryable?: boolean;
}
