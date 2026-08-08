import type {
  InstrumentDto,
  InstrumentSummaryDto,
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
  marketPolicyDecisions,
  marketPositionSides,
  marketPositionStates,
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

function ensureRecordOfNumbers(value: unknown, label: string): Record<string, number> {
  const payload = ensureObject(value, label);
  const entries = Object.entries(payload).map(([key, entry]) => {
    if (typeof entry !== "number" || Number.isNaN(entry)) {
      throw new Error(`${label}.${key} must be a number`);
    }

    return [key, entry] as const;
  });

  return Object.fromEntries(entries);
}

function assertEnum<T extends string>(value: string, enumSet: ReadonlySet<string>, label: string): T {
  if (!enumSet.has(value)) {
    throw new Error(`${label} has unsupported enum value: ${value}`);
  }

  return value as T;
}

function firstPresent(record: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (typeof record[key] !== "undefined") {
      return record[key];
    }
  }

  return undefined;
}

function deriveAssetPair(symbol: string): { baseAsset: string; quoteAsset: string } {
  const delimiter = symbol.includes("/") ? "/" : symbol.includes("-") ? "-" : undefined;
  if (!delimiter) {
    return { baseAsset: symbol.toLowerCase(), quoteAsset: "usd" };
  }

  const [base, quote] = symbol.split(delimiter);
  return {
    baseAsset: (base ?? symbol).toLowerCase(),
    quoteAsset: (quote ?? "usd").toLowerCase(),
  };
}

const instrumentClassSet = new Set(marketInstrumentClasses);
const instrumentStatusSet = new Set(marketInstrumentStatuses);
const instrumentAvailabilitySet = new Set(marketInstrumentAvailabilities);
const marketSideSet = new Set(marketSides);
const orderTypeSet = new Set(marketOrderTypes);
const orderStatusSet = new Set(marketOrderStatuses);
const policyDecisionSet = new Set(marketPolicyDecisions);
const positionSideSet = new Set(marketPositionSides);
const positionStateSet = new Set(marketPositionStates);
const riskFlagSet = new Set(marketRiskFlags);
const netExposureBandSet = new Set(marketNetExposureBands);
const overviewHealthStatusSet = new Set<MarketsOverviewDto["healthStatus"]>(["pass", "degraded", "fail"]);

function normalizeLegacyExposureBand(value: string): string {
  if (value === "net_long" || value === "net_short") {
    return "high";
  }

  if (value === "neutral") {
    return "flat";
  }

  return value;
}

function decodeNetExposureBand(payload: Record<string, unknown>, label: string): PositionSummaryDto["netExposureBand"] {
  const canonicalValue = optionalString(payload.net_exposure_band ?? payload.netExposureBand, `${label}.net_exposure_band`);
  // Deprecated compatibility alias retained through the published OpenAPI migration window (no earlier than 2027-02-08).
  const fallbackValue = optionalString(payload.net_exposure_bucket, `${label}.net_exposure_bucket`);

  if (!canonicalValue && !fallbackValue) {
    throw new Error(`${label}.net_exposure_band is required`);
  }

  const selected = normalizeLegacyExposureBand(canonicalValue ?? fallbackValue!);
  return assertEnum(selected, netExposureBandSet, `${label}.net_exposure_band`) as PositionSummaryDto["netExposureBand"];
}

function decodePagination(value: unknown): MarketsListResponse<unknown>["pagination"] {
  const page = ensureObject(value, "pagination");

  if (typeof page.limit !== "undefined" || typeof page.has_more !== "undefined") {
    return {
      limit: ensureNumber(page.limit, "pagination.limit"),
      hasMore: ensureBoolean(page.has_more, "pagination.has_more"),
      ...(optionalString(page.next_cursor, "pagination.next_cursor") ? { nextCursor: ensureString(page.next_cursor, "pagination.next_cursor") } : {}),
      ...(typeof page.page === "number" ? { page: ensureNumber(page.page, "pagination.page") } : {}),
    };
  }

  const currentPage = ensureNumber(page.page, "pagination.page");
  const pageSize = ensureNumber(page.pageSize, "pagination.pageSize");
  const totalPages = ensureNumber(page.totalPages, "pagination.totalPages");
  const hasMore = currentPage < totalPages;

  return {
    limit: pageSize,
    hasMore,
    ...(hasMore ? { nextCursor: `legacy-page-${currentPage + 1}` } : {}),
    page: currentPage,
  };
}

function decodeListResponse<TItem>(value: unknown, decodeItem: (entry: unknown) => TItem): MarketsListResponse<TItem> {
  const payload = ensureObject(value, "markets list response");
  const asOfValue = firstPresent(payload, ["as_of", "asOf", "timestamp"]);
  const asOf = optionalString(asOfValue, "as_of") ?? new Date(0).toISOString();
  const rawItems = firstPresent(payload, ["data", "items"]);

  return {
    asOf,
    items: ensureArray(rawItems, "items").map((entry) => decodeItem(entry)),
    pagination: decodePagination(firstPresent(payload, ["page", "pagination"])),
  };
}

function decodeInstrument(value: unknown): InstrumentDto {
  const payload = ensureObject(value, "instrument");
  const symbol = ensureString(firstPresent(payload, ["symbol"]), "instrument.symbol");
  const pair = deriveAssetPair(symbol);

  return {
    id: ensureString(firstPresent(payload, ["instrument_id", "id"]), "instrument.instrument_id"),
    symbol,
    baseAsset: ensureString(firstPresent(payload, ["base_asset"]) ?? pair.baseAsset, "instrument.base_asset"),
    quoteAsset: ensureString(firstPresent(payload, ["quote_asset"]) ?? pair.quoteAsset, "instrument.quote_asset"),
    assetClass: assertEnum(
      ensureString(firstPresent(payload, ["asset_class", "assetClass"]), "instrument.asset_class"),
      instrumentClassSet,
      "instrument.asset_class",
    ) as InstrumentDto["assetClass"],
    availability: assertEnum(
      ensureString(firstPresent(payload, ["availability"]), "instrument.availability"),
      instrumentAvailabilitySet,
      "instrument.availability",
    ) as InstrumentDto["availability"],
    status: assertEnum(
      ensureString(firstPresent(payload, ["status"]), "instrument.status"),
      instrumentStatusSet,
      "instrument.status",
    ) as InstrumentDto["status"],
    chainId: ensureNumber(firstPresent(payload, ["chain_id", "chainId"]) ?? 1, "instrument.chain_id"),
    tickSize: ensureString(firstPresent(payload, ["tick_size", "tickSize"]) ?? "0.01", "instrument.tick_size"),
    lotSize: ensureString(firstPresent(payload, ["lot_size", "lotSize"]) ?? "0.0001", "instrument.lot_size"),
    minNotional: ensureString(firstPresent(payload, ["min_notional", "minNotional"]) ?? "0", "instrument.min_notional"),
    maxNotional: ensureString(firstPresent(payload, ["max_notional", "maxNotional"]) ?? "0", "instrument.max_notional"),
    pricePrecision: ensureNumber(firstPresent(payload, ["price_precision", "pricePrecision"]) ?? 2, "instrument.price_precision"),
    sizePrecision: ensureNumber(firstPresent(payload, ["size_precision", "sizePrecision"]) ?? 6, "instrument.size_precision"),
    updatedAt: ensureString(firstPresent(payload, ["updated_at", "updatedAt"]), "instrument.updated_at"),
  };
}

function decodeOrder(value: unknown): OrderDto {
  const payload = ensureObject(value, "order");
  const symbol = optionalString(firstPresent(payload, ["symbol"]), "order.symbol");
  const pair = deriveAssetPair(symbol ?? "unknown-usd");
  const reasonCodes = firstPresent(payload, ["reason_codes", "reasonCodes"]);

  return {
    id: ensureString(firstPresent(payload, ["order_id", "id"]), "order.order_id"),
    referenceId: ensureString(firstPresent(payload, ["reference_id", "referenceId"]), "order.reference_id"),
    idempotencyKey: ensureString(firstPresent(payload, ["idempotency_key", "idempotencyKey"]) ?? "legacy-idempotency", "order.idempotency_key"),
    correlationId: ensureString(firstPresent(payload, ["correlation_id", "correlationId"]) ?? "legacy-correlation", "order.correlation_id"),
    accountId: ensureString(firstPresent(payload, ["account_id", "accountId"]), "order.account_id"),
    ...(optionalString(firstPresent(payload, ["route_id", "routeId"]), "order.route_id")
      ? { routeId: ensureString(firstPresent(payload, ["route_id", "routeId"]), "order.route_id") }
      : {}),
    side: assertEnum(ensureString(firstPresent(payload, ["side"]), "order.side"), marketSideSet, "order.side") as OrderDto["side"],
    type: assertEnum(ensureString(firstPresent(payload, ["type"]), "order.type"), orderTypeSet, "order.type") as OrderDto["type"],
    status: assertEnum(
      ensureString(firstPresent(payload, ["status"]), "order.status"),
      orderStatusSet,
      "order.status",
    ) as OrderDto["status"],
    policyDecision: assertEnum(
      ensureString(firstPresent(payload, ["policy_decision", "policyDecision"]) ?? "ALLOW", "order.policy_decision"),
      policyDecisionSet,
      "order.policy_decision",
    ) as OrderDto["policyDecision"],
    reasonCodes: ensureArray(reasonCodes ?? [], "order.reason_codes").map((entry, index) =>
      ensureString(entry, `order.reason_codes[${index}]`),
    ),
    baseAsset: ensureString(firstPresent(payload, ["base_asset", "baseAsset"]) ?? pair.baseAsset, "order.base_asset"),
    quoteAsset: ensureString(firstPresent(payload, ["quote_asset", "quoteAsset"]) ?? pair.quoteAsset, "order.quote_asset"),
    size: ensureString(firstPresent(payload, ["size", "quantity"]), "order.size"),
    ...(optionalString(firstPresent(payload, ["filled_size", "filledSize"]), "order.filled_size")
      ? { filledSize: ensureString(firstPresent(payload, ["filled_size", "filledSize"]), "order.filled_size") }
      : {}),
    ...(optionalString(firstPresent(payload, ["avg_execution_price", "avgExecutionPrice"]), "order.avg_execution_price")
      ? { avgExecutionPrice: ensureString(firstPresent(payload, ["avg_execution_price", "avgExecutionPrice"]), "order.avg_execution_price") }
      : {}),
    createdAt: ensureString(firstPresent(payload, ["created_at", "createdAt"]), "order.created_at"),
    updatedAt: ensureString(firstPresent(payload, ["updated_at", "updatedAt"]), "order.updated_at"),
  };
}

function decodePositionState(value: unknown, label: string): PositionDto["state"] {
  const state = ensureString(value, label);

  if (positionStateSet.has(state as PositionDto["state"])) {
    return state as PositionDto["state"];
  }

  if (state === "normal") {
    return "open";
  }

  if (state === "watch") {
    return "reducing";
  }

  if (state === "at_risk") {
    return "suspended";
  }

  throw new Error(`${label} has unsupported enum value: ${state}`);
}

function decodePosition(value: unknown): PositionDto {
  const payload = ensureObject(value, "position");
  const symbol = optionalString(firstPresent(payload, ["symbol"]), "position.symbol");
  const rawAsset = firstPresent(payload, ["asset"]);
  const legacyAssetId = optionalString(firstPresent(payload, ["asset_id", "assetId"]), "position.asset_id");

  const assetPayload = rawAsset ? ensureObject(rawAsset, "position.asset") : undefined;
  const fallbackCanonicalId = legacyAssetId ?? symbol?.toLowerCase() ?? "unknown-asset";

  const riskFlags = ensureArray(firstPresent(payload, ["risk_flags", "riskFlags"]) ?? [], "position.risk_flags").map((entry, index) =>
    assertEnum(ensureString(entry, `position.risk_flags[${index}]`), riskFlagSet, `position.risk_flags[${index}]`),
  ) as PositionDto["riskFlags"];

  return {
    id: ensureString(firstPresent(payload, ["position_id", "id"]), "position.position_id"),
    accountId: ensureString(firstPresent(payload, ["account_id", "accountId"]), "position.account_id"),
    asset: {
      canonicalId: ensureString(firstPresent(assetPayload ?? {}, ["canonical_id"]) ?? fallbackCanonicalId, "position.asset.canonical_id"),
      symbol: ensureString(firstPresent(assetPayload ?? {}, ["symbol"]) ?? symbol ?? "UNKNOWN", "position.asset.symbol"),
      decimals: ensureNumber(firstPresent(assetPayload ?? {}, ["decimals"]) ?? 18, "position.asset.decimals"),
      chainId: ensureNumber(firstPresent(assetPayload ?? {}, ["chain_id"]) ?? 1, "position.asset.chain_id"),
      ...(optionalString(firstPresent(assetPayload ?? {}, ["address"]), "position.asset.address")
        ? { address: ensureString(firstPresent(assetPayload ?? {}, ["address"]), "position.asset.address") }
        : {}),
      ...(optionalString(firstPresent(assetPayload ?? {}, ["asset_class", "assetClass"]), "position.asset.asset_class")
        ? {
            assetClass: assertEnum(
              ensureString(firstPresent(assetPayload ?? {}, ["asset_class", "assetClass"]), "position.asset.asset_class"),
              instrumentClassSet,
              "position.asset.asset_class",
            ),
          }
        : {}),
    },
    state: decodePositionState(firstPresent(payload, ["state", "riskState"]), "position.state"),
    side: assertEnum(
      ensureString(firstPresent(payload, ["side"]), "position.side"),
      positionSideSet,
      "position.side",
    ) as PositionDto["side"],
    quantity: ensureString(firstPresent(payload, ["quantity"]), "position.quantity"),
    notionalQuoteAsset: ensureString(
      firstPresent(payload, ["notional_quote_asset", "notionalQuoteAsset"]) ?? "usd",
      "position.notional_quote_asset",
    ),
    notionalValue: ensureString(firstPresent(payload, ["notional_value", "notionalValue"]) ?? "0", "position.notional_value"),
    netExposureBand: decodeNetExposureBand(payload, "position"),
    riskFlags,
    updatedAt: ensureString(firstPresent(payload, ["updated_at", "updatedAt"]), "position.updated_at"),
  };
}

function decodeInstrumentSummary(value: unknown): InstrumentSummaryDto {
  const payload = ensureObject(value, "instrument summary");

  if (typeof payload.total_instruments !== "undefined") {
    return {
      asOf: ensureString(payload.as_of, "instrumentSummary.as_of"),
      totalInstruments: ensureNumber(payload.total_instruments, "instrumentSummary.total_instruments"),
      tradableInstruments: ensureNumber(payload.tradable_instruments, "instrumentSummary.tradable_instruments"),
      haltedInstruments: ensureNumber(payload.halted_instruments, "instrumentSummary.halted_instruments"),
      byAssetClass: ensureRecordOfNumbers(payload.by_asset_class, "instrumentSummary.by_asset_class"),
      byStatus: ensureRecordOfNumbers(payload.by_status, "instrumentSummary.by_status"),
      byAvailability: ensureRecordOfNumbers(payload.by_availability, "instrumentSummary.by_availability"),
    };
  }

  return {
    asOf: ensureString(firstPresent(payload, ["asOf"]) ?? new Date(0).toISOString(), "instrumentSummary.asOf"),
    totalInstruments: ensureNumber(payload.totalCount, "instrumentSummary.totalCount"),
    tradableInstruments: ensureNumber(payload.tradableCount, "instrumentSummary.tradableCount"),
    haltedInstruments: ensureNumber(payload.haltedCount, "instrumentSummary.haltedCount"),
    byAssetClass: {},
    byStatus: {},
    byAvailability: {},
  };
}

function decodeOrderSummary(value: unknown): OrderSummaryDto {
  const payload = ensureObject(value, "order summary");

  if (typeof payload.total_orders !== "undefined") {
    return {
      asOf: ensureString(payload.as_of, "orderSummary.as_of"),
      accountId: ensureString(payload.account_id, "orderSummary.account_id"),
      totalOrders: ensureNumber(payload.total_orders, "orderSummary.total_orders"),
      openOrders: ensureNumber(payload.open_orders, "orderSummary.open_orders"),
      terminalOrders: ensureNumber(payload.terminal_orders, "orderSummary.terminal_orders"),
      reviewRequiredOrders: ensureNumber(payload.review_required_orders, "orderSummary.review_required_orders"),
      blockedOrders: ensureNumber(payload.blocked_orders, "orderSummary.blocked_orders"),
      byStatus: ensureRecordOfNumbers(payload.by_status, "orderSummary.by_status"),
      bySide: ensureRecordOfNumbers(payload.by_side, "orderSummary.by_side"),
    };
  }

  const totalOrders = ensureNumber(payload.totalCount, "orderSummary.totalCount");
  const openOrders = ensureNumber(payload.openCount, "orderSummary.openCount");
  const filledCount = ensureNumber(payload.filledCount, "orderSummary.filledCount");
  const canceledCount = ensureNumber(payload.canceledCount, "orderSummary.canceledCount");
  const failedCount = ensureNumber(payload.failedCount, "orderSummary.failedCount");

  return {
    asOf: ensureString(firstPresent(payload, ["asOf"]) ?? new Date(0).toISOString(), "orderSummary.asOf"),
    accountId: ensureString(firstPresent(payload, ["accountId"]) ?? "legacy-account", "orderSummary.accountId"),
    totalOrders,
    openOrders,
    terminalOrders: filledCount + canceledCount + failedCount,
    reviewRequiredOrders: 0,
    blockedOrders: 0,
    byStatus: {},
    bySide: {},
  };
}

function decodePositionSummary(value: unknown): PositionSummaryDto {
  const payload = ensureObject(value, "position summary");

  if (typeof payload.total_positions !== "undefined") {
    return {
      asOf: ensureString(payload.as_of, "positionSummary.as_of"),
      accountId: ensureString(payload.account_id, "positionSummary.account_id"),
      totalPositions: ensureNumber(payload.total_positions, "positionSummary.total_positions"),
      openPositions: ensureNumber(payload.open_positions, "positionSummary.open_positions"),
      byState: ensureRecordOfNumbers(payload.by_state, "positionSummary.by_state"),
      bySide: ensureRecordOfNumbers(payload.by_side, "positionSummary.by_side"),
      netExposureQuoteAsset: ensureString(payload.net_exposure_quote_asset, "positionSummary.net_exposure_quote_asset"),
      netExposureValue: ensureString(payload.net_exposure_value, "positionSummary.net_exposure_value"),
      netExposureBand: decodeNetExposureBand(payload, "positionSummary"),
      riskFlags: ensureArray(payload.risk_flags, "positionSummary.risk_flags").map((entry, index) =>
        assertEnum(ensureString(entry, `positionSummary.risk_flags[${index}]`), riskFlagSet, `positionSummary.risk_flags[${index}]`),
      ) as PositionSummaryDto["riskFlags"],
    };
  }

  return {
    asOf: ensureString(firstPresent(payload, ["asOf"]) ?? new Date(0).toISOString(), "positionSummary.asOf"),
    accountId: ensureString(firstPresent(payload, ["accountId"]) ?? "legacy-account", "positionSummary.accountId"),
    totalPositions: ensureNumber(payload.totalCount, "positionSummary.totalCount"),
    openPositions: ensureNumber(payload.longCount, "positionSummary.longCount") + ensureNumber(payload.shortCount, "positionSummary.shortCount"),
    byState: {},
    bySide: {},
    netExposureQuoteAsset: "usd",
    netExposureValue: "0",
    netExposureBand: decodeNetExposureBand(payload, "positionSummary"),
    riskFlags: [],
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

export { decodeInstrumentSummary, decodeOrderSummary, decodePositionSummary };

export function decodeMarketsOverview(value: unknown): MarketsOverviewDto {
  const payload = ensureObject(value, "markets overview");

  if (typeof payload.api_version !== "undefined") {
    const healthStatus = assertEnum(
      ensureString(payload.health_status, "marketsOverview.health_status"),
      overviewHealthStatusSet,
      "marketsOverview.health_status",
    ) as MarketsOverviewDto["healthStatus"];

    return {
      asOf: ensureString(payload.as_of, "marketsOverview.as_of"),
      apiVersion: ensureString(payload.api_version, "marketsOverview.api_version"),
      accountId: ensureString(payload.account_id, "marketsOverview.account_id"),
      healthStatus,
      instruments: decodeInstrumentSummary(payload.instruments),
      orders: decodeOrderSummary(payload.orders),
      positions: decodePositionSummary(payload.positions),
    };
  }

  const metrics = ensureObject(payload.metrics, "marketsOverview.metrics");

  return {
    asOf: ensureString(firstPresent(payload, ["asOf"]) ?? new Date(0).toISOString(), "marketsOverview.asOf"),
    apiVersion: "legacy",
    accountId: ensureString(firstPresent(payload, ["accountId"]) ?? "legacy-account", "marketsOverview.accountId"),
    healthStatus: "degraded",
    instruments: {
      asOf: ensureString(firstPresent(payload, ["asOf"]) ?? new Date(0).toISOString(), "marketsOverview.instruments.asOf"),
      totalInstruments: ensureNumber(metrics.totalInstruments, "marketsOverview.metrics.totalInstruments"),
      tradableInstruments: ensureNumber(metrics.activeInstruments, "marketsOverview.metrics.activeInstruments"),
      haltedInstruments: 0,
      byAssetClass: {},
      byStatus: {},
      byAvailability: {},
    },
    orders: {
      asOf: ensureString(firstPresent(payload, ["asOf"]) ?? new Date(0).toISOString(), "marketsOverview.orders.asOf"),
      accountId: ensureString(firstPresent(payload, ["accountId"]) ?? "legacy-account", "marketsOverview.orders.accountId"),
      totalOrders: ensureNumber(metrics.openOrders, "marketsOverview.metrics.openOrders"),
      openOrders: ensureNumber(metrics.openOrders, "marketsOverview.metrics.openOrders"),
      terminalOrders: 0,
      reviewRequiredOrders: 0,
      blockedOrders: 0,
      byStatus: {},
      bySide: {},
    },
    positions: {
      asOf: ensureString(firstPresent(payload, ["asOf"]) ?? new Date(0).toISOString(), "marketsOverview.positions.asOf"),
      accountId: ensureString(firstPresent(payload, ["accountId"]) ?? "legacy-account", "marketsOverview.positions.accountId"),
      totalPositions: ensureNumber(metrics.totalPositions, "marketsOverview.metrics.totalPositions"),
      openPositions: ensureNumber(metrics.totalPositions, "marketsOverview.metrics.totalPositions"),
      byState: {},
      bySide: {},
      netExposureQuoteAsset: "usd",
      netExposureValue: "0",
      netExposureBand: decodeNetExposureBand(metrics, "marketsOverview.metrics"),
      riskFlags: [],
    },
  };
}
