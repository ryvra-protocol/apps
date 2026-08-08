import {
  marketInstrumentAvailabilities,
  marketInstrumentClasses,
  marketInstrumentStatuses,
  marketOrderStatuses,
  marketOrderTypes,
  marketPolicyDecisions,
  marketPositionSides,
  marketPositionStates,
  marketSides,
  marketRiskFlags,
  type InstrumentFilters,
  type MarketsDateRangeFilter,
  type MarketSortDirection,
  type OrderFilters,
  type PositionFilters,
} from "@ryvra/domain-markets";

export type RouteSearchParams = Record<string, string | string[] | undefined> | undefined;

const instrumentStatusSet = new Set(marketInstrumentStatuses);
const instrumentClassSet = new Set(marketInstrumentClasses);
const instrumentAvailabilitySet = new Set(marketInstrumentAvailabilities);
const orderStatusSet = new Set(marketOrderStatuses);
const orderTypeSet = new Set(marketOrderTypes);
const orderSideSet = new Set(marketSides);
const orderPolicyDecisionSet = new Set(marketPolicyDecisions);
const positionSideSet = new Set(marketPositionSides);
const positionStateSet = new Set(marketPositionStates);
const positionRiskFlagSet = new Set(marketRiskFlags);

export function getFirstParam(searchParams: RouteSearchParams, key: string): string | undefined {
  const raw = searchParams?.[key];
  if (Array.isArray(raw)) {
    return raw[0];
  }

  return raw;
}

function normalizeParam(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function parseDateRange(searchParams: RouteSearchParams): MarketsDateRangeFilter | undefined {
  const from = normalizeParam(getFirstParam(searchParams, "from"));
  const to = normalizeParam(getFirstParam(searchParams, "to"));

  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function parseSortDirection(searchParams: RouteSearchParams): MarketSortDirection {
  return getFirstParam(searchParams, "sortOrder") === "asc" || getFirstParam(searchParams, "sortDirection") === "asc"
    ? "asc"
    : "desc";
}

/**
 * @deprecated Canonical pagination is cursor-first. Use `parseCursor`.
 */
export function parsePage(searchParams: RouteSearchParams): number | undefined {
  if (parseCursor(searchParams)) {
    return undefined;
  }

  const pageValue = Number.parseInt(getFirstParam(searchParams, "page") ?? "", 10);
  return Number.isFinite(pageValue) && pageValue > 0 ? pageValue : undefined;
}

export function parseLimit(searchParams: RouteSearchParams, fallback = 50): number {
  const limitValue = Number.parseInt(
    getFirstParam(searchParams, "limit") ?? getFirstParam(searchParams, "pageSize") ?? String(fallback),
    10,
  );
  if (!Number.isFinite(limitValue) || limitValue <= 0) {
    return fallback;
  }

  return Math.min(limitValue, 200);
}

export function parseCursor(searchParams: RouteSearchParams): string | undefined {
  return normalizeParam(getFirstParam(searchParams, "cursor"));
}

export function parseAccountId(searchParams: RouteSearchParams): string | undefined {
  return normalizeParam(getFirstParam(searchParams, "account_id") ?? getFirstParam(searchParams, "accountId"));
}

export function parseInstrumentStatus(searchParams: RouteSearchParams): InstrumentFilters["status"] | undefined {
  const status = normalizeParam(getFirstParam(searchParams, "status"))?.toLowerCase();
  return status && instrumentStatusSet.has(status as (typeof marketInstrumentStatuses)[number])
    ? (status as InstrumentFilters["status"])
    : undefined;
}

export function parseInstrumentClass(searchParams: RouteSearchParams): InstrumentFilters["assetClass"] | undefined {
  const assetClass = normalizeParam(getFirstParam(searchParams, "assetClass"))?.toLowerCase();
  return assetClass && instrumentClassSet.has(assetClass as (typeof marketInstrumentClasses)[number])
    ? (assetClass as InstrumentFilters["assetClass"])
    : undefined;
}

export function parseInstrumentAvailability(searchParams: RouteSearchParams): InstrumentFilters["availability"] | undefined {
  const availability = normalizeParam(getFirstParam(searchParams, "availability"))?.toLowerCase();
  return availability && instrumentAvailabilitySet.has(availability as (typeof marketInstrumentAvailabilities)[number])
    ? (availability as InstrumentFilters["availability"])
    : undefined;
}

export function parseOrderStatus(searchParams: RouteSearchParams): OrderFilters["status"] | undefined {
  const status = normalizeParam(getFirstParam(searchParams, "status"))?.toLowerCase();
  return status && orderStatusSet.has(status as (typeof marketOrderStatuses)[number]) ? (status as OrderFilters["status"]) : undefined;
}

export function parseOrderSide(searchParams: RouteSearchParams): OrderFilters["side"] | undefined {
  const side = normalizeParam(getFirstParam(searchParams, "side"))?.toLowerCase();
  return side && orderSideSet.has(side as (typeof marketSides)[number]) ? (side as OrderFilters["side"]) : undefined;
}

export function parseOrderType(searchParams: RouteSearchParams): OrderFilters["type"] | undefined {
  const type = normalizeParam(getFirstParam(searchParams, "type"))?.toLowerCase();
  return type && orderTypeSet.has(type as (typeof marketOrderTypes)[number]) ? (type as OrderFilters["type"]) : undefined;
}

export function parseOrderPolicyDecision(searchParams: RouteSearchParams): OrderFilters["policyDecision"] | undefined {
  const decision = normalizeParam(getFirstParam(searchParams, "policyDecision") ?? getFirstParam(searchParams, "policy_decision"))?.toUpperCase();
  return decision && orderPolicyDecisionSet.has(decision as (typeof marketPolicyDecisions)[number])
    ? (decision as OrderFilters["policyDecision"])
    : undefined;
}

export function parsePositionSide(searchParams: RouteSearchParams): PositionFilters["side"] | undefined {
  const side = normalizeParam(getFirstParam(searchParams, "side"))?.toLowerCase();
  return side && positionSideSet.has(side as (typeof marketPositionSides)[number]) ? (side as PositionFilters["side"]) : undefined;
}

export function parsePositionState(searchParams: RouteSearchParams): PositionFilters["state"] | undefined {
  const state = normalizeParam(getFirstParam(searchParams, "state") ?? getFirstParam(searchParams, "riskState"))?.toLowerCase();
  return state && positionStateSet.has(state as (typeof marketPositionStates)[number]) ? (state as PositionFilters["state"]) : undefined;
}

export function parsePositionRiskFlags(searchParams: RouteSearchParams): PositionFilters["riskFlags"] | undefined {
  const raw = normalizeParam(getFirstParam(searchParams, "riskFlag") ?? getFirstParam(searchParams, "risk_flag"));
  if (!raw) {
    return undefined;
  }

  const values = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is string => entry.length > 0 && positionRiskFlagSet.has(entry as (typeof marketRiskFlags)[number]));

  return values.length > 0 ? (values as PositionFilters["riskFlags"]) : undefined;
}
