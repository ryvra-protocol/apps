import {
  marketInstrumentClasses,
  marketInstrumentStatuses,
  marketOrderStatuses,
  marketOrderTypes,
  marketPositionRiskStates,
  marketPositionSides,
  marketSides,
  type InstrumentFilters,
  type MarketsDateRangeFilter,
  type MarketSortDirection,
  type OrderFilters,
  type PositionFilters,
} from "@ryvra/domain-markets";

export type RouteSearchParams = Record<string, string | string[] | undefined> | undefined;

const instrumentStatusSet = new Set(marketInstrumentStatuses);
const instrumentClassSet = new Set(marketInstrumentClasses);
const orderStatusSet = new Set(marketOrderStatuses);
const orderTypeSet = new Set(marketOrderTypes);
const orderSideSet = new Set(marketSides);
const positionSideSet = new Set(marketPositionSides);
const positionRiskStateSet = new Set(marketPositionRiskStates);

export function getFirstParam(searchParams: RouteSearchParams, key: string): string | undefined {
  const raw = searchParams?.[key];
  if (Array.isArray(raw)) {
    return raw[0];
  }

  return raw;
}

export function parseDateRange(searchParams: RouteSearchParams): MarketsDateRangeFilter | undefined {
  const from = getFirstParam(searchParams, "from")?.trim();
  const to = getFirstParam(searchParams, "to")?.trim();

  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function parseSortDirection(searchParams: RouteSearchParams): MarketSortDirection {
  return getFirstParam(searchParams, "sortDirection") === "asc" ? "asc" : "desc";
}

export function parsePage(searchParams: RouteSearchParams): number {
  const pageValue = Number.parseInt(getFirstParam(searchParams, "page") ?? "1", 10);
  return Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
}

export function parsePageSize(searchParams: RouteSearchParams, fallback = 20): number {
  const pageSizeValue = Number.parseInt(getFirstParam(searchParams, "pageSize") ?? String(fallback), 10);
  return Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : fallback;
}

export function parseInstrumentStatus(searchParams: RouteSearchParams): InstrumentFilters["status"] | undefined {
  const status = getFirstParam(searchParams, "status")?.trim().toLowerCase();
  return status && instrumentStatusSet.has(status as (typeof marketInstrumentStatuses)[number])
    ? (status as InstrumentFilters["status"])
    : undefined;
}

export function parseInstrumentClass(searchParams: RouteSearchParams): InstrumentFilters["assetClass"] | undefined {
  const assetClass = getFirstParam(searchParams, "assetClass")?.trim().toLowerCase();
  return assetClass && instrumentClassSet.has(assetClass as (typeof marketInstrumentClasses)[number])
    ? (assetClass as InstrumentFilters["assetClass"])
    : undefined;
}

export function parseOrderStatus(searchParams: RouteSearchParams): OrderFilters["status"] | undefined {
  const status = getFirstParam(searchParams, "status")?.trim().toLowerCase();
  return status && orderStatusSet.has(status as (typeof marketOrderStatuses)[number]) ? (status as OrderFilters["status"]) : undefined;
}

export function parseOrderSide(searchParams: RouteSearchParams): OrderFilters["side"] | undefined {
  const side = getFirstParam(searchParams, "side")?.trim().toLowerCase();
  return side && orderSideSet.has(side as (typeof marketSides)[number]) ? (side as OrderFilters["side"]) : undefined;
}

export function parseOrderType(searchParams: RouteSearchParams): OrderFilters["type"] | undefined {
  const type = getFirstParam(searchParams, "type")?.trim().toLowerCase();
  return type && orderTypeSet.has(type as (typeof marketOrderTypes)[number]) ? (type as OrderFilters["type"]) : undefined;
}

export function parsePositionSide(searchParams: RouteSearchParams): PositionFilters["side"] | undefined {
  const side = getFirstParam(searchParams, "side")?.trim().toLowerCase();
  return side && positionSideSet.has(side as (typeof marketPositionSides)[number]) ? (side as PositionFilters["side"]) : undefined;
}

export function parsePositionRiskState(searchParams: RouteSearchParams): PositionFilters["riskState"] | undefined {
  const riskState = getFirstParam(searchParams, "riskState")?.trim().toLowerCase();
  return riskState && positionRiskStateSet.has(riskState as (typeof marketPositionRiskStates)[number])
    ? (riskState as PositionFilters["riskState"])
    : undefined;
}
