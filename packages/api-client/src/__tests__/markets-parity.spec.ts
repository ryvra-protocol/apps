import assert from "node:assert/strict";
import { test } from "node:test";
import {
  marketInstrumentClasses,
  marketOrderTypes,
  marketPolicyDecisions,
  marketPositionStates,
  type MarketsListResponse,
} from "@ryvra/domain-markets";
import { createApiClient } from "../client";
import { ApiClientError, normalizeApiError } from "../errors";
import {
  marketsCanonicalAssetClasses,
  marketsCanonicalErrorCodes,
  marketsCanonicalOrderStatuses,
  marketsCanonicalPolicyDecisions,
  marketsCanonicalSides,
  marketsRouteMap,
} from "../markets-parity";
import { createFetchTransport } from "../transport";
import type { ApiRequest, ApiResult, Transport } from "../types";

const instrumentListPayload = {
  as_of: "2026-08-08T06:00:00Z",
  data: [
    {
      instrument_id: "inst_eth_usd",
      symbol: "ETH/USD",
      base_asset: "eth",
      quote_asset: "usd",
      asset_class: "crypto",
      status: "active",
      availability: "tradable",
      chain_id: 1,
      tick_size: "0.01",
      lot_size: "0.0001",
      min_notional: "10",
      max_notional: "500000",
      price_precision: 2,
      size_precision: 6,
      updated_at: "2026-08-08T05:59:00Z",
    },
  ],
  page: {
    limit: 50,
    has_more: false,
  },
} as const;

const orderListPayload = {
  as_of: "2026-08-08T06:00:00Z",
  data: [
    {
      order_id: "ord_1001",
      reference_id: "ref_1001",
      idempotency_key: "idem_1001",
      correlation_id: "cor_1001",
      account_id: "acct_123",
      route_id: "route_a",
      side: "buy",
      type: "market",
      status: "settled",
      policy_decision: "ALLOW",
      reason_codes: [],
      base_asset: "eth",
      quote_asset: "usdc",
      size: "1.25",
      filled_size: "1.25",
      avg_execution_price: "2810.55",
      created_at: "2026-08-08T05:41:22Z",
      updated_at: "2026-08-08T05:44:21Z",
    },
  ],
  page: {
    limit: 50,
    has_more: false,
  },
} as const;

const positionListPayload = {
  as_of: "2026-08-08T06:00:00Z",
  data: [
    {
      position_id: "pos_1001",
      account_id: "acct_123",
      asset: {
        canonical_id: "eth",
        symbol: "ETH",
        decimals: 18,
        chain_id: 1,
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        asset_class: "crypto",
      },
      state: "open",
      side: "long",
      quantity: "4.5000",
      notional_quote_asset: "usdc",
      notional_value: "12647.50",
      net_exposure_band: "medium",
      risk_flags: ["concentration_limit_near"],
      updated_at: "2026-08-08T05:54:33Z",
    },
  ],
  page: {
    limit: 50,
    has_more: false,
  },
} as const;

const orderSummaryPayload = {
  as_of: "2026-08-08T06:00:00Z",
  account_id: "acct_123",
  total_orders: 84,
  open_orders: 12,
  terminal_orders: 72,
  review_required_orders: 3,
  blocked_orders: 5,
  by_status: {
    created: 2,
    routed: 10,
    settled: 63,
    failed: 9,
  },
  by_side: {
    buy: 55,
    sell: 29,
  },
} as const;

const positionSummaryPayload = {
  as_of: "2026-08-08T06:00:00Z",
  account_id: "acct_123",
  total_positions: 4,
  open_positions: 3,
  by_state: {
    open: 3,
    reducing: 1,
  },
  by_side: {
    long: 3,
    short: 1,
  },
  net_exposure_quote_asset: "usdc",
  net_exposure_value: "8200.00",
  net_exposure_band: "medium",
  risk_flags: ["concentration_limit_near"],
} as const;

const overviewPayload = {
  as_of: "2026-08-08T06:00:00Z",
  api_version: "MARKETS_API_VERSION=2026-08-08",
  account_id: "acct_123",
  health_status: "pass",
  instruments: {
    as_of: "2026-08-08T06:00:00Z",
    total_instruments: 142,
    tradable_instruments: 130,
    halted_instruments: 4,
    by_asset_class: {
      crypto: 120,
      rwa: 12,
      metal: 10,
    },
    by_status: {
      active: 130,
      suspended: 4,
      inactive: 8,
    },
    by_availability: {
      tradable: 130,
      close_only: 8,
      halted: 4,
    },
  },
  orders: orderSummaryPayload,
  positions: positionSummaryPayload,
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

function canonicalRouteHandler(request: ApiRequest): ApiResult<unknown> {
  if (request.path.startsWith(marketsRouteMap.getInstrumentSummary)) {
    return {
      ok: true,
      data: overviewPayload.instruments,
    };
  }
  if (request.path.startsWith(marketsRouteMap.getOrderSummary)) {
    return { ok: true, data: orderSummaryPayload };
  }
  if (request.path.startsWith(marketsRouteMap.getPositionSummary)) {
    return { ok: true, data: positionSummaryPayload };
  }
  if (request.path.startsWith(marketsRouteMap.getMarketsOverview)) {
    return { ok: true, data: overviewPayload };
  }
  if (request.path.startsWith(marketsRouteMap.listInstruments)) {
    return { ok: true, data: instrumentListPayload };
  }
  if (request.path.startsWith(marketsRouteMap.listOrders)) {
    return { ok: true, data: orderListPayload };
  }
  if (request.path.startsWith(marketsRouteMap.listPositions)) {
    return { ok: true, data: positionListPayload };
  }
  if (request.path.startsWith("/health")) {
    return {
      ok: true,
      data: {
        status: "pass",
        service: "markets",
        api_version: "MARKETS_API_VERSION=2026-08-08",
        timestamp: "2026-08-08T06:00:00Z",
        checks: [],
      },
    };
  }

  return { ok: false, error: { code: "unhandled", message: "Unhandled route", retryable: false, source: "mock" } };
}

test("endpoint mapping uses canonical method/path/account/auth/header behavior", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
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
    pagination: { limit: 25, cursor: "cursor-token", page: 7 },
    sort: { field: "updated_at", direction: "desc" },
    filters: { q: "ETH", assetClass: "crypto" },
  });
  await client.markets.getInstrumentSummary({ assetClass: "crypto" });
  await client.markets.listOrders({
    accountId: "acct_123",
    pagination: { limit: 10, page: 2 },
    sort: { field: "created_at", direction: "asc" },
    filters: { status: "settled", side: "buy", type: "market", policyDecision: "ALLOW" },
  });
  await client.markets.getOrderSummary({
    accountId: "acct_123",
    filters: { createdAfter: "2026-08-01T00:00:00Z", createdBefore: "2026-08-09T00:00:00Z" },
  });
  await client.markets.listPositions({
    accountId: "acct_123",
    pagination: { limit: 10, page: 1 },
    sort: { field: "updated_at", direction: "desc" },
    filters: { side: "long", state: "open" },
  });
  await client.markets.getPositionSummary({
    accountId: "acct_123",
    filters: { state: "open" },
  });
  await client.markets.getMarketsOverview({
    accountId: "acct_123",
  });

  assert.equal(calls[0]?.method, "GET");
  assert.equal(calls[0]?.path.startsWith(marketsRouteMap.listInstruments), true);
  assert.equal(calls[0]?.path.includes("cursor=cursor-token"), true);
  assert.equal(calls[0]?.path.includes("page=7"), false);

  assert.equal(calls[2]?.method, "GET");
  assert.equal(calls[2]?.path.startsWith(marketsRouteMap.listOrders), true);
  assert.equal(calls[2]?.path.includes("account_id=acct_123"), true);
  assert.equal(calls[2]?.path.includes("page=2"), true);

  assert.equal(calls[3]?.path.startsWith(marketsRouteMap.getOrderSummary), true);
  assert.equal(calls[3]?.path.includes("account_id=acct_123"), true);

  assert.equal(calls[4]?.path.startsWith(marketsRouteMap.listPositions), true);
  assert.equal(calls[4]?.path.includes("account_id=acct_123"), true);

  assert.equal(calls[5]?.path.startsWith(marketsRouteMap.getPositionSummary), true);
  assert.equal(calls[5]?.path.includes("account_id=acct_123"), true);

  assert.equal(calls[6]?.path.startsWith(marketsRouteMap.getMarketsOverview), true);
  assert.equal(calls[6]?.path.includes("account_id=acct_123"), true);

  for (const call of calls) {
    if (!call.path.startsWith("/health")) {
      assert.equal((call.headers?.authorization ?? "").startsWith("Bearer "), true);
    }

    assert.equal(call.headers?.["x-request-id"], "request-fixed");
    assert.equal(call.headers?.["x-correlation-id"], "correlation-fixed");
  }
});

test("required account_id is enforced for account-scoped endpoints in HTTP mode", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://markets.example",
    transport,
    markets: {
      authToken: "markets-token",
    },
  });

  await assert.rejects(async () => client.markets.listOrders({ accountId: "", pagination: { limit: 10 } }), (error: unknown) => {
    assert.equal(error instanceof ApiClientError, true);
    return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
  });

  await assert.rejects(async () => client.markets.getOrderSummary({ accountId: "" }), (error: unknown) => {
    assert.equal(error instanceof ApiClientError, true);
    return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
  });

  await assert.rejects(async () => client.markets.listPositions({ accountId: "", pagination: { limit: 10 } }), (error: unknown) => {
    assert.equal(error instanceof ApiClientError, true);
    return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
  });

  await assert.rejects(async () => client.markets.getPositionSummary({ accountId: "" }), (error: unknown) => {
    assert.equal(error instanceof ApiClientError, true);
    return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
  });

  await assert.rejects(async () => client.markets.getMarketsOverview({ accountId: "" }), (error: unknown) => {
    assert.equal(error instanceof ApiClientError, true);
    return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
  });

  assert.equal(calls.length, 0);
});

test("non-health routes require bearer auth and health probe remains auth-optional", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://markets.example",
    transport,
    markets: {
      requestIdProvider: () => "request-health",
      correlationIdProvider: () => "correlation-health",
      connectivityPath: "/health",
    },
  });

  await assert.rejects(
    async () =>
      client.markets.listInstruments({
        pagination: { limit: 10 },
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      return error instanceof ApiClientError && error.code === "unauthorized";
    },
  );

  assert.equal(calls.length, 0);

  const diagnostics = await client.markets.getParityDiagnostics();
  assert.equal(diagnostics.connectivity.ok, true);
  assert.equal(calls[0]?.path, "/health");
  assert.equal(calls[0]?.headers?.authorization, undefined);
  assert.equal(calls[0]?.headers?.["x-request-id"], "request-health");
  assert.equal(calls[0]?.headers?.["x-correlation-id"], "correlation-health");
});

test("cursor-first pagination keeps cursor canonical and page deprecated compatibility", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://markets.example",
    transport,
    markets: {
      authToken: "markets-token",
    },
  });

  await client.markets.listInstruments({
    pagination: { limit: 25, cursor: "cursor-token", page: 4 },
  });
  await client.markets.listOrders({
    accountId: "acct_123",
    pagination: { limit: 25, page: 4 },
  });

  assert.equal(calls[0]?.path.includes("cursor=cursor-token"), true);
  assert.equal(calls[0]?.path.includes("page=4"), false);
  assert.equal(calls[1]?.path.includes("page=4"), true);
});

test("canonical decoder enforces strict enums and schema literals", async () => {
  const { transport } = createCaptureTransport((request) => {
    if (request.path.startsWith(marketsRouteMap.listOrders)) {
      return {
        ok: true,
        data: {
          ...orderListPayload,
          data: [{ ...orderListPayload.data[0], type: "limit" }],
        },
      };
    }

    return canonicalRouteHandler(request);
  });
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://markets.example",
    transport,
    markets: {
      authToken: "markets-token",
    },
  });

  await assert.rejects(async () => client.markets.listOrders({ accountId: "acct_123", pagination: { limit: 10 } }), (error: unknown) => {
    assert.equal(error instanceof ApiClientError, true);
    return error instanceof ApiClientError && error.code === "markets_payload_validation_failed" && error.message.includes("order.type");
  });
});

test("deprecated net_exposure_bucket fallback normalizes to canonical netExposureBand", async () => {
  const { transport } = createCaptureTransport((request) => {
    if (request.path.startsWith(marketsRouteMap.getPositionSummary)) {
      return {
        ok: true,
        data: {
          ...positionSummaryPayload,
          net_exposure_band: undefined,
          net_exposure_bucket: "medium",
        },
      };
    }

    if (request.path.startsWith(marketsRouteMap.getMarketsOverview)) {
      return {
        ok: true,
        data: {
          ...overviewPayload,
          positions: {
            ...positionSummaryPayload,
            net_exposure_band: undefined,
            net_exposure_bucket: "medium",
          },
        },
      };
    }

    return canonicalRouteHandler(request);
  });
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://markets.example",
    transport,
    markets: {
      authToken: "markets-token",
    },
  });

  const summary = await client.markets.getPositionSummary({ accountId: "acct_123" });
  const overview = await client.markets.getMarketsOverview({ accountId: "acct_123" });

  assert.equal(summary.netExposureBand, "medium");
  assert.equal(overview.positions.netExposureBand, "medium");
});

test("error normalization preserves canonical markets error envelope", async () => {
  const normalized = normalizeApiError({
    status: 403,
    code: "http_request_failed",
    message: "Forbidden",
    details: {
      code: "forbidden",
      message: "account is blocked by policy-risk",
      retryable: false,
      source: "policy-risk",
      details: {
        reason_codes: ["policy_blocked_account"],
      },
    },
  });

  assert.equal(normalized.code, "forbidden");
  assert.equal(normalized.message, "account is blocked by policy-risk");
  assert.equal(normalized.retryable, false);
  assert.equal(normalized.source, "policy-risk");
  assert.equal(normalized.status, 403);

  const sourceFallback = normalizeApiError({
    status: 400,
    source: "http",
    code: "http_request_failed",
    message: "Bad Request",
    details: {
      code: "invalid_request",
      message: "invalid query payload",
      retryable: false,
      source: "unsupported-backend",
    },
  });

  assert.equal(sourceFallback.code, "invalid_request");
  assert.equal(sourceFallback.message, "invalid query payload");
  assert.equal(sourceFallback.retryable, false);
  assert.equal(sourceFallback.source, "http");
  assert.equal(sourceFallback.status, 400);

  const transport = createFetchTransport({
    baseUrl: "https://markets.example",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          code: "unauthorized",
          message: "bearer token is required",
          retryable: false,
          source: "markets-api",
          details: {
            parameter: "authorization",
          },
        }),
        {
          status: 401,
          statusText: "Unauthorized",
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await transport.request<unknown>({ method: "GET", path: marketsRouteMap.listOrders });
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "unauthorized");
    assert.equal(response.error.retryable, false);
    assert.equal(response.error.source, "markets-api");
  }
});

test("enum parity keeps canonical market constants", () => {
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
  assert.deepEqual(marketsCanonicalErrorCodes, [
    "invalid_request",
    "unauthorized",
    "forbidden",
    "not_found",
    "rate_limited",
    "service_unavailable",
    "internal_error",
  ]);
  assert.deepEqual(marketInstrumentClasses, ["crypto", "fiat", "rwa", "metal"]);
  assert.deepEqual(marketOrderTypes, ["market"]);
  assert.deepEqual(marketPolicyDecisions, ["ALLOW", "DENY", "REVIEW"]);
  assert.deepEqual(marketPositionStates, ["open", "reducing", "closed", "liquidating", "suspended"]);
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
        ...(process.env.RYVRA_MARKETS_AUTH_TOKEN ? { authToken: process.env.RYVRA_MARKETS_AUTH_TOKEN } : {}),
        connectivityPath: path,
        ...(process.env.RYVRA_MARKETS_ACCOUNT_ID ? { defaultAccountId: process.env.RYVRA_MARKETS_ACCOUNT_ID } : {}),
      },
    });

    const diagnostics = await client.markets.getParityDiagnostics();
    assert.equal(diagnostics.connectivity.ok, true);
  },
);

test("decode list response shape keeps canonical item + pagination keys", () => {
  const decoded = {
    asOf: instrumentListPayload.as_of,
    items: [...instrumentListPayload.data],
    pagination: {
      limit: instrumentListPayload.page.limit,
      hasMore: instrumentListPayload.page.has_more,
    },
  } satisfies MarketsListResponse<unknown>;

  assert.equal(typeof decoded.asOf, "string");
  assert.equal(Array.isArray(decoded.items), true);
  assert.equal(typeof decoded.pagination.limit, "number");
});
