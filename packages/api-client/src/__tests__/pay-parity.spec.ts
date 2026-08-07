import assert from "node:assert/strict";
import { test } from "node:test";
import { createPayClient } from "../client";
import { normalizeApiError } from "../errors";
import { payCanonicalPaymentIntentStates, payRouteMap } from "../pay-parity";
import { createFetchTransport } from "../transport";
import type { ApiRequest, ApiResult, Transport } from "../types";

const canonicalPaymentIntentFixture = {
  intent_id: "pi_1",
  reference_id: "ref_1",
  idempotency_key: "idem_1",
  kind: "payout",
  sourceAccountId: "acct_src",
  destinationAccountId: "acct_dst",
  asset: {
    chain: "eip155:1",
    asset: "usd_stable",
    decimals: 2,
  },
  assetId: "usd_stable",
  amount: "100.00",
  reason_code: "PAYMENT_PAYOUT_OK",
  state: "created",
  created_at: "2026-08-01T00:00:00.000Z",
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

test("contract decoding validates canonical payment intent payloads", async () => {
  const { transport } = createCaptureTransport((request) => {
    if (request.path === payRouteMap.createPaymentIntent) {
      return { ok: true, data: canonicalPaymentIntentFixture };
    }

    if (request.path.startsWith("/pay/intents/pi_1/transitions")) {
      return {
        ok: true,
        data: {
          ...canonicalPaymentIntentFixture,
          state: "authorized",
        },
      };
    }

    if (request.path.startsWith("/pay/reconciliation/intents/pi_1")) {
      return {
        ok: true,
        data: {
          status: "matched",
          reason_code: "RECON_MATCHED",
        },
      };
    }

    return { ok: false, error: { code: "unhandled", message: "Unhandled route", retryable: false, source: "mock" } };
  });

  const client = createPayClient({ mode: "http", baseUrl: "https://pay.example", transport });

  const createdIntent = await client.createPaymentIntent(canonicalPaymentIntentFixture);
  assert.equal(createdIntent.intent_id, canonicalPaymentIntentFixture.intent_id);
  assert.equal(createdIntent.state, "created");

  const transitionedIntent = await client.transitionPaymentIntent("pi_1", "authorized");
  assert.equal(transitionedIntent.state, "authorized");

  const reconciliation = await client.reconcileSettlement(canonicalPaymentIntentFixture, {
    reference_id: canonicalPaymentIntentFixture.reference_id,
    state: "settled",
    amount: canonicalPaymentIntentFixture.amount,
    asset: canonicalPaymentIntentFixture.asset,
    observed_at: "2026-08-02T00:00:00.000Z",
  });

  assert.deepEqual(reconciliation, {
    status: "matched",
    reason_code: "RECON_MATCHED",
  });
});

test("contract decoding rejects invalid pay payloads", async () => {
  const { transport } = createCaptureTransport(() => ({ ok: true, data: { intent_id: "pi_1" } }));
  const client = createPayClient({ mode: "http", baseUrl: "https://pay.example", transport });

  await assert.rejects(() => client.createPaymentIntent(canonicalPaymentIntentFixture), (error: unknown) => {
    assert.equal(error instanceof Error, true);
    return error instanceof Error && error.message.includes("paymentIntent");
  });
});

test("route mapping uses parity-aligned methods, paths, filters, and idempotency headers", async () => {
  const { transport, calls } = createCaptureTransport((request) => {
    if (request.path.startsWith("/pay/invoices")) {
      return {
        ok: true,
        data: {
          items: [
            {
              id: "inv_1",
              invoiceNumber: "INV-1",
              customerName: "Atlas",
              amountMinor: 100,
              currency: "USD",
              status: "PAID",
              issuedAt: "2026-08-01T00:00:00.000Z",
              dueAt: "2026-08-08T00:00:00.000Z",
            },
          ],
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        },
      };
    }

    if (request.path.startsWith("/pay/payouts?")) {
      return {
        ok: true,
        data: {
          items: [
            {
              id: "po_1",
              amountMinor: 100,
              currency: "USD",
              status: "SCHEDULED",
              destinationType: "BANK_ACCOUNT",
              destinationLabel: "Treasury",
              createdAt: "2026-08-01T00:00:00.000Z",
            },
          ],
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        },
      };
    }

    if (request.path.startsWith("/pay/reconciliation/items")) {
      return {
        ok: true,
        data: {
          items: [
            {
              id: "rec_1",
              runId: "run_1",
              entityType: "PAYOUT",
              entityId: "po_1",
              status: "MATCHED",
              expectedAmountMinor: 100,
              actualAmountMinor: 100,
              deltaMinor: 0,
              currency: "USD",
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: "2026-08-01T00:00:00.000Z",
            },
          ],
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        },
      };
    }

    if (request.path.startsWith("/pay/intents/pi_1/transitions")) {
      return {
        ok: true,
        data: {
          ...canonicalPaymentIntentFixture,
          state: "authorized",
        },
      };
    }

    return { ok: true, data: [] };
  });

  const client = createPayClient({
    mode: "http",
    baseUrl: "https://pay.example",
    transport,
    pay: {
      authToken: "integration-token",
      requestIdProvider: () => "request-fixed",
      correlationIdProvider: () => "correlation-fixed",
      idempotencyHeader: "x-idempotency-key",
    },
  });

  await client.listInvoices({
    pagination: { page: 2, pageSize: 25 },
    sort: { field: "issuedAt", direction: "desc" },
    filters: { status: "PAID", search: "atlas" },
  });
  await client.listPayouts({ filters: { destinationType: "BANK_ACCOUNT" } });
  await client.listReconciliationItems({ filters: { exceptionOnly: true } });
  await client.transitionPaymentIntent("pi_1", "authorized", { idempotencyKey: "idem-transition" });

  assert.equal(calls[0]?.method, "GET");
  assert.equal(calls[0]?.path.includes("page_size=25"), true);
  assert.equal(calls[0]?.path.includes("sort_field=issuedAt"), true);
  assert.equal(calls[0]?.path.includes("sort_direction=desc"), true);

  assert.equal(calls[1]?.path.includes("destination_type=BANK_ACCOUNT"), true);
  assert.equal(calls[2]?.path.includes("exception_only=true"), true);

  const transitionRequest = calls.find((entry) => entry.path.includes("/pay/intents/pi_1/transitions"));
  const expectedAuthHeader = ["Bearer", "integration-token"].join(" ");
  assert.equal(transitionRequest?.method, "POST");
  assert.equal(transitionRequest?.headers?.authorization, expectedAuthHeader);
  assert.equal(transitionRequest?.headers?.["x-idempotency-key"], "idem-transition");
  assert.equal(transitionRequest?.headers?.["x-request-id"], "request-fixed");
  assert.equal(transitionRequest?.headers?.["x-correlation-id"], "correlation-fixed");
});

test("enum parity keeps canonical payment intent states", () => {
  assert.deepEqual(payCanonicalPaymentIntentStates, [
    "created",
    "authorized",
    "executing",
    "settled",
    "failed",
    "reversed",
  ]);
});

test("pay error normalization maps representative pay backend payloads", async () => {
  const fromNormalizer = normalizeApiError({
    status: 409,
    code: "http_request_failed",
    message: "Conflict",
    details: {
      message: "idempotency conflict for reference_id and idempotency_key",
    },
  });

  assert.equal(fromNormalizer.code, "pay_idempotency_conflict");
  assert.equal(fromNormalizer.retryable, false);
  assert.equal(fromNormalizer.status, 409);

  const transport = createFetchTransport({
    baseUrl: "https://pay.example",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "invalid_payment_state_transition",
            message: "invalid payment state transition: created -> settled",
          },
        }),
        {
          status: 422,
          statusText: "Unprocessable Entity",
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await transport.request<unknown>({ method: "POST", path: payRouteMap.createPaymentIntent });
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "pay_invalid_state_transition");
    assert.equal(response.error.retryable, false);
    assert.equal(response.error.status, 422);
  }
});

test(
  "optional connectivity smoke probe",
  {
    skip: !process.env.RYVRA_PAY_CONNECTIVITY_SMOKE_URL,
  },
  async () => {
    const baseUrl = process.env.RYVRA_PAY_CONNECTIVITY_SMOKE_URL as string;
    const path = process.env.RYVRA_PAY_CONNECTIVITY_SMOKE_PATH ?? "/health";
    const client = createPayClient({
      mode: "http",
      baseUrl,
      pay: {
        connectivityPath: path,
      },
    });

    const diagnostics = await client.getParityDiagnostics();
    assert.equal(diagnostics.connectivity.ok, true);
  },
);
