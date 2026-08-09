import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

test("pay payout timeline mapping marks processing and failures correctly", async () => {
  const module = await loadWorkspaceModule<{
    buildPayoutTimelineStages: (payout: {
      id: string;
      amountMinor: number;
      currency: string;
      status: "SCHEDULED" | "PROCESSING" | "COMPLETED" | "FAILED";
      destinationType: "BANK_ACCOUNT";
      destinationLabel: string;
      createdAt: string;
      scheduledFor?: string;
      completedAt?: string;
      failureReason?: string;
    }) => Array<{ id: string; status: string; current?: boolean }>;
  }>("../../apps/pay-web/app/lib/trust-compliance.ts");

  const processing = module.buildPayoutTimelineStages({
    id: "pay_1",
    amountMinor: 100,
    currency: "USD",
    status: "PROCESSING",
    destinationType: "BANK_ACCOUNT",
    destinationLabel: "Treasury",
    createdAt: "2026-08-09T15:00:00.000Z",
  });

  assert.equal(processing[0]?.status, "completed");
  assert.equal(processing[1]?.status, "current");
  assert.equal(processing[1]?.current, true);

  const failed = module.buildPayoutTimelineStages({
    id: "pay_2",
    amountMinor: 100,
    currency: "USD",
    status: "FAILED",
    destinationType: "BANK_ACCOUNT",
    destinationLabel: "Treasury",
    createdAt: "2026-08-09T15:00:00.000Z",
    failureReason: "policy block",
  });

  assert.equal(failed[3]?.status, "current");
});

test("markets order timeline mapping includes route and failure stages", async () => {
  const module = await loadWorkspaceModule<{
    buildOrderTimelineStages: (order: {
      id: string;
      referenceId: string;
      idempotencyKey: string;
      correlationId: string;
      accountId: string;
      routeId?: string;
      side: "buy";
      type: "market";
      status: "routed" | "failed" | "settled";
      policyDecision: "ALLOW" | "DENY" | "REVIEW";
      reasonCodes: string[];
      baseAsset: string;
      quoteAsset: string;
      size: string;
      createdAt: string;
      updatedAt: string;
    }) => Array<{ id: string; status: string; references?: Array<{ label: string; value?: string | null }> }>;
  }>("../../apps/markets-web/app/lib/trust-compliance.ts");

  const routed = module.buildOrderTimelineStages({
    id: "ord_1",
    referenceId: "ref_1",
    idempotencyKey: "idem_1",
    correlationId: "corr_1",
    accountId: "acct_1",
    routeId: "route_1",
    side: "buy",
    type: "market",
    status: "routed",
    policyDecision: "ALLOW",
    reasonCodes: [],
    baseAsset: "btc",
    quoteAsset: "usd",
    size: "1",
    createdAt: "2026-08-09T15:00:00.000Z",
    updatedAt: "2026-08-09T15:01:00.000Z",
  });

  assert.equal(routed[2]?.status, "current");
  assert.equal(routed[2]?.references?.[0]?.value, "route_1");

  const failed = module.buildOrderTimelineStages({
    id: "ord_2",
    referenceId: "ref_2",
    idempotencyKey: "idem_2",
    correlationId: "corr_2",
    accountId: "acct_1",
    side: "buy",
    type: "market",
    status: "failed",
    policyDecision: "DENY",
    reasonCodes: ["policy_denied"],
    baseAsset: "btc",
    quoteAsset: "usd",
    size: "1",
    createdAt: "2026-08-09T15:00:00.000Z",
    updatedAt: "2026-08-09T15:02:00.000Z",
  });

  assert.equal(failed[5]?.status, "current");
});

test("task and daily claim timeline mappings preserve progression semantics", async () => {
  const module = await loadWorkspaceModule<{
    buildTaskTimelineStages: (task: {
      taskId: string;
      accountId: string;
      taskType: "custom";
      taskStatus: "in_progress" | "completed" | "failed";
      progressState: "active" | "done";
      title: string;
      progressPercent: number;
      pointsReward: number;
      createdAt: string;
      updatedAt: string;
      startedAt?: string | null;
      completedAt?: string | null;
    }) => Array<{ id: string; status: string }>;
    buildDailyClaimTimelineStages: (
      model: {
        status: "available" | "already_claimed" | "cooldown" | "unavailable";
        statusLabel: string;
        cta: { label: string; enabled: boolean; reason?: string };
        retryable: boolean;
        nextEligibleAt?: string;
        nextEligibleLabel?: string;
        errorMessage?: string;
      },
      observedAtIso: string,
    ) => Array<{ id: string; status: string; current?: boolean }>;
  }>("../../apps/points-tasks-web/app/lib/trust-compliance.ts");

  const activeTask = module.buildTaskTimelineStages({
    taskId: "task_1",
    accountId: "acct_1",
    taskType: "custom",
    taskStatus: "in_progress",
    progressState: "active",
    title: "KYC",
    progressPercent: 50,
    pointsReward: 100,
    createdAt: "2026-08-09T15:00:00.000Z",
    updatedAt: "2026-08-09T15:10:00.000Z",
    startedAt: "2026-08-09T15:01:00.000Z",
  });
  assert.equal(activeTask[2]?.status, "current");

  const failedTask = module.buildTaskTimelineStages({
    taskId: "task_2",
    accountId: "acct_1",
    taskType: "custom",
    taskStatus: "failed",
    progressState: "done",
    title: "KYC",
    progressPercent: 100,
    pointsReward: 100,
    createdAt: "2026-08-09T15:00:00.000Z",
    updatedAt: "2026-08-09T15:11:00.000Z",
  });
  assert.equal(failedTask[4]?.status, "current");

  const cooldownTimeline = module.buildDailyClaimTimelineStages(
    {
      status: "cooldown",
      statusLabel: "Cooldown",
      cta: { label: "Claim", enabled: false },
      retryable: false,
      nextEligibleAt: "2026-08-09T16:00:00.000Z",
      nextEligibleLabel: "1h remaining",
    },
    "2026-08-09T15:30:00.000Z",
  );

  assert.equal(cooldownTimeline[1]?.status, "current");
  assert.equal(cooldownTimeline[1]?.current, true);
});
