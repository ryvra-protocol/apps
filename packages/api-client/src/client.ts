import type {
  InvoiceFilters,
  PayDateRangeFilter,
  PayListRequest,
  PayoutFilters,
  ReconciliationFilters,
} from "@ryvra/domain-payments";
import { ApiClientError } from "./errors";
import { createMockTransport } from "./mock-transport";
import { createFetchTransport } from "./transport";
import type {
  ApiClient,
  ApiRequest,
  ApiResult,
  CreateApiClientOptions,
  CreatePayClientOptions,
  PayClient,
  Transport,
} from "./types";

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

function execute<T>(transport: Transport, request: ApiRequest): Promise<T> {
  return unwrap(transport.request<T>(request));
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
  setIfPresent(params, "pageSize", request.pagination?.pageSize);
  setIfPresent(params, "sortField", request.sort?.field);
  setIfPresent(params, "sortDirection", request.sort?.direction);
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
  setIfPresent(params, "destinationType", request?.filters?.destinationType);
  setDateRange(params, request?.filters?.dateRange);
  return toQueryString(params);
}

function buildPayoutSummaryQuery(filters: PayoutFilters | undefined): string {
  const params = new URLSearchParams();
  setIfPresent(params, "status", filters?.status);
  setIfPresent(params, "destinationType", filters?.destinationType);
  setDateRange(params, filters?.dateRange);
  return toQueryString(params);
}

function buildReconciliationListQuery(request: PayListRequest<ReconciliationFilters> | undefined): string {
  const params = new URLSearchParams();
  setPaginationAndSort(params, request);
  setIfPresent(params, "status", request?.filters?.status);
  setIfPresent(params, "exceptionOnly", request?.filters?.exceptionOnly);
  setDateRange(params, request?.filters?.dateRange);
  return toQueryString(params);
}

function buildReconciliationSummaryQuery(filters: ReconciliationFilters | undefined): string {
  const params = new URLSearchParams();
  setIfPresent(params, "status", filters?.status);
  setIfPresent(params, "exceptionOnly", filters?.exceptionOnly);
  setDateRange(params, filters?.dateRange);
  return toQueryString(params);
}

function buildPayClient(transport: Transport): PayClient {
  return {
    listInvoices(request) {
      return execute(transport, {
        method: "GET",
        path: `/pay/invoices${buildInvoiceListQuery(request)}`,
      });
    },
    getInvoiceSummary(filters) {
      return execute(transport, {
        method: "GET",
        path: `/pay/invoices/summary${buildInvoiceSummaryQuery(filters)}`,
      });
    },
    listPayouts(request) {
      return execute(transport, {
        method: "GET",
        path: `/pay/payouts${buildPayoutListQuery(request)}`,
      });
    },
    getPayoutSummary(filters) {
      return execute(transport, {
        method: "GET",
        path: `/pay/payouts/summary${buildPayoutSummaryQuery(filters)}`,
      });
    },
    listReconciliationItems(request) {
      return execute(transport, {
        method: "GET",
        path: `/pay/reconciliation/items${buildReconciliationListQuery(request)}`,
      });
    },
    getReconciliationSummary(filters) {
      return execute(transport, {
        method: "GET",
        path: `/pay/reconciliation/summary${buildReconciliationSummaryQuery(filters)}`,
      });
    },
    getPayOverview() {
      return execute(transport, {
        method: "GET",
        path: "/pay/overview",
      });
    },
    listSubscriptions() {
      return execute(transport, {
        method: "GET",
        path: "/pay/subscriptions",
      });
    },
  };
}

export function createPayClient(options: CreatePayClientOptions = {}): PayClient {
  return buildPayClient(createTransport(options));
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const transport = createTransport(options);

  return {
    markets: {
      listAssets() {
        return execute(transport, { method: "GET", path: "/markets/assets" });
      },
      listPositions() {
        return execute(transport, { method: "GET", path: "/markets/positions" });
      },
      previewExecution(intent) {
        return execute(transport, {
          method: "POST",
          path: "/markets/execution/preview",
          body: intent,
        });
      },
    },
    pay: buildPayClient(transport),
    pointsTasks: {
      getEligibility(accountId) {
        return execute(transport, {
          method: "GET",
          path: `/points-tasks/eligibility?accountId=${encodeURIComponent(accountId)}`,
        });
      },
      previewConversion(payload) {
        return execute(transport, {
          method: "POST",
          path: "/points-tasks/conversion/preview",
          body: payload,
        });
      },
    },
  };
}
