import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiClient } from "../client";
import { normalizeApiError } from "../errors";
import {
  marketsCanonicalAssetClasses,
  marketsCanonicalOrderStatuses,
  marketsCanonicalPolicyDecisions,
  marketsCanonicalSides,
  marketsRouteMap,
} from "../markets-parity";
import { createFetchTransport } from "../transport";
import type { ApiRequest, ApiResult, Transport } from "../types";

const instrumentFixture = {
  id: "asset-btc-usd",
  symbol: "BTC-USD",
  name: "Bitcoin / US Dollar",
  assetClass: "crypto",
  availability: "tradable",
  status: "active",
  tradable: true,
  updatedAt: "2026-08-06T10:00:00.000Z",
} as const;

const orderFixture = {
  id: "ord-7001",
  referenceId: "ref-7001",
  symbol: "BTC-USD",
  side: "buy",
  type: "market",
  quantity: "0.25",
  notionalValue: "15750.00",
  status: "filled",
  createdAt: "2026-08-05T10:00:00.000Z",
  updatedAt: "2026-08-05T10:00:07.000Z",
} as const;

const positionFixture = {
  id: "pos-8001",
  accountId: "acct-core-1",
  assetId: "asset-btc-usd",
  symbol: "BTC-USD",
  side: "long",
  quantity: "0.80",
  entryPrice: "59820.00",
  markPrice: "63210.00",
  unrealizedPnl: "2712.00",
  riskState: "normal",
  riskFlags: [],
  updatedAt: "2026-08-06T10:05:00.000Z",
} as const;

function createCaptureTransport(handler: (request: ApiRequest) => ApiResult<unknown> | Promise<ApiResult<unknown>>): {
  transport: Transport;
  calls: ApiRequest[];
} {
  const calls: ApiRequest[] = [];

  return {
    calls,
    transport: {
      async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
        calls.push(request);
        const result = await handler(request);
        return result as ApiResult<T>;
      },
    },
  };
}

test("contract decoding validates canonical markets payloads", async () => {
  const { transport } = createCaptureTransport((request) => {
    if (request.path.startsWith(marketsRouteMap.getInstrumentSummary)) {
      return {
        ok: true,
        data: {
          totalCount: 1,
          activeCount: 1,
          haltedCount: 0,
          tradableCount: 1,
        },
      };
    }

    if (request.path.startsWith(marketsRouteMap.listInstruments)) {
      return {
        ok: true,
        data: {
          items: [instrumentFixture],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }

    if (request.path.startsWith(marketsRouteMap.getOrderSummary)) {
      return {
        ok: true,
        data: {
          totalCount: 1,
          openCount: 0,
          filledCount: 1,
          canceledCount: 0,
          failedCount: 0,
        },
      };
    }

    if (request.path.startsWith(marketsRouteMap.listOrders)) {
      return {
        ok: true,
        data: {
          items: [orderFixture],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }

    if (request.path.startsWith(marketsRouteMap.getPositionSummary)) {
      return {
        ok: true,
        data: {
          totalCount: 1,
          longCount: 1,
          shortCount: 0,
          flatCount: 0,
          atRiskCount: 0,
          netExposureBand: "net_long",
        },
      };
    }

    if (request.path.startsWith(marketsRouteMap.listPositions)) {
      return {
        ok: true,
        data: {
          items: [positionFixture],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }

    if (request.path === marketsRouteMap.getMarketsOverview) {
      return {
        ok: true,
        data: {
          metrics: {
            totalInstruments: 1,
            activeInstruments: 1,
            openOrders: 0,
            totalPositions: 1,
            atRiskPositions: 0,
            netExposureBand: "net_long",
          },
          recentActivity: [
            {
              id: "activity-order-1",
              type: "order",
              title: "BTC-USD buy 0.25",
              status: "filled",
              createdAt: "2026-08-05T10:00:07.000Z",
              symbol: "BTC-USD",
              detail: "market • 15750.00",
            },
          ],
        },
      };
    }

    return { ok: false, error: { code: "unhandled", message: "Unhandled route", retryable: false, source: "mock" } };
  });

  const client = createApiClient({ mode: "http", baseUrl: "https://markets.example", transport });

  const instruments = await client.markets.listInstruments();
  const instrumentSummary = await client.markets.getInstrumentSummary();
  const orders = await client.markets.listOrders();
  const orderSummary = await client.markets.getOrderSummary();
  const positions = await client.markets.listPositions();
  const positionSummary = await client.markets.getPositionSummary();
  const overview = await client.markets.getMarketsOverview();

  assert.equal(instruments.items[0]?.symbol, "BTC-USD");
  assert.equal(instrumentSummary.activeCount, 1);
  assert.equal(orders.items[0]?.status, "filled");
  assert.equal(orderSummary.filledCount, 1);
  assert.equal(positions.items[0]?.riskState, "normal");
  assert.equal(positionSummary.netExposureBand, "net_long");
  assert.equal(overview.metrics.totalInstruments, 1);
});

test("contract decoding rejects invalid markets payloads", async () => {
  const { transport } = createCaptureTransport((request) => {
    if (request.path.startsWith(marketsRouteMap.listOrders)) {
      return {
        ok: true,
        data: {
          items: [{ ...orderFixture, status: "not-a-status" }],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }

    return {
      ok: true,
      data: {
        items: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      },
    };
  });

  const client = createApiClient({ mode: "http", baseUrl: "https://markets.example", transport });

  await assert.rejects(() => client.markets.listOrders(), (error: unknown) => {
    assert.equal(error instanceof Error, true);
    return error instanceof Error && error.message.includes("order.status");
  });
});

test("route mapping uses parity-aligned methods, paths, filters, and headers", async () => {
  const { transport, calls } = createCaptureTransport((request) => {
    if (request.path.startsWith(marketsRouteMap.listInstruments)) {
      return {
        ok: true,
        data: {
          items: [instrumentFixture],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }

    if (request.path.startsWith(marketsRouteMap.listOrders)) {
      return {
        ok: true,
        data: {
          items: [orderFixture],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }

    if (request.path.startsWith(marketsRouteMap.listPositions)) {
      return {
        ok: true,
        data: {
          items: [positionFixture],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }

    return {
      ok: true,
      data: {
        items: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      },
    };
  });

  const client = createApiClient({
    mode: "http",
    baseUrl: "https://markets.example",
    transport,
    markets: {
      authToken: "markets-token",
      requestIdProvider: () => "request-fixed",
      correlationIdProvider: () => "correlation-fixed",
    },
  });

  await client.markets.listInstruments({
    pagination: { page: 2, pageSize: 25 },
    sort: { field: "symbol", direction: "asc" },
    filters: { assetClass: "crypto", status: "active", search: "btc" },
  });
  await client.markets.listOrders({
    filters: { status: "filled", side: "buy", type: "market", search: "ord-7001" },
  });
  await client.markets.listPositions({
    filters: { symbol: "BTC-USD", riskState: "normal", search: "acct-core-1" },
  });

  assert.equal(calls[0]?.method, "GET");
  assert.equal(calls[0]?.path.includes("page_size=25"), true);
  assert.equal(calls[0]?.path.includes("sort_field=symbol"), true);
  assert.equal(calls[0]?.path.includes("sort_direction=asc"), true);
  assert.equal(calls[0]?.path.includes("asset_class=crypto"), true);
  assert.equal((calls[0]?.headers?.authorization ?? "").startsWith("Bearer "), true);
  assert.equal(calls[0]?.headers?.["x-request-id"], "request-fixed");
  assert.equal(calls[0]?.headers?.["x-correlation-id"], "correlation-fixed");

  assert.equal(calls[1]?.path.includes("status=filled"), true);
  assert.equal(calls[1]?.path.includes("side=buy"), true);
  assert.equal(calls[1]?.path.includes("type=market"), true);

  assert.equal(calls[2]?.path.includes("symbol=BTC-USD"), true);
  assert.equal(calls[2]?.path.includes("risk_state=normal"), true);
});

test("enum parity keeps canonical markets constants", () => {
  assert.deepEqual(marketsCanonicalSides, ["buy", "sell"]);
  assert.deepEqual(marketsCanonicalPolicyDecisions, ["ALLOW", "DENY", "REVIEW"]);
  assert.deepEqual(marketsCanonicalAssetClasses, ["crypto", "fiat", "rwa", "metal"]);
  assert.deepEqual(marketsCanonicalOrderStatuses, [
    "created",
    "validated",
    "routed",
    "partially_filled",
    "filled",
    "canceled",
    "expired",
    "failed",
    "settled",
  ]);
});

test("markets error normalization maps representative service errors", async () => {
  const denied = normalizeApiError({
    status: 403,
    code: "http_request_failed",
    message: "Policy denied",
    details: {
      decision: "DENY",
      reason_codes: ["policy_denied_account"],
      explanation: "Denied by risk policy",
    },
  });

  assert.equal(denied.code, "markets_policy_denied");
  assert.equal(denied.retryable, false);
  assert.equal(denied.status, 403);

  const timeout = normalizeApiError({
    status: 504,
    code: "http_request_failed",
    message: "Dependency timeout",
    details: {
      reason_codes: ["execution_dependency_timeout"],
    },
  });

  assert.equal(timeout.code, "markets_dependency_timeout");
  assert.equal(timeout.retryable, true);
  assert.equal(timeout.status, 504);

  const transport = createFetchTransport({
    baseUrl: "https://markets.example",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "route_rejected",
            message: "route rejected by venue",
            reason_codes: ["route_rejected"],
          },
        }),
        {
          status: 422,
          statusText: "Unprocessable Entity",
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await transport.request<unknown>({ method: "GET", path: marketsRouteMap.listOrders });
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "markets_route_rejected");
    assert.equal(response.error.retryable, false);
    assert.equal(response.error.status, 422);
  }
});

test(
  "optional markets connectivity smoke probe",
  {
    skip: !process.env.RYVRA_MARKETS_CONNECTIVITY_SMOKE_URL,
  },
  async () => {
    const baseUrl = process.env.RYVRA_MARKETS_CONNECTIVITY_SMOKE_URL as string;
    const path = process.env.RYVRA_MARKETS_CONNECTIVITY_SMOKE_PATH ?? "/health";

    const client = createApiClient({
      mode: "http",
      baseUrl,
      markets: {
        connectivityPath: path,
      },
    });

    const diagnostics = await client.markets.getParityDiagnostics();
    assert.equal(diagnostics.connectivity.ok, true);
  },
);
