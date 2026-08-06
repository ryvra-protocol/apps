import type { ApiClient, ApiRequest, ApiResult, CreateApiClientOptions, Transport } from "./types";
import { createMockTransport } from "./mock-transport";
import { createFetchTransport } from "./transport";

async function unwrap<T>(resultPromise: Promise<ApiResult<T>>): Promise<T> {
  const result = await resultPromise;
  if (result.ok) {
    return result.data;
  }

  throw new Error(`${result.error.code}:${result.error.message}`);
}

function createTransport(options: CreateApiClientOptions): Transport {
  if (options.transport) {
    return options.transport;
  }

  if (options.mode === "live") {
    return createFetchTransport({
      baseUrl: options.baseUrl ?? "http://localhost:4000",
    });
  }

  return createMockTransport();
}

function execute<T>(transport: Transport, request: ApiRequest): Promise<T> {
  return unwrap(transport.request<T>(request));
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
    pay: {
      listInvoices() {
        return execute(transport, { method: "GET", path: "/pay/invoices" });
      },
      listPayouts() {
        return execute(transport, { method: "GET", path: "/pay/payouts" });
      },
      listSubscriptions() {
        return execute(transport, { method: "GET", path: "/pay/subscriptions" });
      },
    },
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
