import type {
  InvoiceFilters,
  PayDateRangeFilter,
  PayListRequest,
  PayoutFilters,
  ReconciliationFilters,
} from "@ryvra/domain-payments";
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
  PAY_PARITY_CHECK_MARKER,
  PAY_PROTOCOL_COMPATIBILITY_VERSION,
  PAY_PROTOCOL_SOURCE,
  payRouteMap,
} from "./pay-parity";
import { createFetchTransport } from "./transport";
import type {
  ApiClient,
  ApiRequest,
  ApiResult,
  CreateApiClientOptions,
  CreatePayClientOptions,
  PayClient,
  PayConnectivityCheckResult,
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

function executeWithDecoder<T>(transport: Transport, request: ApiRequest, decode: Decoder<T>): Promise<T> {
  return executeRaw<unknown>(transport, request).then((payload) => {
    try {
      return decode(payload);
    } catch (error) {
      throw new ApiClientError({
        code: "pay_payload_validation_failed",
        message: error instanceof Error ? error.message : "Pay payload validation failed",
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

function setDateRange(params: URLSearchParams, dateRange: PayDateRangeFilter | undefined): void {
  setIfPresent(params, "from", dateRange?.from);
  setIfPresent(params, "to", dateRange?.to);
}

function setPaginationAndSort<TFilters extends object>(
  params: URLSearchParams,
  request: PayListRequest<TFilters> | undefined,
): void {
  if (!request) {
    return;
  }

  setIfPresent(params, "page", request.pagination?.page);
  setIfPresent(params, "page_size", request.pagination?.pageSize);
  setIfPresent(params, "sort_field", request.sort?.field);
  setIfPresent(params, "sort_direction", request.sort?.direction);
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
  payOptions: PayRuntimeHeaderOptions | undefined,
  requestOptions: PayRequestOptions | undefined,
): string | undefined {
  const rawToken = resolveHeaderWithFallback(requestOptions?.authToken, payOptions?.authTokenProvider) ??
    normalizeHeaderValue(payOptions?.authToken);

  if (!rawToken) {
    return undefined;
  }

  if (rawToken.includes(" ")) {
    return rawToken;
  }

  const scheme = normalizeHeaderValue(payOptions?.authScheme) ?? "Bearer";
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

async function probeConnectivity(transport: Transport, path: string): Promise<PayConnectivityCheckResult> {
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

export function createPayClient(options: CreatePayClientOptions = {}): PayClient {
  return buildPayClient(createTransport(options), options);
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const transport = createTransport(options);

  return {
    markets: {
      listAssets() {
        return executeRaw(transport, { method: "GET", path: "/markets/assets" });
      },
      listPositions() {
        return executeRaw(transport, { method: "GET", path: "/markets/positions" });
      },
      previewExecution(intent) {
        return executeRaw(transport, {
          method: "POST",
          path: "/markets/execution/preview",
          body: intent,
        });
      },
    },
    pay: buildPayClient(transport, options),
    pointsTasks: {
      getEligibility(accountId) {
        return executeRaw(transport, {
          method: "GET",
          path: `/points-tasks/eligibility?accountId=${encodeURIComponent(accountId)}`,
        });
      },
      previewConversion(payload) {
        return executeRaw(transport, {
          method: "POST",
          path: "/points-tasks/conversion/preview",
          body: payload,
        });
      },
    },
  };
}
