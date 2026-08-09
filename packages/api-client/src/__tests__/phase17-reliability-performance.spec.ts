import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { createFetchTransport } from "../transport";

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

test("fetch transport deduplicates concurrent GET requests across volatile request-id headers", async () => {
  let fetchCallCount = 0;

  const transport = createFetchTransport({
    baseUrl: "https://api.example",
    cacheTtlMs: 1_000,
    fetchImpl: async () => {
      fetchCallCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 25));
      return new Response(JSON.stringify({ value: fetchCallCount }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const [first, second] = await Promise.all([
    transport.request<{ value: number }>({
      method: "GET",
      path: "/markets/instruments?limit=10",
      headers: {
        "x-request-id": "req-a",
        "x-correlation-id": "corr-a",
      },
    }),
    transport.request<{ value: number }>({
      method: "GET",
      path: "/markets/instruments?limit=10",
      headers: {
        "x-request-id": "req-b",
        "x-correlation-id": "corr-b",
      },
    }),
  ]);

  assert.equal(fetchCallCount, 1);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
});

test("GET cache is invalidated after write requests to preserve deterministic revalidation", async () => {
  let fetchCallCount = 0;
  let readVersion = 1;

  const transport = createFetchTransport({
    baseUrl: "https://api.example",
    cacheTtlMs: 5_000,
    fetchImpl: async (_input, init) => {
      fetchCallCount += 1;

      if (init?.method === "POST") {
        readVersion += 1;
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ version: readVersion }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const first = await transport.request<{ version: number }>({ method: "GET", path: "/points/summary?account_id=acct-1" });
  const second = await transport.request<{ version: number }>({ method: "GET", path: "/points/summary?account_id=acct-1" });
  await transport.request({
    method: "POST",
    path: "/pay/intents",
    headers: {
      "idempotency-key": "idem-1",
    },
    body: { amount: "1.00" },
  });
  const third = await transport.request<{ version: number }>({ method: "GET", path: "/points/summary?account_id=acct-1" });

  assert.equal(fetchCallCount, 3);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, true);
  if (third.ok) {
    assert.equal(third.data.version, 2);
  }
});

test("transport retries retryable requests and avoids retrying non-idempotent writes", async () => {
  let getAttemptCount = 0;
  const retryingTransport = createFetchTransport({
    baseUrl: "https://api.example",
    maxRetries: 2,
    retryDelayMs: 0,
    fetchImpl: async () => {
      getAttemptCount += 1;
      if (getAttemptCount < 3) {
        return new Response(JSON.stringify({ message: "temporary unavailable" }), {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const eventualSuccess = await retryingTransport.request({ method: "GET", path: "/markets/overview?account_id=acct-1" });
  assert.equal(eventualSuccess.ok, true);
  assert.equal(getAttemptCount, 3);

  let nonIdempotentPostAttempts = 0;
  const nonRetryingTransport = createFetchTransport({
    baseUrl: "https://api.example",
    maxRetries: 2,
    retryDelayMs: 0,
    fetchImpl: async () => {
      nonIdempotentPostAttempts += 1;
      return new Response(JSON.stringify({ message: "write failure" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "content-type": "application/json" },
      });
    },
  });

  const failedPost = await nonRetryingTransport.request({
    method: "POST",
    path: "/pay/intents",
    body: { amount: "1.00" },
  });
  assert.equal(failedPost.ok, false);
  assert.equal(nonIdempotentPostAttempts, 1);
});

test("transport timeout/offline envelopes stay explicit and retry-safe", async () => {
  const timeoutTransport = createFetchTransport({
    baseUrl: "https://api.example",
    timeoutMs: 5,
    maxRetries: 0,
    fetchImpl: async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      }),
  });

  const timeoutResult = await timeoutTransport.request({ method: "GET", path: "/pay/overview" });
  assert.equal(timeoutResult.ok, false);
  if (!timeoutResult.ok) {
    assert.equal(timeoutResult.error.code, "request_timeout");
    assert.equal(timeoutResult.error.retryable, true);
  }

  const offlineTransport = createFetchTransport({
    baseUrl: "https://api.example",
    maxRetries: 0,
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });

  const offlineResult = await offlineTransport.request({ method: "GET", path: "/pay/overview" });
  assert.equal(offlineResult.ok, false);
  if (!offlineResult.ok) {
    assert.equal(offlineResult.error.code, "network_offline");
    assert.equal(offlineResult.error.retryable, true);
  }
});

test("daily claim execution client retries retryable errors and preserves intent across attempts", async () => {
  const claimClient = await loadWorkspaceModule<{
    executeDailyClaimAttempt: (input: {
      scope: { accountId: string };
      attempt: { idempotencyKey: string; requestId: string; correlationId: string; intentId?: string };
      maxRetries?: number;
      retryDelayMs?: number;
      fetchImpl?: typeof fetch;
    }) => Promise<{ ok: boolean; attempt: { intentId?: string } }>;
  }>("../../apps/points-tasks-web/app/lib/claim-execution-client.ts");

  const seenBodies: Array<{ intentId?: string }> = [];

  let callCount = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    callCount += 1;
    const parsedBody = JSON.parse(String(init?.body ?? "{}")) as { intentId?: string };
    seenBodies.push(parsedBody);

    if (callCount === 1) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "upstream_unavailable",
            message: "temporary outage",
            retryable: true,
            source: "pay",
          },
          data: {
            intentId: "pi-resume-1",
          },
        }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          intentId: "pi-resume-1",
          state: "settled",
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };

  const result = await claimClient.executeDailyClaimAttempt({
    scope: { accountId: "acct-retry" },
    attempt: {
      idempotencyKey: "points.daily_claim:acct-retry:nonce-1",
      requestId: "req-retry",
      correlationId: "corr-retry",
    },
    maxRetries: 1,
    retryDelayMs: 0,
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(callCount, 2);
  assert.equal(seenBodies[0]?.intentId, undefined);
  assert.equal(seenBodies[1]?.intentId, "pi-resume-1");
});

test("payout claim submission retries safely with the same idempotency key and requests revalidation", async () => {
  const claimClient = await loadWorkspaceModule<{
    executeClaimSubmission: (input: {
      payout: { id: string; amountMinor: number; currency: string; destinationLabel: string; status: string };
      idempotencyKey: string;
      requestId: string;
      correlationId: string;
      maxRetries?: number;
      retryDelayMs?: number;
      fetchImpl?: typeof fetch;
    }) => Promise<{ ok: boolean; shouldRefresh?: true }>;
  }>("../../apps/pay-web/app/lib/claim-submission-client.ts");

  let callCount = 0;
  const seenBodyValues: Array<{ idempotencyKey?: string }> = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    callCount += 1;
    seenBodyValues.push(JSON.parse(String(init?.body ?? "{}")) as { idempotencyKey?: string });

    if (callCount === 1) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "upstream_unavailable",
            message: "temporary outage",
            retryable: true,
            source: "pay",
          },
        }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          intentId: "pi-claim-2",
          state: "created",
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };

  const result = await claimClient.executeClaimSubmission({
    payout: {
      id: "po-9",
      amountMinor: 100,
      currency: "USD",
      destinationLabel: "Treasury",
      status: "SCHEDULED",
    },
    idempotencyKey: "pay.claim:po-9:nonce-1",
    requestId: "req-claim",
    correlationId: "corr-claim",
    maxRetries: 1,
    retryDelayMs: 0,
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.shouldRefresh, true);
  assert.equal(callCount, 2);
  assert.equal(seenBodyValues[0]?.idempotencyKey, "pay.claim:po-9:nonce-1");
  assert.equal(seenBodyValues[1]?.idempotencyKey, "pay.claim:po-9:nonce-1");
});

test("loading/error/empty page-state contracts stay consistent across all apps", async () => {
  const stateFiles = [
    "../../apps/markets-web/app/components/page-states.tsx",
    "../../apps/pay-web/app/components/page-states.tsx",
    "../../apps/points-tasks-web/app/components/page-states.tsx",
  ];

  for (const stateFile of stateFiles) {
    const absolutePath = path.resolve(process.cwd(), stateFile);
    const source = await readFile(absolutePath, "utf8");
    assert.equal(source.includes("role=\"status\""), true);
    assert.equal(source.includes("aria-live=\"polite\""), true);
    assert.equal(source.includes("ErrorTransparencySummary"), true);
  }
});

test("transport emits hot-path timing markers for diagnostics", async () => {
  const metrics: Array<{
    attemptCount: number;
    retryCount: number;
    status: "success" | "error";
    fromCache: boolean;
  }> = [];

  let fetchCallCount = 0;
  const transport = createFetchTransport({
    baseUrl: "https://api.example",
    maxRetries: 1,
    retryDelayMs: 0,
    onRequestMetric: (metric) => {
      metrics.push({
        attemptCount: metric.attemptCount,
        retryCount: metric.retryCount,
        status: metric.status,
        fromCache: metric.fromCache,
      });
    },
    fetchImpl: async () => {
      fetchCallCount += 1;
      return new Response(JSON.stringify({ message: "temporary unavailable" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "content-type": "application/json" },
      });
    },
  });

  const result = await transport.request({ method: "GET", path: "/markets/orders?account_id=acct-1" });
  assert.equal(result.ok, false);
  assert.equal(fetchCallCount, 2);
  assert.equal(metrics.length > 0, true);

  const terminalMetric = metrics[metrics.length - 1];
  assert.equal(terminalMetric?.status, "error");
  assert.equal(terminalMetric?.attemptCount, 2);
  assert.equal(terminalMetric?.retryCount, 1);
  assert.equal(terminalMetric?.fromCache, false);

  if (!result.ok) {
    const details = result.error.details as { transport?: { attemptCount: number; totalDurationMs: number } } | undefined;
    assert.equal(typeof details?.transport?.attemptCount, "number");
    assert.equal(typeof details?.transport?.totalDurationMs, "number");
  }
});
