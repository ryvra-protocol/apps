import type {
  InstrumentFilters,
  MarketsAccountScopedListRequest,
  MarketsAccountScopedRequest,
  MarketsAccountScopedSummaryRequest,
  MarketsDateRangeFilter,
  MarketsListRequest,
  OrderFilters,
  PositionFilters,
} from "@ryvra/domain-markets";
import type {
  InvoiceFilters,
  PayDateRangeFilter,
  PayListRequest,
  PayoutFilters,
  ReconciliationFilters,
} from "@ryvra/domain-payments";
import type {
  PointEntryFilters,
  PointsAccountScopedListRequest,
  PointsAccountScopedRequest,
  PointsAccountScopedSummaryRequest,
} from "@ryvra/domain-points";
import type {
  TaskFilters,
  TasksAccountScopedListRequest,
  TasksAccountScopedRequest,
  TasksAccountScopedSummaryRequest,
} from "@ryvra/domain-tasks";
import { ApiClientError } from "./errors";
import { createMockTransport } from "./mock-transport";
import {
  decodeInvoiceList,
  decodeInvoiceSummary,
  decodePaymentIntent,
  decodePayOverview,
  decodePayoutList,
  decodePayoutSummary,
  decodeReconciliationList,
  decodeReconciliationResult,
  decodeReconciliationSummary,
  decodeSubscriptions,
} from "./pay-codec";
import {
  decodeInstrumentList,
  decodeInstrumentSummary,
  decodeMarketsOverview,
  decodeOrderList,
  decodeOrderSummary,
  decodePositionList,
  decodePositionSummary,
} from "./markets-codec";
import {
  decodePointEntriesList,
  decodePointSummary,
  decodePointsOverview,
  decodeTaskSummary,
  decodeTasksList,
  decodeTasksOverview,
} from "./points-tasks-codec";
import {
  MARKETS_PROTOCOL_CHANGELOG_PATH,
  MARKETS_PARITY_CHECK_MARKER,
  MARKETS_PROTOCOL_COMPATIBILITY_VERSION,
  MARKETS_PROTOCOL_OPENAPI_COMMIT,
  MARKETS_PROTOCOL_OPENAPI_PATH,
  MARKETS_PROTOCOL_OPENAPI_SHA,
  MARKETS_PROTOCOL_SOURCE,
  marketsAccountScopedRoutes,
  marketsRouteMap,
} from "./markets-parity";
import {
  PAY_PARITY_CHECK_MARKER,
  PAY_PROTOCOL_COMPATIBILITY_VERSION,
  PAY_PROTOCOL_SOURCE,
  payRouteMap,
} from "./pay-parity";
import {
  POINTS_TASKS_API_OPENAPI_AVAILABLE,
  POINTS_TASKS_CONTRACT_SCHEMA_VERSION,
  POINTS_TASKS_CONTRACTS_EVENTS_PATH,
  POINTS_TASKS_CONTRACTS_IDS_PATH,
  POINTS_TASKS_DEPRECATED_FIELD_REMOVAL_NOT_BEFORE,
  POINTS_TASKS_DEPRECATED_PAGE_REMOVAL_NOT_BEFORE,
  POINTS_TASKS_PARITY_CHECK_MARKER,
  POINTS_TASKS_POLICY_DOC_PATH,
  POINTS_TASKS_POLICY_SOURCE,
  POINTS_TASKS_PROTOCOL_COMPATIBILITY_VERSION,
  POINTS_TASKS_PROTOCOL_DOC_PATH,
  POINTS_TASKS_PROTOCOL_FAQ_PATH,
  POINTS_TASKS_PROTOCOL_SOURCE,
  pointsTasksAccountScopedRoutes,
  pointsTasksRouteMap,
} from "./points-tasks-parity";
import { createFetchTransport } from "./transport";
import type {
  ApiClient,
  ApiErrorSource,
  ApiRequest,
  ApiResult,
  CreateApiClientOptions,
  CreatePayClientOptions,
  MarketsClient,
  MarketsRuntimeHeaderOptions,
  PointsTasksClient,
  PointsTasksRuntimeHeaderOptions,
  PayClient,
  PayRequestOptions,
  PayRuntimeHeaderOptions,
  Transport,
} from "./types";

type Decoder<T> = (value: unknown) => T;

async function unwrap<T>(resultPromise: Promise<ApiResult<T>>): Promise<T> {
  const result = await resultPromise;
  if (result.ok) {
    return result.data;
  }

  throw new ApiClientError(result.error);
}

function createTransport(options: CreateApiClientOptions): Transport {
  if (options.transport) {
    return options.transport;
  }

  if (options.mode === "http") {
    return createFetchTransport({
      baseUrl: options.baseUrl ?? "http://localhost:4000",
    });
  }

  return createMockTransport();
}

function executeRaw<T>(transport: Transport, request: ApiRequest): Promise<T> {
  return unwrap(transport.request<T>(request));
}

interface DecoderExecutionOptions {
  validationCode: string;
  validationMessage: string;
}

function executeWithDecoder<T>(
  transport: Transport,
  request: ApiRequest,
  decode: Decoder<T>,
  options: DecoderExecutionOptions,
): Promise<T> {
  return executeRaw<unknown>(transport, request).then((payload) => {
    try {
      return decode(payload);
    } catch (error) {
      throw new ApiClientError({
        code: options.validationCode,
        message: error instanceof Error ? error.message : options.validationMessage,
        retryable: false,
        source: "runtime",
        details: {
          path: request.path,
          method: request.method,
          payload,
        },
      });
    }
  });
}

function setIfPresent(params: URLSearchParams, key: string, value: string | number | boolean | undefined): void {
  if (typeof value === "undefined") {
    return;
  }

  const stringValue = String(value).trim();
  if (stringValue.length === 0) {
    return;
  }

  params.set(key, stringValue);
}

function setDateRange(params: URLSearchParams, dateRange: PayDateRangeFilter | MarketsDateRangeFilter | undefined): void {
  setIfPresent(params, "from", dateRange?.from);
  setIfPresent(params, "to", dateRange?.to);
}

interface ListRequestLike<TFilters extends object> {
  filters?: TFilters;
  pagination?: {
    page?: number;
    pageSize?: number;
  };
  sort?: {
    field?: string;
    direction?: string;
  };
}

function setPaginationAndSort<TFilters extends object>(
  params: URLSearchParams,
  request: ListRequestLike<TFilters> | undefined,
): void {
  if (!request) {
    return;
  }

  setIfPresent(params, "page", request.pagination?.page);
  setIfPresent(params, "page_size", request.pagination?.pageSize);
  setIfPresent(params, "sort_field", request.sort?.field);
  setIfPresent(params, "sort_direction", request.sort?.direction);
}

interface MarketsListRequestLike<TFilters extends object> {
  filters?: TFilters;
  pagination?: {
    limit?: number;
    cursor?: string;
    page?: number;
    pageSize?: number;
  };
  sort?: {
    field?: string;
    direction?: string;
  };
}

function setMarketsPaginationAndSort<TFilters extends object>(
  params: URLSearchParams,
  request: MarketsListRequestLike<TFilters> | undefined,
): void {
  if (!request) {
    return;
  }

  const limit = request.pagination?.limit ?? request.pagination?.pageSize;
  setIfPresent(params, "limit", limit);

  const cursor = request.pagination?.cursor?.trim();
  if (cursor) {
    params.set("cursor", cursor);
  } else {
    // Deprecated compatibility shim per canonical contract deprecation window (no earlier than 2027-02-08).
    setIfPresent(params, "page", request.pagination?.page);
  }

  setIfPresent(params, "sort_by", request.sort?.field);
  setIfPresent(params, "sort_order", request.sort?.direction);
}

function setCreatedDateRange(
  params: URLSearchParams,
  createdAfter: string | undefined,
  createdBefore: string | undefined,
  dateRange: MarketsDateRangeFilter | undefined,
): void {
  setIfPresent(params, "created_after", createdAfter ?? dateRange?.from);
  setIfPresent(params, "created_before", createdBefore ?? dateRange?.to);
}

function toQueryString(params: URLSearchParams): string {
  const serialized = params.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

function buildInvoiceListQuery(request: PayListRequest<InvoiceFilters> | undefined): string {
  const params = new URLSearchParams();
  setPaginationAndSort(params, request);
  setIfPresent(params, "status", request?.filters?.status);
  setIfPresent(params, "search", request?.filters?.search);
  setDateRange(params, request?.filters?.dateRange);
  return toQueryString(params);
}

function buildInvoiceSummaryQuery(filters: InvoiceFilters | undefined): string {
  const params = new URLSearchParams();
  setIfPresent(params, "status", filters?.status);
  setIfPresent(params, "search", filters?.search);
  setDateRange(params, filters?.dateRange);
  return toQueryString(params);
}

function buildPayoutListQuery(request: PayListRequest<PayoutFilters> | undefined): string {
  const params = new URLSearchParams();
  setPaginationAndSort(params, request);
  setIfPresent(params, "status", request?.filters?.status);
  setIfPresent(params, "destination_type", request?.filters?.destinationType);
  setDateRange(params, request?.filters?.dateRange);
  return toQueryString(params);
}

function buildPayoutSummaryQuery(filters: PayoutFilters | undefined): string {
  const params = new URLSearchParams();
  setIfPresent(params, "status", filters?.status);
  setIfPresent(params, "destination_type", filters?.destinationType);
  setDateRange(params, filters?.dateRange);
  return toQueryString(params);
}

function buildReconciliationListQuery(request: PayListRequest<ReconciliationFilters> | undefined): string {
  const params = new URLSearchParams();
  setPaginationAndSort(params, request);
  setIfPresent(params, "status", request?.filters?.status);
  setIfPresent(params, "exception_only", request?.filters?.exceptionOnly);
  setDateRange(params, request?.filters?.dateRange);
  return toQueryString(params);
}

function buildReconciliationSummaryQuery(filters: ReconciliationFilters | undefined): string {
  const params = new URLSearchParams();
  setIfPresent(params, "status", filters?.status);
  setIfPresent(params, "exception_only", filters?.exceptionOnly);
  setDateRange(params, filters?.dateRange);
  return toQueryString(params);
}

function buildInstrumentListQuery(request: MarketsListRequest<InstrumentFilters> | undefined): string {
  const params = new URLSearchParams();
  setMarketsPaginationAndSort(params, request);
  setIfPresent(params, "q", request?.filters?.q ?? request?.filters?.search);
  setIfPresent(params, "asset_class", request?.filters?.assetClass);
  setIfPresent(params, "status", request?.filters?.status);
  setIfPresent(params, "availability", request?.filters?.availability);
  setIfPresent(params, "chain_id", request?.filters?.chainId);
  return toQueryString(params);
}

function buildInstrumentSummaryQuery(filters: InstrumentFilters | undefined): string {
  const params = new URLSearchParams();
  setIfPresent(params, "q", filters?.q ?? filters?.search);
  setIfPresent(params, "asset_class", filters?.assetClass);
  setIfPresent(params, "status", filters?.status);
  setIfPresent(params, "availability", filters?.availability);
  setIfPresent(params, "chain_id", filters?.chainId);
  return toQueryString(params);
}

function buildOrderListQuery(request: MarketsAccountScopedListRequest<OrderFilters>): string {
  const params = new URLSearchParams();
  setMarketsPaginationAndSort(params, request);
  setIfPresent(params, "account_id", request.accountId);
  setIfPresent(params, "reference_id", request.filters?.referenceId ?? request.filters?.search);
  setIfPresent(params, "correlation_id", request.filters?.correlationId);
  setIfPresent(params, "route_id", request.filters?.routeId);
  setIfPresent(params, "status", request?.filters?.status);
  setIfPresent(params, "side", request?.filters?.side);
  setIfPresent(params, "type", request?.filters?.type);
  setIfPresent(params, "policy_decision", request?.filters?.policyDecision);
  setCreatedDateRange(
    params,
    request.filters?.createdAfter,
    request.filters?.createdBefore,
    request.filters?.dateRange,
  );
  return toQueryString(params);
}

function buildOrderSummaryQuery(request: MarketsAccountScopedSummaryRequest<OrderFilters>): string {
  const params = new URLSearchParams();
  setIfPresent(params, "account_id", request.accountId);
  setIfPresent(params, "reference_id", request.filters?.referenceId ?? request.filters?.search);
  setIfPresent(params, "correlation_id", request.filters?.correlationId);
  setIfPresent(params, "route_id", request.filters?.routeId);
  setIfPresent(params, "status", request.filters?.status);
  setIfPresent(params, "side", request.filters?.side);
  setIfPresent(params, "type", request.filters?.type);
  setIfPresent(params, "policy_decision", request.filters?.policyDecision);
  setCreatedDateRange(
    params,
    request.filters?.createdAfter,
    request.filters?.createdBefore,
    request.filters?.dateRange,
  );
  return toQueryString(params);
}

function buildPositionListQuery(request: MarketsAccountScopedListRequest<PositionFilters>): string {
  const params = new URLSearchParams();
  setMarketsPaginationAndSort(params, request);
  setIfPresent(params, "account_id", request.accountId);
  setIfPresent(params, "asset_class", request.filters?.assetClass);
  setIfPresent(params, "state", request.filters?.state ?? request.filters?.riskState);
  setIfPresent(params, "side", request.filters?.side);
  if (request.filters?.riskFlags && request.filters.riskFlags.length > 0) {
    params.set("risk_flag", request.filters.riskFlags.join(","));
  }
  return toQueryString(params);
}

function buildPositionSummaryQuery(request: MarketsAccountScopedSummaryRequest<PositionFilters>): string {
  const params = new URLSearchParams();
  setIfPresent(params, "account_id", request.accountId);
  setIfPresent(params, "asset_class", request.filters?.assetClass);
  setIfPresent(params, "state", request.filters?.state ?? request.filters?.riskState);
  setIfPresent(params, "side", request.filters?.side);
  if (request.filters?.riskFlags && request.filters.riskFlags.length > 0) {
    params.set("risk_flag", request.filters.riskFlags.join(","));
  }
  return toQueryString(params);
}

function buildMarketsOverviewQuery(request: MarketsAccountScopedRequest): string {
  const params = new URLSearchParams();
  setIfPresent(params, "account_id", request.accountId);
  return toQueryString(params);
}

function buildPointEntriesQuery(request: PointsAccountScopedListRequest<PointEntryFilters>): string {
  const params = new URLSearchParams();
  setMarketsPaginationAndSort(params, request);
  setIfPresent(params, "account_id", request.accountId);
  setIfPresent(params, "type", request.filters?.type ?? request.filters?.entryType);
  setIfPresent(params, "status", request.filters?.status);
  setIfPresent(params, "source", request.filters?.source);
  setIfPresent(params, "search", request.filters?.search);
  setDateRange(params, request.filters?.dateRange);
  return toQueryString(params);
}

function buildPointSummaryQuery(request: PointsAccountScopedSummaryRequest<PointEntryFilters>): string {
  const params = new URLSearchParams();
  setIfPresent(params, "account_id", request.accountId);
  setIfPresent(params, "type", request.filters?.type ?? request.filters?.entryType);
  setIfPresent(params, "status", request.filters?.status);
  setIfPresent(params, "source", request.filters?.source);
  setIfPresent(params, "search", request.filters?.search);
  setDateRange(params, request.filters?.dateRange);
  return toQueryString(params);
}

function buildPointsOverviewQuery(request: PointsAccountScopedRequest): string {
  const params = new URLSearchParams();
  setIfPresent(params, "account_id", request.accountId);
  return toQueryString(params);
}

function buildTasksListQuery(request: TasksAccountScopedListRequest<TaskFilters>): string {
  const params = new URLSearchParams();
  setMarketsPaginationAndSort(params, request);
  setIfPresent(params, "account_id", request.accountId);
  setIfPresent(params, "status", request.filters?.status);
  setIfPresent(params, "type", request.filters?.type);
  setIfPresent(params, "owner_id", request.filters?.ownerId ?? request.filters?.owner);
  setIfPresent(params, "search", request.filters?.search);
  setIfPresent(params, "due_from", request.filters?.dateRange?.from);
  setIfPresent(params, "due_to", request.filters?.dateRange?.to);
  return toQueryString(params);
}

function buildTaskSummaryQuery(request: TasksAccountScopedSummaryRequest<TaskFilters>): string {
  const params = new URLSearchParams();
  setIfPresent(params, "account_id", request.accountId);
  setIfPresent(params, "status", request.filters?.status);
  setIfPresent(params, "type", request.filters?.type);
  setIfPresent(params, "owner_id", request.filters?.ownerId ?? request.filters?.owner);
  setIfPresent(params, "search", request.filters?.search);
  setIfPresent(params, "due_from", request.filters?.dateRange?.from);
  setIfPresent(params, "due_to", request.filters?.dateRange?.to);
  return toQueryString(params);
}

function buildTasksOverviewQuery(request: TasksAccountScopedRequest): string {
  const params = new URLSearchParams();
  setIfPresent(params, "account_id", request.accountId);
  return toQueryString(params);
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeHeaderValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function resolveHeaderWithFallback(
  provided: string | undefined,
  runtimeProvider: (() => string | undefined) | undefined,
): string | undefined {
  const providerValue = runtimeProvider ? normalizeHeaderValue(runtimeProvider()) : undefined;
  return normalizeHeaderValue(provided) ?? providerValue;
}

function resolveAuthorizationValue(
  runtimeOptions: Pick<PayRuntimeHeaderOptions, "authToken" | "authTokenProvider" | "authScheme"> | undefined,
  requestOptions: Pick<PayRequestOptions, "authToken"> | undefined,
): string | undefined {
  const rawToken = resolveHeaderWithFallback(requestOptions?.authToken, runtimeOptions?.authTokenProvider) ??
    normalizeHeaderValue(runtimeOptions?.authToken);

  if (!rawToken) {
    return undefined;
  }

  if (rawToken.includes(" ")) {
    return rawToken;
  }

  const scheme = normalizeHeaderValue(runtimeOptions?.authScheme) ?? "Bearer";
  return `${scheme} ${rawToken}`;
}

function buildPayHeaders(
  mode: CreateApiClientOptions["mode"],
  payOptions: PayRuntimeHeaderOptions | undefined,
  requestOptions: PayRequestOptions | undefined,
  method: ApiRequest["method"],
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(payOptions?.staticHeaders ?? {}),
  };

  if (mode === "mock") {
    return {
      ...headers,
      ...(requestOptions?.headers ?? {}),
    };
  }

  const authorization = resolveAuthorizationValue(payOptions, requestOptions);
  if (authorization) {
    headers.authorization = authorization;
  }

  const requestIdHeader = normalizeHeaderValue(payOptions?.requestIdHeader) ?? "x-request-id";
  const requestId = normalizeHeaderValue(requestOptions?.requestId) ??
    normalizeHeaderValue(payOptions?.requestIdProvider?.()) ??
    createRequestId();
  headers[requestIdHeader] = requestId;

  const correlationIdHeader = normalizeHeaderValue(payOptions?.correlationIdHeader) ?? "x-correlation-id";
  const correlationId = normalizeHeaderValue(requestOptions?.correlationId) ??
    normalizeHeaderValue(payOptions?.correlationIdProvider?.()) ??
    requestId;
  headers[correlationIdHeader] = correlationId;

  const idempotencyKey = normalizeHeaderValue(requestOptions?.idempotencyKey);
  if (idempotencyKey && method !== "GET") {
    const idempotencyHeader = normalizeHeaderValue(payOptions?.idempotencyHeader) ?? "idempotency-key";
    headers[idempotencyHeader] = idempotencyKey;
  }

  return {
    ...headers,
    ...(requestOptions?.headers ?? {}),
  };
}

function buildMarketsHeaders(
  mode: CreateApiClientOptions["mode"],
  marketsOptions: MarketsRuntimeHeaderOptions | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(marketsOptions?.staticHeaders ?? {}),
  };

  if (mode === "mock") {
    return headers;
  }

  const authorization = resolveAuthorizationValue(marketsOptions, undefined);
  if (authorization) {
    headers.authorization = authorization;
  }

  const requestIdHeader = normalizeHeaderValue(marketsOptions?.requestIdHeader) ?? "x-request-id";
  const requestId = normalizeHeaderValue(marketsOptions?.requestIdProvider?.()) ?? createRequestId();
  headers[requestIdHeader] = requestId;
  headers["x-request-id"] = requestId;

  const correlationIdHeader = normalizeHeaderValue(marketsOptions?.correlationIdHeader) ?? "x-correlation-id";
  const correlationId = normalizeHeaderValue(marketsOptions?.correlationIdProvider?.()) ?? requestId;
  headers[correlationIdHeader] = correlationId;
  headers["x-correlation-id"] = correlationId;

  return headers;
}

function buildPointsTasksHeaders(
  mode: CreateApiClientOptions["mode"],
  pointsTasksOptions: PointsTasksRuntimeHeaderOptions | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(pointsTasksOptions?.staticHeaders ?? {}),
  };

  const requestIdHeader = normalizeHeaderValue(pointsTasksOptions?.requestIdHeader) ?? "x-request-id";
  const requestId = normalizeHeaderValue(pointsTasksOptions?.requestIdProvider?.()) ?? createRequestId();
  headers[requestIdHeader] = requestId;
  headers["x-request-id"] = requestId;

  const correlationIdHeader = normalizeHeaderValue(pointsTasksOptions?.correlationIdHeader) ?? "x-correlation-id";
  const correlationId = normalizeHeaderValue(pointsTasksOptions?.correlationIdProvider?.()) ?? requestId;
  headers[correlationIdHeader] = correlationId;
  headers["x-correlation-id"] = correlationId;

  if (mode === "mock") {
    return headers;
  }

  const authorization = resolveAuthorizationValue(pointsTasksOptions, undefined);
  if (authorization) {
    headers.authorization = authorization;
  }

  return headers;
}

function extractPathname(path: string): string {
  try {
    return new URL(path, "http://localhost").pathname;
  } catch {
    const [pathname] = path.split("?");
    return pathname ?? path;
  }
}

function getSearchParam(path: string, key: string): string | undefined {
  try {
    const url = new URL(path, "http://localhost");
    const value = url.searchParams.get(key)?.trim();
    return value && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function createMarketsValidationError(code: string, message: string, details: Record<string, unknown>): ApiClientError {
  return new ApiClientError({
    code,
    message,
    retryable: false,
    source: "runtime",
    details,
  });
}

function createPointsTasksValidationError(code: string, message: string, details: Record<string, unknown>): ApiClientError {
  return new ApiClientError({
    code,
    message,
    retryable: false,
    source: "runtime",
    details,
  });
}

function enforceMarketsHttpGuards(
  mode: CreateApiClientOptions["mode"],
  request: ApiRequest,
  headers: Record<string, string>,
): void {
  if (mode !== "http") {
    return;
  }

  const pathname = extractPathname(request.path);
  const isHealthRoute = pathname === "/health";

  if (!isHealthRoute) {
    const authorization = headers.authorization?.trim();
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw createMarketsValidationError("unauthorized", "bearer token is required for non-health Markets routes", {
        path: request.path,
        method: request.method,
      });
    }
  }

  const requestId = headers["x-request-id"]?.trim();
  const correlationId = headers["x-correlation-id"]?.trim();
  if (!requestId || !correlationId) {
    throw createMarketsValidationError("invalid_request", "x-request-id and x-correlation-id are required for Markets requests", {
      path: request.path,
      method: request.method,
    });
  }

  if (marketsAccountScopedRoutes.includes(pathname as (typeof marketsAccountScopedRoutes)[number])) {
    const accountId = getSearchParam(request.path, "account_id");
    if (!accountId) {
      throw createMarketsValidationError("invalid_request", "account_id is required for this Markets endpoint", {
        path: request.path,
        method: request.method,
        requiredParam: "account_id",
      });
    }
  }
}

function enforcePointsTasksHttpGuards(
  mode: CreateApiClientOptions["mode"],
  request: ApiRequest,
  headers: Record<string, string>,
): void {
  if (mode !== "http") {
    return;
  }

  const pathname = extractPathname(request.path);
  const isHealthOrStatusRoute =
    pathname === "/health" || pathname === pointsTasksRouteMap.status || pathname === pointsTasksRouteMap.getParityDiagnostics;

  if (!isHealthOrStatusRoute) {
    const authorization = headers.authorization?.trim();
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw createPointsTasksValidationError(
        "unauthorized",
        "bearer token is required for non-health Points/Tasks routes",
        {
          path: request.path,
          method: request.method,
        },
      );
    }
  }

  const requestId = headers["x-request-id"]?.trim();
  const correlationId = headers["x-correlation-id"]?.trim();
  if (!requestId || !correlationId) {
    throw createPointsTasksValidationError(
      "invalid_request",
      "x-request-id and x-correlation-id are required for Points/Tasks requests",
      {
        path: request.path,
        method: request.method,
      },
    );
  }

  if (pointsTasksAccountScopedRoutes.includes(pathname as (typeof pointsTasksAccountScopedRoutes)[number])) {
    const accountId = getSearchParam(request.path, "account_id");
    if (!accountId) {
      throw createPointsTasksValidationError(
        "invalid_request",
        "account_id is required for this Points/Tasks endpoint",
        {
          path: request.path,
          method: request.method,
          requiredParam: "account_id",
        },
      );
    }
  }
}

interface ConnectivityCheckResult {
  checkedAt: string;
  path: string;
  ok: boolean;
  source: ApiErrorSource;
  status?: number;
  message: string;
}

async function probeConnectivity(transport: Transport, path: string): Promise<ConnectivityCheckResult> {
  const checkedAt = new Date().toISOString();
  const probe = await transport.request<unknown>({ method: "GET", path });

  if (probe.ok) {
    return {
      checkedAt,
      path,
      ok: true,
      source: "http",
      message: "Connectivity probe succeeded",
    };
  }

  return {
    checkedAt,
    path,
    ok: false,
    source: probe.error.source,
    ...(typeof probe.error.status === "number" ? { status: probe.error.status } : {}),
    message: probe.error.message,
  };
}

function buildPayClient(transport: Transport, options: CreateApiClientOptions): PayClient {
  const mode = options.mode ?? "mock";
  const baseUrl = options.baseUrl ?? "http://localhost:4000";
  const payOptions = options.pay;
  const compatibilityVersion = options.payCompatibilityVersion ?? PAY_PROTOCOL_COMPATIBILITY_VERSION;
  const parityCheckMarker = options.payParityCheckMarker ?? PAY_PARITY_CHECK_MARKER;

  const executePay = <T>(request: ApiRequest, decode: Decoder<T>, requestOptions?: PayRequestOptions): Promise<T> => {
    const headers = buildPayHeaders(mode, payOptions, requestOptions, request.method);

    return executeWithDecoder(
      transport,
      {
        ...request,
        headers: {
          ...(request.headers ?? {}),
          ...headers,
        },
      },
      decode,
      {
        validationCode: "pay_payload_validation_failed",
        validationMessage: "Pay payload validation failed",
      },
    );
  };

  return {
    listInvoices(request) {
      return executePay(
        {
          method: "GET",
          path: `${payRouteMap.listInvoices}${buildInvoiceListQuery(request)}`,
        },
        decodeInvoiceList,
      );
    },
    getInvoiceSummary(filters) {
      return executePay(
        {
          method: "GET",
          path: `${payRouteMap.getInvoiceSummary}${buildInvoiceSummaryQuery(filters)}`,
        },
        decodeInvoiceSummary,
      );
    },
    listPayouts(request) {
      return executePay(
        {
          method: "GET",
          path: `${payRouteMap.listPayouts}${buildPayoutListQuery(request)}`,
        },
        decodePayoutList,
      );
    },
    getPayoutSummary(filters) {
      return executePay(
        {
          method: "GET",
          path: `${payRouteMap.getPayoutSummary}${buildPayoutSummaryQuery(filters)}`,
        },
        decodePayoutSummary,
      );
    },
    listReconciliationItems(request) {
      return executePay(
        {
          method: "GET",
          path: `${payRouteMap.listReconciliationItems}${buildReconciliationListQuery(request)}`,
        },
        decodeReconciliationList,
      );
    },
    getReconciliationSummary(filters) {
      return executePay(
        {
          method: "GET",
          path: `${payRouteMap.getReconciliationSummary}${buildReconciliationSummaryQuery(filters)}`,
        },
        decodeReconciliationSummary,
      );
    },
    getPayOverview() {
      return executePay(
        {
          method: "GET",
          path: payRouteMap.getPayOverview,
        },
        decodePayOverview,
      );
    },
    listSubscriptions() {
      return executePay(
        {
          method: "GET",
          path: payRouteMap.listSubscriptions,
        },
        decodeSubscriptions,
      );
    },
    createPaymentIntent(intent, requestOptions) {
      return executePay(
        {
          method: "POST",
          path: payRouteMap.createPaymentIntent,
          body: intent,
        },
        decodePaymentIntent,
        {
          ...requestOptions,
          idempotencyKey: requestOptions?.idempotencyKey ?? intent.idempotency_key,
        },
      );
    },
    transitionPaymentIntent(intentId, toState, requestOptions) {
      return executePay(
        {
          method: "POST",
          path: payRouteMap.transitionPaymentIntent(intentId),
          body: {
            to_state: toState,
          },
        },
        decodePaymentIntent,
        requestOptions,
      );
    },
    reconcileSettlement(intent, settlement, requestOptions) {
      return executePay(
        {
          method: "POST",
          path: payRouteMap.reconcileSettlement(intent.intent_id),
          body: {
            intent,
            settlement,
          },
        },
        decodeReconciliationResult,
        {
          ...requestOptions,
          idempotencyKey: requestOptions?.idempotencyKey ?? intent.idempotency_key,
        },
      );
    },
    async getParityDiagnostics() {
      if (mode === "mock") {
        return {
          mode,
          baseUrl,
          compatibilityVersion,
          sourceOfTruth: PAY_PROTOCOL_SOURCE,
          parityCheckMarker,
          connectivity: {
            checkedAt: new Date().toISOString(),
            path: "mock://offline",
            ok: true,
            source: "mock",
            message: "Mock mode active; live connectivity probe skipped",
          },
        };
      }

      const primaryPath = payOptions?.connectivityPath ?? "/health";
      const primaryProbe = await probeConnectivity(transport, primaryPath);
      if (primaryProbe.ok || primaryPath === payRouteMap.getPayOverview) {
        return {
          mode,
          baseUrl,
          compatibilityVersion,
          sourceOfTruth: PAY_PROTOCOL_SOURCE,
          parityCheckMarker,
          connectivity: primaryProbe,
        };
      }

      const fallbackProbe = await probeConnectivity(transport, payRouteMap.getPayOverview);

      return {
        mode,
        baseUrl,
        compatibilityVersion,
        sourceOfTruth: PAY_PROTOCOL_SOURCE,
        parityCheckMarker,
        connectivity: fallbackProbe.ok
          ? {
              ...fallbackProbe,
              message: `Primary probe failed (${primaryProbe.message}); fallback probe succeeded`,
            }
          : primaryProbe,
      };
    },
  };
}

function buildMarketsClient(transport: Transport, options: CreateApiClientOptions): MarketsClient {
  const mode = options.mode ?? "mock";
  const baseUrl = options.baseUrl ?? "http://localhost:4000";
  const marketsOptions = options.markets;
  const compatibilityVersion = options.marketsCompatibilityVersion ?? MARKETS_PROTOCOL_COMPATIBILITY_VERSION;
  const parityCheckMarker = options.marketsParityCheckMarker ?? MARKETS_PARITY_CHECK_MARKER;
  const defaultAccountId = normalizeHeaderValue(marketsOptions?.defaultAccountId);

  const resolveAccountId = (provided: string | undefined): string =>
    normalizeHeaderValue(provided) ?? defaultAccountId ?? "";

  const executeMarkets = <T>(request: ApiRequest, decode: Decoder<T>): Promise<T> => {
    const marketHeaders = buildMarketsHeaders(mode, marketsOptions);
    const headers = {
      ...(request.headers ?? {}),
      ...marketHeaders,
    };
    const requestWithHeaders: ApiRequest = {
      ...request,
      headers,
    };

    enforceMarketsHttpGuards(mode, requestWithHeaders, headers);

    return executeWithDecoder(
      transport,
      requestWithHeaders,
      decode,
      {
        validationCode: "markets_payload_validation_failed",
        validationMessage: "Markets payload validation failed",
      },
    );
  };

  const probeMarketsConnectivity = async (path: string): Promise<ConnectivityCheckResult> => {
    const checkedAt = new Date().toISOString();
    const headers = buildMarketsHeaders(mode, marketsOptions);
    const request: ApiRequest = { method: "GET", path, headers };

    try {
      enforceMarketsHttpGuards(mode, request, headers);
    } catch (error) {
      if (error instanceof ApiClientError) {
        return {
          checkedAt,
          path,
          ok: false,
          source: error.source,
          ...(typeof error.status === "number" ? { status: error.status } : {}),
          message: error.message,
        };
      }

      return {
        checkedAt,
        path,
        ok: false,
        source: "runtime",
        message: error instanceof Error ? error.message : "Unknown markets connectivity guard failure",
      };
    }

    const probe = await transport.request<unknown>(request);
    if (probe.ok) {
      return {
        checkedAt,
        path,
        ok: true,
        source: "http",
        message: "Connectivity probe succeeded",
      };
    }

    return {
      checkedAt,
      path,
      ok: false,
      source: probe.error.source,
      ...(typeof probe.error.status === "number" ? { status: probe.error.status } : {}),
      message: probe.error.message,
    };
  };

  return {
    listInstruments(request) {
      return executeMarkets(
        {
          method: "GET",
          path: `${marketsRouteMap.listInstruments}${buildInstrumentListQuery(request)}`,
        },
        decodeInstrumentList,
      );
    },
    getInstrumentSummary(filters) {
      return executeMarkets(
        {
          method: "GET",
          path: `${marketsRouteMap.getInstrumentSummary}${buildInstrumentSummaryQuery(filters)}`,
        },
        decodeInstrumentSummary,
      );
    },
    listOrders(request) {
      const scopedRequest: MarketsAccountScopedListRequest<OrderFilters> = {
        ...request,
        accountId: resolveAccountId(request.accountId),
      };
      return executeMarkets(
        {
          method: "GET",
          path: `${marketsRouteMap.listOrders}${buildOrderListQuery(scopedRequest)}`,
        },
        decodeOrderList,
      );
    },
    getOrderSummary(request) {
      const scopedRequest: MarketsAccountScopedSummaryRequest<OrderFilters> = {
        ...request,
        accountId: resolveAccountId(request.accountId),
      };
      return executeMarkets(
        {
          method: "GET",
          path: `${marketsRouteMap.getOrderSummary}${buildOrderSummaryQuery(scopedRequest)}`,
        },
        decodeOrderSummary,
      );
    },
    listPositions(request) {
      const scopedRequest: MarketsAccountScopedListRequest<PositionFilters> = {
        ...request,
        accountId: resolveAccountId(request.accountId),
      };
      return executeMarkets(
        {
          method: "GET",
          path: `${marketsRouteMap.listPositions}${buildPositionListQuery(scopedRequest)}`,
        },
        decodePositionList,
      );
    },
    getPositionSummary(request) {
      const scopedRequest: MarketsAccountScopedSummaryRequest<PositionFilters> = {
        ...request,
        accountId: resolveAccountId(request.accountId),
      };
      return executeMarkets(
        {
          method: "GET",
          path: `${marketsRouteMap.getPositionSummary}${buildPositionSummaryQuery(scopedRequest)}`,
        },
        decodePositionSummary,
      );
    },
    getMarketsOverview(request) {
      const scopedRequest: MarketsAccountScopedRequest = {
        accountId: resolveAccountId(request.accountId),
      };
      return executeMarkets(
        {
          method: "GET",
          path: `${marketsRouteMap.getMarketsOverview}${buildMarketsOverviewQuery(scopedRequest)}`,
        },
        decodeMarketsOverview,
      );
    },
    async getParityDiagnostics() {
      const authHeader = resolveAuthorizationValue(marketsOptions, undefined);

      if (mode === "mock") {
        return {
          mode,
          baseUrl,
          compatibilityVersion,
          sourceOfTruth: MARKETS_PROTOCOL_SOURCE,
          sourceOpenApiPath: MARKETS_PROTOCOL_OPENAPI_PATH,
          sourceChangelogPath: MARKETS_PROTOCOL_CHANGELOG_PATH,
          sourceOpenApiSha: MARKETS_PROTOCOL_OPENAPI_SHA,
          sourceOpenApiCommit: MARKETS_PROTOCOL_OPENAPI_COMMIT,
          parityCheckMarker,
          auth: {
            requiredForMarketsRoutes: false,
            hasAuthorization: Boolean(authHeader?.startsWith("Bearer ")),
            requestIdHeader: "x-request-id",
            correlationIdHeader: "x-correlation-id",
          },
          accountScope: {
            ...(defaultAccountId ? { defaultAccountId } : {}),
            requiredEndpoints: marketsAccountScopedRoutes,
          },
          paginationPolicy: {
            preferredMode: "cursor",
            deprecatedParam: "page",
            deprecatedRemovalNotBefore: "2027-02-08",
          },
          deprecatedFieldFallback: {
            canonicalField: "net_exposure_band",
            fallbackField: "net_exposure_bucket",
            fallbackRemovalNotBefore: "2027-02-08",
          },
          connectivity: {
            checkedAt: new Date().toISOString(),
            path: "mock://offline",
            ok: true,
            source: "mock",
            message: "Mock mode active; live connectivity probe skipped",
          },
        };
      }

      const primaryPath = marketsOptions?.connectivityPath ?? "/health";
      const primaryProbe = await probeMarketsConnectivity(primaryPath);
      if (primaryProbe.ok || primaryPath === marketsRouteMap.listInstruments) {
        return {
          mode,
          baseUrl,
          compatibilityVersion,
          sourceOfTruth: MARKETS_PROTOCOL_SOURCE,
          sourceOpenApiPath: MARKETS_PROTOCOL_OPENAPI_PATH,
          sourceChangelogPath: MARKETS_PROTOCOL_CHANGELOG_PATH,
          sourceOpenApiSha: MARKETS_PROTOCOL_OPENAPI_SHA,
          sourceOpenApiCommit: MARKETS_PROTOCOL_OPENAPI_COMMIT,
          parityCheckMarker,
          auth: {
            requiredForMarketsRoutes: true,
            hasAuthorization: Boolean(authHeader?.startsWith("Bearer ")),
            requestIdHeader: "x-request-id",
            correlationIdHeader: "x-correlation-id",
          },
          accountScope: {
            ...(defaultAccountId ? { defaultAccountId } : {}),
            requiredEndpoints: marketsAccountScopedRoutes,
          },
          paginationPolicy: {
            preferredMode: "cursor",
            deprecatedParam: "page",
            deprecatedRemovalNotBefore: "2027-02-08",
          },
          deprecatedFieldFallback: {
            canonicalField: "net_exposure_band",
            fallbackField: "net_exposure_bucket",
            fallbackRemovalNotBefore: "2027-02-08",
          },
          connectivity: primaryProbe,
        };
      }

      const fallbackProbe = await probeMarketsConnectivity(`${marketsRouteMap.listInstruments}?limit=1`);

      return {
        mode,
        baseUrl,
        compatibilityVersion,
        sourceOfTruth: MARKETS_PROTOCOL_SOURCE,
        sourceOpenApiPath: MARKETS_PROTOCOL_OPENAPI_PATH,
        sourceChangelogPath: MARKETS_PROTOCOL_CHANGELOG_PATH,
        sourceOpenApiSha: MARKETS_PROTOCOL_OPENAPI_SHA,
        sourceOpenApiCommit: MARKETS_PROTOCOL_OPENAPI_COMMIT,
        parityCheckMarker,
        auth: {
          requiredForMarketsRoutes: true,
          hasAuthorization: Boolean(authHeader?.startsWith("Bearer ")),
          requestIdHeader: "x-request-id",
          correlationIdHeader: "x-correlation-id",
        },
        accountScope: {
          ...(defaultAccountId ? { defaultAccountId } : {}),
          requiredEndpoints: marketsAccountScopedRoutes,
        },
        paginationPolicy: {
          preferredMode: "cursor",
          deprecatedParam: "page",
          deprecatedRemovalNotBefore: "2027-02-08",
        },
        deprecatedFieldFallback: {
          canonicalField: "net_exposure_band",
          fallbackField: "net_exposure_bucket",
          fallbackRemovalNotBefore: "2027-02-08",
        },
        connectivity: fallbackProbe.ok
          ? {
              ...fallbackProbe,
              message: `Primary probe failed (${primaryProbe.message}); fallback probe succeeded`,
            }
          : primaryProbe,
      };
    },
  };
}

function buildPointsTasksClient(transport: Transport, options: CreateApiClientOptions): PointsTasksClient {
  const mode = options.mode ?? "mock";
  const baseUrl = options.baseUrl ?? "http://localhost:4000";
  const pointsTasksOptions = options.pointsTasks;
  const compatibilityVersion = options.pointsTasksCompatibilityVersion ?? POINTS_TASKS_PROTOCOL_COMPATIBILITY_VERSION;
  const parityCheckMarker = options.pointsTasksParityCheckMarker ?? POINTS_TASKS_PARITY_CHECK_MARKER;
  const defaultAccountId = normalizeHeaderValue(pointsTasksOptions?.defaultAccountId);

  const resolveAccountId = (provided: string | undefined): string =>
    normalizeHeaderValue(provided) ?? defaultAccountId ?? "";
  const resolveRequiredAccountId = (provided: string | undefined, route: string): string => {
    const accountId = resolveAccountId(provided);
    if (!accountId) {
      throw createPointsTasksValidationError("invalid_request", "account_id is required for this Points/Tasks endpoint", {
        route,
        requiredParam: "account_id",
      });
    }

    return accountId;
  };

  const executePointsTasks = <T>(request: ApiRequest, decode: Decoder<T>): Promise<T> => {
    const pointsTasksHeaders = buildPointsTasksHeaders(mode, pointsTasksOptions);
    const headers = {
      ...(request.headers ?? {}),
      ...pointsTasksHeaders,
    };
    const requestWithHeaders: ApiRequest = {
      ...request,
      headers,
    };

    enforcePointsTasksHttpGuards(mode, requestWithHeaders, headers);

    return executeWithDecoder(
      transport,
      requestWithHeaders,
      decode,
      {
        validationCode: "points_tasks_payload_validation_failed",
        validationMessage: "Points/Tasks payload validation failed",
      },
    );
  };

  const probePointsTasksConnectivity = async (path: string): Promise<ConnectivityCheckResult> => {
    const checkedAt = new Date().toISOString();
    const headers = buildPointsTasksHeaders(mode, pointsTasksOptions);
    const request: ApiRequest = { method: "GET", path, headers };

    try {
      enforcePointsTasksHttpGuards(mode, request, headers);
    } catch (error) {
      if (error instanceof ApiClientError) {
        return {
          checkedAt,
          path,
          ok: false,
          source: error.source,
          ...(typeof error.status === "number" ? { status: error.status } : {}),
          message: error.message,
        };
      }

      return {
        checkedAt,
        path,
        ok: false,
        source: "runtime",
        message: error instanceof Error ? error.message : "Unknown points/tasks connectivity guard failure",
      };
    }

    const probe = await transport.request<unknown>(request);
    if (probe.ok) {
      return {
        checkedAt,
        path,
        ok: true,
        source: "http",
        message: "Connectivity probe succeeded",
      };
    }

    return {
      checkedAt,
      path,
      ok: false,
      source: probe.error.source,
      ...(typeof probe.error.status === "number" ? { status: probe.error.status } : {}),
      message: probe.error.message,
    };
  };

  const buildParityDiagnostics = (
    connectivity: ConnectivityCheckResult,
    authRequiredForDataRoutes: boolean,
    hasAuthorization: boolean,
  ) => ({
    mode,
    baseUrl,
    compatibilityVersion,
    sourceOfTruth: POINTS_TASKS_PROTOCOL_SOURCE,
    sourcePolicy: POINTS_TASKS_POLICY_SOURCE,
    sourceProtocolDocPath: POINTS_TASKS_PROTOCOL_DOC_PATH,
    sourceProtocolFaqPath: POINTS_TASKS_PROTOCOL_FAQ_PATH,
    sourceContractsEventsPath: POINTS_TASKS_CONTRACTS_EVENTS_PATH,
    sourceContractsIdsPath: POINTS_TASKS_CONTRACTS_IDS_PATH,
    sourcePolicyDocPath: POINTS_TASKS_POLICY_DOC_PATH,
    sourceContractSchemaVersion: POINTS_TASKS_CONTRACT_SCHEMA_VERSION,
    sourceOpenApiPublished: POINTS_TASKS_API_OPENAPI_AVAILABLE,
    parityCheckMarker,
    auth: {
      requiredForPointsTasksRoutes: authRequiredForDataRoutes,
      statusRouteAuthOptional: true,
      hasAuthorization,
      requestIdHeader: "x-request-id",
      correlationIdHeader: "x-correlation-id",
    },
    accountScope: {
      ...(defaultAccountId ? { defaultAccountId } : {}),
      requiredField: "account_id" as const,
      requiredEndpoints: pointsTasksAccountScopedRoutes,
    },
    paginationPolicy: {
      preferredMode: "cursor" as const,
      deprecatedParam: "page" as const,
      deprecatedRemovalNotBefore: POINTS_TASKS_DEPRECATED_PAGE_REMOVAL_NOT_BEFORE,
    },
    deprecatedFieldFallback: {
      pointsCanonicalField: "running_balance" as const,
      pointsFallbackField: "balance_after" as const,
      tasksCanonicalField: "progress_percent" as const,
      tasksFallbackField: "progress" as const,
      fallbackRemovalNotBefore: POINTS_TASKS_DEPRECATED_FIELD_REMOVAL_NOT_BEFORE,
    },
    connectivity,
  });

  return {
    listPointEntries(request) {
      const scopedRequest: PointsAccountScopedListRequest<PointEntryFilters> = {
        ...request,
        accountId: resolveRequiredAccountId(request.accountId, pointsTasksRouteMap.listPointEntries),
      };
      return executePointsTasks(
        {
          method: "GET",
          path: `${pointsTasksRouteMap.listPointEntries}${buildPointEntriesQuery(scopedRequest)}`,
        },
        decodePointEntriesList,
      );
    },
    getPointSummary(request) {
      const scopedRequest: PointsAccountScopedSummaryRequest<PointEntryFilters> = {
        ...request,
        accountId: resolveRequiredAccountId(request.accountId, pointsTasksRouteMap.getPointSummary),
      };
      return executePointsTasks(
        {
          method: "GET",
          path: `${pointsTasksRouteMap.getPointSummary}${buildPointSummaryQuery(scopedRequest)}`,
        },
        decodePointSummary,
      );
    },
    getPointsOverview(request) {
      const scopedRequest: PointsAccountScopedRequest = {
        accountId: resolveRequiredAccountId(request.accountId, pointsTasksRouteMap.getPointsOverview),
      };
      return executePointsTasks(
        {
          method: "GET",
          path: `${pointsTasksRouteMap.getPointsOverview}${buildPointsOverviewQuery(scopedRequest)}`,
        },
        decodePointsOverview,
      );
    },
    listTasks(request) {
      const scopedRequest: TasksAccountScopedListRequest<TaskFilters> = {
        ...request,
        accountId: resolveRequiredAccountId(request.accountId, pointsTasksRouteMap.listTasks),
      };
      return executePointsTasks(
        {
          method: "GET",
          path: `${pointsTasksRouteMap.listTasks}${buildTasksListQuery(scopedRequest)}`,
        },
        decodeTasksList,
      );
    },
    getTaskSummary(request) {
      const scopedRequest: TasksAccountScopedSummaryRequest<TaskFilters> = {
        ...request,
        accountId: resolveRequiredAccountId(request.accountId, pointsTasksRouteMap.getTaskSummary),
      };
      return executePointsTasks(
        {
          method: "GET",
          path: `${pointsTasksRouteMap.getTaskSummary}${buildTaskSummaryQuery(scopedRequest)}`,
        },
        decodeTaskSummary,
      );
    },
    getTasksOverview(request) {
      const scopedRequest: TasksAccountScopedRequest = {
        accountId: resolveRequiredAccountId(request.accountId, pointsTasksRouteMap.getTasksOverview),
      };
      return executePointsTasks(
        {
          method: "GET",
          path: `${pointsTasksRouteMap.getTasksOverview}${buildTasksOverviewQuery(scopedRequest)}`,
        },
        decodeTasksOverview,
      );
    },
    async getParityDiagnostics() {
      const authHeader = resolveAuthorizationValue(pointsTasksOptions, undefined);

      if (mode === "mock") {
        return buildParityDiagnostics(
          {
            checkedAt: new Date().toISOString(),
            path: "mock://offline",
            ok: true,
            source: "mock",
            message: "Mock mode active; live connectivity probe skipped",
          },
          false,
          Boolean(authHeader?.startsWith("Bearer ")),
        );
      }

      const primaryPath = pointsTasksOptions?.connectivityPath ?? pointsTasksRouteMap.status;
      const primaryProbe = await probePointsTasksConnectivity(primaryPath);
      if (primaryProbe.ok || primaryPath === pointsTasksRouteMap.getParityDiagnostics) {
        return buildParityDiagnostics(primaryProbe, true, Boolean(authHeader?.startsWith("Bearer ")));
      }

      const fallbackAccountId = resolveAccountId(undefined);
      if (!fallbackAccountId) {
        return buildParityDiagnostics(primaryProbe, true, Boolean(authHeader?.startsWith("Bearer ")));
      }

      const fallbackProbe = await probePointsTasksConnectivity(
        `${pointsTasksRouteMap.getPointsOverview}?account_id=${encodeURIComponent(fallbackAccountId)}`,
      );

      return buildParityDiagnostics(
        fallbackProbe.ok
          ? {
              ...fallbackProbe,
              message: `Primary probe failed (${primaryProbe.message}); fallback probe succeeded`,
            }
          : primaryProbe,
        true,
        Boolean(authHeader?.startsWith("Bearer ")),
      );
    },
  };
}

export function createPayClient(options: CreatePayClientOptions = {}): PayClient {
  return buildPayClient(createTransport(options), options);
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const transport = createTransport(options);

  return {
    markets: buildMarketsClient(transport, options),
    pay: buildPayClient(transport, options),
    pointsTasks: buildPointsTasksClient(transport, options),
  };
}
