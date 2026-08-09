import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

test("pay claim lifecycle notifications map canonical stages to user copy", async () => {
  const module = await loadWorkspaceModule<{
    buildClaimLifecycleNotification: (input: {
      stage: "submitted" | "processing" | "completed" | "failed";
      payoutId?: string;
      intentId?: string;
      requestId?: string;
      correlationId?: string;
      retryable?: boolean;
    }) => { category: string; severity: string; message: string; dedupeKey?: string; href?: string };
    resolveClaimLifecycleStageFromIntentState: (state?: string) =>
      | "submitted"
      | "processing"
      | "completed"
      | "failed";
  }>("../../apps/pay-web/app/lib/notification-comms.ts");

  const submitted = module.buildClaimLifecycleNotification({
    stage: "submitted",
    payoutId: "po_123456789",
    requestId: "req_1",
    correlationId: "corr_1",
  });
  assert.equal(submitted.category, "claims");
  assert.equal(submitted.severity, "info");
  assert.match(submitted.message, /Claim submitted/);
  assert.match(submitted.href ?? "", /\/payouts/);

  const processing = module.buildClaimLifecycleNotification({
    stage: "processing",
    payoutId: "po_123456789",
    intentId: "intent_1",
  });
  assert.equal(processing.severity, "info");
  assert.match(processing.message, /processing/);

  const completed = module.buildClaimLifecycleNotification({
    stage: "completed",
    payoutId: "po_123456789",
    intentId: "intent_1",
  });
  assert.equal(completed.severity, "success");
  assert.match(completed.message, /completed/);

  const failedRetryable = module.buildClaimLifecycleNotification({
    stage: "failed",
    payoutId: "po_123456789",
    requestId: "req_2",
    retryable: true,
  });
  assert.equal(failedRetryable.severity, "warn");
  assert.match(failedRetryable.message, /Retry is available/);

  assert.equal(module.resolveClaimLifecycleStageFromIntentState("settled"), "completed");
  assert.equal(module.resolveClaimLifecycleStageFromIntentState("executing"), "processing");
});

test("pay payout status notifications map queue/processing/completed/failed variants", async () => {
  const module = await loadWorkspaceModule<{
    buildPayoutStatusNotification: (payout: {
      id: string;
      status: "SCHEDULED" | "PROCESSING" | "COMPLETED" | "FAILED";
      failureReason?: string;
    }) => { category: string; severity: string; message: string; dedupeKey?: string };
  }>("../../apps/pay-web/app/lib/notification-comms.ts");

  const queued = module.buildPayoutStatusNotification({ id: "po_1", status: "SCHEDULED" });
  assert.equal(queued.category, "payouts");
  assert.equal(queued.severity, "info");
  assert.match(queued.message, /queued/);

  const processing = module.buildPayoutStatusNotification({ id: "po_1", status: "PROCESSING" });
  assert.equal(processing.severity, "info");
  assert.match(processing.message, /processing/);

  const completed = module.buildPayoutStatusNotification({ id: "po_1", status: "COMPLETED" });
  assert.equal(completed.severity, "success");
  assert.match(completed.message, /completed/);

  const failedRetryable = module.buildPayoutStatusNotification({
    id: "po_1",
    status: "FAILED",
    failureReason: "temporary timeout from upstream",
  });
  assert.equal(failedRetryable.severity, "warn");

  const failedFinal = module.buildPayoutStatusNotification({
    id: "po_1",
    status: "FAILED",
    failureReason: "policy_denied",
  });
  assert.equal(failedFinal.severity, "error");
});

test("points/tasks notification mappers cover task and daily-claim lifecycle transitions", async () => {
  const module = await loadWorkspaceModule<{
    buildDailyClaimLifecycleNotification: (input: {
      stage: "submitted" | "processing" | "completed" | "failed";
      accountId: string;
      intentId?: string;
      requestId?: string;
      correlationId?: string;
      retryable?: boolean;
    }) => { category: string; severity: string; message: string };
    resolveDailyClaimLifecycleStageFromIntentState: (state?: string) =>
      | "submitted"
      | "processing"
      | "completed"
      | "failed";
    buildTaskStatusNotification: (task: {
      taskId: string;
      taskStatus: "not_started" | "eligible" | "in_progress" | "completed" | "failed" | "expired" | "canceled";
      progressState: "queued" | "active" | "blocked" | "under_review" | "done";
      pointsReward: number;
    }) => { category: string; severity: string; message: string };
  }>("../../apps/points-tasks-web/app/lib/notification-comms.ts");

  const claimSubmitted = module.buildDailyClaimLifecycleNotification({
    stage: "submitted",
    accountId: "acct-1",
    requestId: "req-1",
  });
  assert.equal(claimSubmitted.category, "claims");
  assert.equal(claimSubmitted.severity, "info");
  assert.match(claimSubmitted.message, /submitted/);

  const claimFailed = module.buildDailyClaimLifecycleNotification({
    stage: "failed",
    accountId: "acct-1",
    requestId: "req-1",
    retryable: true,
  });
  assert.equal(claimFailed.severity, "warn");

  assert.equal(module.resolveDailyClaimLifecycleStageFromIntentState("settled"), "completed");
  assert.equal(module.resolveDailyClaimLifecycleStageFromIntentState("executing"), "processing");

  const taskEligible = module.buildTaskStatusNotification({
    taskId: "task-1",
    taskStatus: "eligible",
    progressState: "queued",
    pointsReward: 10,
  });
  assert.equal(taskEligible.category, "tasks");
  assert.equal(taskEligible.severity, "info");
  assert.match(taskEligible.message, /eligible/);

  const taskInProgress = module.buildTaskStatusNotification({
    taskId: "task-1",
    taskStatus: "in_progress",
    progressState: "active",
    pointsReward: 10,
  });
  assert.match(taskInProgress.message, /in progress/);

  const taskCompleted = module.buildTaskStatusNotification({
    taskId: "task-1",
    taskStatus: "completed",
    progressState: "done",
    pointsReward: 10,
  });
  assert.equal(taskCompleted.severity, "success");
  assert.match(taskCompleted.message, /Reward/);
});
