import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

test("claim CTA helper posts scoped payload with idempotency and tracing headers", async () => {
  const claimClient = await loadWorkspaceModule<{
    executeDailyClaimAttempt: (input: {
      scope: { accountId: string; userId?: string; workspaceId?: string };
      attempt: { idempotencyKey: string; requestId: string; correlationId: string; intentId?: string };
      endpoint?: string;
      fetchImpl?: typeof fetch;
    }) => Promise<{ ok: boolean; shouldRefresh?: true; syncTargets?: readonly string[] }>;
  }>("../../apps/points-tasks-web/app/lib/claim-execution-client.ts");

  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push(init ? { input, init } : { input });
    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          intentId: "pi-claim-1",
          state: "settled",
          syncTargets: ["daily_claim_status", "points_summary", "points_balance"],
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };

  const result = await claimClient.executeDailyClaimAttempt({
    scope: { accountId: "acct-9", userId: "user-9", workspaceId: "ws-9" },
    attempt: {
      idempotencyKey: "points.daily_claim:acct-9:nonce-1",
      requestId: "req-9",
      correlationId: "corr-9",
    },
    endpoint: "/api/claims/daily",
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.shouldRefresh, true);
  assert.equal(result.syncTargets?.includes("daily_claim_status"), true);
  assert.equal(result.syncTargets?.includes("points_summary"), true);
  assert.equal(result.syncTargets?.includes("points_balance"), true);

  const call = calls[0];
  assert.equal(String(call?.input), "/api/claims/daily");
  assert.equal(call?.init?.method, "POST");
  const headers = call?.init?.headers as Record<string, string>;
  assert.equal(headers["x-request-id"], "req-9");
  assert.equal(headers["x-correlation-id"], "corr-9");

  const body = JSON.parse(String(call?.init?.body)) as {
    accountId: string;
    userId: string;
    workspaceId: string;
    idempotencyKey: string;
  };
  assert.equal(body.accountId, "acct-9");
  assert.equal(body.userId, "user-9");
  assert.equal(body.workspaceId, "ws-9");
  assert.equal(body.idempotencyKey, "points.daily_claim:acct-9:nonce-1");
});

test("daily claim workflow creates intent and runs transition chain with per-step idempotency", async () => {
  const claimServer = await loadWorkspaceModule<{
    executeDailyClaimWorkflow: (input: {
      payClient: {
        createPaymentIntent: (intent: { idempotency_key: string }, options?: Record<string, string>) => Promise<{ intent_id: string; state: string }>;
        transitionPaymentIntent: (
          intentId: string,
          toState: string,
          options?: Record<string, string>,
        ) => Promise<{ state: string }>;
      };
      scope: { accountId: string; userId?: string; workspaceId?: string };
      attempt: { idempotencyKey: string; requestId: string; correlationId: string; intentId?: string };
    }) => Promise<{ ok: boolean; transitionsApplied?: string[] }>;
  }>("../../apps/points-tasks-web/app/lib/claim-execution-server.ts");

  const createCalls: Array<{ options?: Record<string, string> }> = [];
  const transitionCalls: Array<{ intentId: string; toState: string; options?: Record<string, string> }> = [];

  const result = await claimServer.executeDailyClaimWorkflow({
    payClient: {
      async createPaymentIntent(intent, options) {
        createCalls.push(options ? { options } : {});
        assert.equal(intent.idempotency_key, "points.daily_claim:acct-4:nonce-a");
        return { intent_id: "pi-claim-4", state: "created" };
      },
      async transitionPaymentIntent(intentId, toState, options) {
        transitionCalls.push(options ? { intentId, toState, options } : { intentId, toState });
        return { state: toState };
      },
    },
    scope: { accountId: "acct-4", userId: "user-4" },
    attempt: {
      idempotencyKey: "points.daily_claim:acct-4:nonce-a",
      requestId: "req-4",
      correlationId: "corr-4",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(createCalls.length, 1);
  assert.equal(createCalls[0]?.options?.requestId, "req-4");
  assert.equal(createCalls[0]?.options?.correlationId, "corr-4");
  assert.equal(createCalls[0]?.options?.idempotencyKey, "points.daily_claim:acct-4:nonce-a");
  assert.deepEqual(
    transitionCalls.map((entry) => entry.toState),
    ["authorized", "executing", "settled"],
  );

  for (const transition of transitionCalls) {
    assert.equal(transition.options?.requestId, "req-4");
    assert.equal(transition.options?.correlationId, "corr-4");
    assert.equal(
      transition.options?.idempotencyKey,
      `points.daily_claim:acct-4:nonce-a:transition:${transition.toState}`,
    );
  }
});

test("idempotency key helper produces deterministic attempt key when nonce is provided", async () => {
  const claimModule = await loadWorkspaceModule<{
    createDailyClaimIdempotencyKey: (accountId: string, nonce?: string) => string;
  }>("../../apps/points-tasks-web/app/lib/claim-execution.ts");

  const key = claimModule.createDailyClaimIdempotencyKey("acct-key", "nonce-fixed");
  assert.equal(key, "points.daily_claim:acct-key:nonce-fixed");
});

test("claim submission lock prevents duplicate in-flight submit", async () => {
  const claimModule = await loadWorkspaceModule<{
    createClaimSubmissionLock: () => { acquire: () => boolean; release: () => void; isLocked: () => boolean };
  }>("../../apps/points-tasks-web/app/lib/claim-execution.ts");

  const lock = claimModule.createClaimSubmissionLock();
  assert.equal(lock.acquire(), true);
  assert.equal(lock.isLocked(), true);
  assert.equal(lock.acquire(), false);
  lock.release();
  assert.equal(lock.isLocked(), false);
});

test("retryable and terminal errors map to distinct UX guidance", async () => {
  const claimModule = await loadWorkspaceModule<{
    resolveClaimFailurePresentation: (error: { retryable: boolean }) => { retryCtaEnabled: boolean; guidance: string };
  }>("../../apps/points-tasks-web/app/lib/claim-execution.ts");

  const retryable = claimModule.resolveClaimFailurePresentation({ retryable: true });
  assert.equal(retryable.retryCtaEnabled, true);
  assert.equal(retryable.guidance.includes("resume"), true);

  const terminal = claimModule.resolveClaimFailurePresentation({ retryable: false });
  assert.equal(terminal.retryCtaEnabled, false);
  assert.equal(terminal.guidance.includes("new attempt"), true);
});

test("partial workflow failure returns intent context and retry can resume without recreating intent", async () => {
  const claimServer = await loadWorkspaceModule<{
    executeDailyClaimWorkflow: (input: {
      payClient: {
        createPaymentIntent: () => Promise<{ intent_id: string; state: string }>;
        transitionPaymentIntent: (
          intentId: string,
          toState: string,
          options?: Record<string, string>,
        ) => Promise<{ state: string }>;
      };
      scope: { accountId: string };
      attempt: { idempotencyKey: string; requestId: string; correlationId: string; intentId?: string };
    }) => Promise<{ ok: boolean; intentId?: string; failedTransition?: string }>;
  }>("../../apps/points-tasks-web/app/lib/claim-execution-server.ts");

  const partial = await claimServer.executeDailyClaimWorkflow({
    payClient: {
      async createPaymentIntent() {
        return { intent_id: "pi-partial-1", state: "created" };
      },
      async transitionPaymentIntent() {
        throw {
          code: "upstream_unavailable",
          message: "transition timeout",
          retryable: true,
          source: "pay",
        };
      },
    },
    scope: { accountId: "acct-retry" },
    attempt: {
      idempotencyKey: "points.daily_claim:acct-retry:nonce-1",
      requestId: "req-retry",
      correlationId: "corr-retry",
    },
  });

  assert.equal(partial.ok, false);
  assert.equal(partial.intentId, "pi-partial-1");
  assert.equal(partial.failedTransition, "authorized");

  let createCalled = 0;
  const resumed = await claimServer.executeDailyClaimWorkflow({
    payClient: {
      async createPaymentIntent() {
        createCalled += 1;
        return { intent_id: "pi-should-not-run", state: "created" };
      },
      async transitionPaymentIntent(_intentId, toState) {
        return { state: toState };
      },
    },
    scope: { accountId: "acct-retry" },
    attempt: {
      idempotencyKey: "points.daily_claim:acct-retry:nonce-1",
      requestId: "req-retry",
      correlationId: "corr-retry",
      intentId: partial.intentId,
    },
  });

  assert.equal(createCalled, 0);
  assert.equal(resumed.ok, true);
});

test("runtime guard requires pay auth token in http mode", async () => {
  const claimServer = await loadWorkspaceModule<{
    validateDailyClaimExecutionRuntime: (
      input: { mode: "mock" | "http"; hasPayAuthToken: boolean },
      requestId: string,
      correlationId: string,
    ) => { status: number; error: { code: string; retryable: boolean } } | null;
  }>("../../apps/points-tasks-web/app/lib/claim-execution-server.ts");

  const missingAuth = claimServer.validateDailyClaimExecutionRuntime(
    {
      mode: "http",
      hasPayAuthToken: false,
    },
    "req-auth",
    "corr-auth",
  );

  assert.equal(missingAuth?.status, 412);
  assert.equal(missingAuth?.error.code, "pay_claim_auth_missing");
  assert.equal(missingAuth?.error.retryable, false);

  const mockMode = claimServer.validateDailyClaimExecutionRuntime(
    {
      mode: "mock",
      hasPayAuthToken: false,
    },
    "req-auth",
    "corr-auth",
  );

  assert.equal(mockMode, null);
});

test("client helper surfaces terminal error UX and preserves intent id for diagnostics", async () => {
  const claimClient = await loadWorkspaceModule<{
    executeDailyClaimAttempt: (input: {
      scope: { accountId: string };
      attempt: { idempotencyKey: string; requestId: string; correlationId: string; intentId?: string };
      fetchImpl?: typeof fetch;
    }) => Promise<{
      ok: boolean;
      attempt: { intentId?: string };
      retry?: { retryCtaEnabled: boolean };
      error?: { code: string; retryable: boolean };
    }>;
  }>("../../apps/points-tasks-web/app/lib/claim-execution-client.ts");

  const fetchImpl: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "already_claimed",
          message: "Daily claim has already been completed.",
          retryable: false,
          source: "pay",
        },
        data: {
          intentId: "pi-terminal-1",
        },
      }),
      {
        status: 422,
        headers: { "content-type": "application/json" },
      },
    );
  };

  const result = await claimClient.executeDailyClaimAttempt({
    scope: { accountId: "acct-terminal" },
    attempt: {
      idempotencyKey: "points.daily_claim:acct-terminal:nonce-1",
      requestId: "req-terminal",
      correlationId: "corr-terminal",
    },
    fetchImpl,
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("Expected terminal failure result");
  }

  assert.equal(result.error?.code, "already_claimed");
  assert.equal(result.error?.retryable, false);
  assert.equal(result.retry?.retryCtaEnabled, false);
  assert.equal(result.attempt.intentId, "pi-terminal-1");
});
