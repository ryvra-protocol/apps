import type {
  InstrumentDto,
  InstrumentSummaryDto,
  MarketsActivityItemDto,
  MarketsListResponse,
  MarketsOverviewDto,
  OrderDto,
  OrderSummaryDto,
  PositionDto,
  PositionSummaryDto,
} from "@ryvra/domain-markets";
import {
  marketInstrumentAvailabilities,
  marketInstrumentClasses,
  marketInstrumentStatuses,
  marketNetExposureBands,
  marketOrderStatuses,
  marketOrderTypes,
  marketPositionRiskStates,
  marketPositionSides,
  marketRiskFlags,
  marketSides,
} from "@ryvra/domain-markets";

function ensureObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function ensureString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  return ensureString(value, label);
}

function ensureNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }

  return value;
}

function ensureBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }

  return value;
}

function ensureArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function assertEnum(value: string, enumSet: ReadonlySet<string>, label: string): string {
  if (!enumSet.has(value)) {
    throw new Error(`${label} has unsupported enum value: ${value}`);
  }

  return value;
}

function decodePagination(value: unknown): MarketsListResponse<unknown>["pagination"] {
  const pagination = ensureObject(value, "pagination");
  return {
    page: ensureNumber(pagination.page, "pagination.page"),
    pageSize: ensureNumber(pagination.pageSize, "pagination.pageSize"),
    total: ensureNumber(pagination.total, "pagination.total"),
    totalPages: ensureNumber(pagination.totalPages, "pagination.totalPages"),
  };
}

function decodeListResponse<TItem>(value: unknown, decodeItem: (entry: unknown) => TItem): MarketsListResponse<TItem> {
  const payload = ensureObject(value, "markets list response");
  return {
    items: ensureArray(payload.items, "items").map((entry) => decodeItem(entry)),
    pagination: decodePagination(payload.pagination),
  };
}

const instrumentClassSet = new Set(marketInstrumentClasses);
const instrumentStatusSet = new Set(marketInstrumentStatuses);
const instrumentAvailabilitySet = new Set(marketInstrumentAvailabilities);
const marketSideSet = new Set(marketSides);
const orderTypeSet = new Set(marketOrderTypes);
const orderStatusSet = new Set(marketOrderStatuses);
const positionSideSet = new Set(marketPositionSides);
const positionRiskStateSet = new Set(marketPositionRiskStates);
const riskFlagSet = new Set(marketRiskFlags);
const netExposureBandSet = new Set(marketNetExposureBands);
const activityTypeSet = new Set<MarketsActivityItemDto["type"]>(["order", "position", "instrument", "settlement"]);

function decodeInstrument(value: unknown): InstrumentDto {
  const payload = ensureObject(value, "instrument");

  return {
    id: ensureString(payload.id, "instrument.id"),
    symbol: ensureString(payload.symbol, "instrument.symbol"),
    name: ensureString(payload.name, "instrument.name"),
    assetClass: assertEnum(
      ensureString(payload.assetClass, "instrument.assetClass"),
      instrumentClassSet,
      "instrument.assetClass",
    ) as InstrumentDto["assetClass"],
    availability: assertEnum(
      ensureString(payload.availability, "instrument.availability"),
      instrumentAvailabilitySet,
      "instrument.availability",
    ) as InstrumentDto["availability"],
    status: assertEnum(
      ensureString(payload.status, "instrument.status"),
      instrumentStatusSet,
      "instrument.status",
    ) as InstrumentDto["status"],
    tradable: ensureBoolean(payload.tradable, "instrument.tradable"),
    updatedAt: ensureString(payload.updatedAt, "instrument.updatedAt"),
  };
}

function decodeOrder(value: unknown): OrderDto {
  const payload = ensureObject(value, "order");

  return {
    id: ensureString(payload.id, "order.id"),
    referenceId: ensureString(payload.referenceId, "order.referenceId"),
    symbol: ensureString(payload.symbol, "order.symbol"),
    side: assertEnum(ensureString(payload.side, "order.side"), marketSideSet, "order.side") as OrderDto["side"],
    type: assertEnum(ensureString(payload.type, "order.type"), orderTypeSet, "order.type") as OrderDto["type"],
    quantity: ensureString(payload.quantity, "order.quantity"),
    notionalValue: ensureString(payload.notionalValue, "order.notionalValue"),
    status: assertEnum(ensureString(payload.status, "order.status"), orderStatusSet, "order.status") as OrderDto["status"],
    createdAt: ensureString(payload.createdAt, "order.createdAt"),
    updatedAt: ensureString(payload.updatedAt, "order.updatedAt"),
  };
}

function decodePosition(value: unknown): PositionDto {
  const payload = ensureObject(value, "position");
  const entryPrice = optionalString(payload.entryPrice, "position.entryPrice");
  const markPrice = optionalString(payload.markPrice, "position.markPrice");
  const unrealizedPnl = optionalString(payload.unrealizedPnl, "position.unrealizedPnl");

  const riskFlags = ensureArray(payload.riskFlags, "position.riskFlags").map((entry, index) =>
    assertEnum(ensureString(entry, `position.riskFlags[${index}]`), riskFlagSet, `position.riskFlags[${index}]`),
  ) as PositionDto["riskFlags"];

  return {
    id: ensureString(payload.id, "position.id"),
    accountId: ensureString(payload.accountId, "position.accountId"),
    assetId: ensureString(payload.assetId, "position.assetId"),
    symbol: ensureString(payload.symbol, "position.symbol"),
    side: assertEnum(ensureString(payload.side, "position.side"), positionSideSet, "position.side") as PositionDto["side"],
    quantity: ensureString(payload.quantity, "position.quantity"),
    ...(entryPrice ? { entryPrice } : {}),
    ...(markPrice ? { markPrice } : {}),
    ...(unrealizedPnl ? { unrealizedPnl } : {}),
    riskState: assertEnum(
      ensureString(payload.riskState, "position.riskState"),
      positionRiskStateSet,
      "position.riskState",
    ) as PositionDto["riskState"],
    riskFlags,
    updatedAt: ensureString(payload.updatedAt, "position.updatedAt"),
  };
}

function decodeOverviewActivity(value: unknown): MarketsActivityItemDto {
  const payload = ensureObject(value, "markets activity");
  const symbol = optionalString(payload.symbol, "marketsActivity.symbol");
  const detail = optionalString(payload.detail, "marketsActivity.detail");

  return {
    id: ensureString(payload.id, "marketsActivity.id"),
    type: assertEnum(
      ensureString(payload.type, "marketsActivity.type"),
      activityTypeSet,
      "marketsActivity.type",
    ) as MarketsActivityItemDto["type"],
    title: ensureString(payload.title, "marketsActivity.title"),
    status: ensureString(payload.status, "marketsActivity.status"),
    createdAt: ensureString(payload.createdAt, "marketsActivity.createdAt"),
    ...(symbol ? { symbol } : {}),
    ...(detail ? { detail } : {}),
  };
}

export function decodeInstrumentList(value: unknown): MarketsListResponse<InstrumentDto> {
  return decodeListResponse(value, decodeInstrument);
}

export function decodeOrderList(value: unknown): MarketsListResponse<OrderDto> {
  return decodeListResponse(value, decodeOrder);
}

export function decodePositionList(value: unknown): MarketsListResponse<PositionDto> {
  return decodeListResponse(value, decodePosition);
}

export function decodeInstrumentSummary(value: unknown): InstrumentSummaryDto {
  const payload = ensureObject(value, "instrument summary");
  return {
    totalCount: ensureNumber(payload.totalCount, "instrumentSummary.totalCount"),
    activeCount: ensureNumber(payload.activeCount, "instrumentSummary.activeCount"),
    haltedCount: ensureNumber(payload.haltedCount, "instrumentSummary.haltedCount"),
    tradableCount: ensureNumber(payload.tradableCount, "instrumentSummary.tradableCount"),
  };
}

export function decodeOrderSummary(value: unknown): OrderSummaryDto {
  const payload = ensureObject(value, "order summary");
  return {
    totalCount: ensureNumber(payload.totalCount, "orderSummary.totalCount"),
    openCount: ensureNumber(payload.openCount, "orderSummary.openCount"),
    filledCount: ensureNumber(payload.filledCount, "orderSummary.filledCount"),
    canceledCount: ensureNumber(payload.canceledCount, "orderSummary.canceledCount"),
    failedCount: ensureNumber(payload.failedCount, "orderSummary.failedCount"),
  };
}

export function decodePositionSummary(value: unknown): PositionSummaryDto {
  const payload = ensureObject(value, "position summary");
  return {
    totalCount: ensureNumber(payload.totalCount, "positionSummary.totalCount"),
    longCount: ensureNumber(payload.longCount, "positionSummary.longCount"),
    shortCount: ensureNumber(payload.shortCount, "positionSummary.shortCount"),
    flatCount: ensureNumber(payload.flatCount, "positionSummary.flatCount"),
    atRiskCount: ensureNumber(payload.atRiskCount, "positionSummary.atRiskCount"),
    netExposureBand: assertEnum(
      ensureString(payload.netExposureBand, "positionSummary.netExposureBand"),
      netExposureBandSet,
      "positionSummary.netExposureBand",
    ) as PositionSummaryDto["netExposureBand"],
  };
}

export function decodeMarketsOverview(value: unknown): MarketsOverviewDto {
  const payload = ensureObject(value, "markets overview");
  const metrics = ensureObject(payload.metrics, "marketsOverview.metrics");
  const recentActivity = ensureArray(payload.recentActivity, "marketsOverview.recentActivity");

  return {
    metrics: {
      totalInstruments: ensureNumber(metrics.totalInstruments, "marketsOverview.metrics.totalInstruments"),
      activeInstruments: ensureNumber(metrics.activeInstruments, "marketsOverview.metrics.activeInstruments"),
      openOrders: ensureNumber(metrics.openOrders, "marketsOverview.metrics.openOrders"),
      totalPositions: ensureNumber(metrics.totalPositions, "marketsOverview.metrics.totalPositions"),
      atRiskPositions: ensureNumber(metrics.atRiskPositions, "marketsOverview.metrics.atRiskPositions"),
      netExposureBand: assertEnum(
        ensureString(metrics.netExposureBand, "marketsOverview.metrics.netExposureBand"),
        netExposureBandSet,
        "marketsOverview.metrics.netExposureBand",
      ) as MarketsOverviewDto["metrics"]["netExposureBand"],
    },
    recentActivity: recentActivity.map((entry) => decodeOverviewActivity(entry)),
  };
}
