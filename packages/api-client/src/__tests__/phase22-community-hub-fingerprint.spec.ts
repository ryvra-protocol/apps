import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

async function readWorkspaceFile(relativeToApiClient: string): Promise<string> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return readFile(absolutePath, "utf8");
}

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

test("uniform fingerprint awards always remain within 0.5 and 2.0", async () => {
  const module = await loadWorkspaceModule<{
    generateUniformRandomAwardPoints: (randomValue?: number) => number;
  }>("../../apps/points-tasks-web/app/lib/fingerprint-claim.ts");

  for (let index = 0; index <= 1000; index += 1) {
    const value = module.generateUniformRandomAwardPoints(index / 1000);
    assert.equal(value >= 0.5, true);
    assert.equal(value <= 2.0, true);
  }
});

test("fingerprint claim enforces one claim per day and idempotent retries", async () => {
  const module = await loadWorkspaceModule<{
    submitFingerprintClaim: (input: {
      scope: { accountId: string; userId?: string; workspaceId?: string };
      idempotencyKey: string;
      requestId: string;
      correlationId: string;
      nowIso?: string;
      randomValue?: number;
    }) =>
      | {
          ok: true;
          awardedPoints: number;
          claimDateKey: string;
          metrics: { totalFingerprints: number; totalPrintsScanned: number; cumulativePointsAwarded: number; averagePointsPerScan: number };
        }
      | { ok: false; error: { code: string } };
    resetFingerprintClaimStateForTests: () => void;
  }>("../../apps/points-tasks-web/app/lib/fingerprint-claim.ts");

  module.resetFingerprintClaimStateForTests();
  const scope = { accountId: "acct-phase22", userId: "user-a", workspaceId: "ws-a" };
  const nowIso = "2026-09-11T12:00:00.000Z";

  const first = module.submitFingerprintClaim({
    scope,
    idempotencyKey: "claim-1",
    requestId: "req-1",
    correlationId: "corr-1",
    nowIso,
    randomValue: 0.5,
  });
  assert.equal(first.ok, true);
  if (!first.ok) {
    return;
  }
  assert.equal(first.claimDateKey, "2026-09-11");
  assert.equal(first.metrics.totalFingerprints, 1);
  assert.equal(first.metrics.totalPrintsScanned, 1);
  assert.equal(Number(first.metrics.averagePointsPerScan.toFixed(6)), Number(first.awardedPoints.toFixed(6)));

  const replay = module.submitFingerprintClaim({
    scope,
    idempotencyKey: "claim-1",
    requestId: "req-2",
    correlationId: "corr-2",
    nowIso,
    randomValue: 0.99,
  });
  assert.equal(replay.ok, true);
  if (!replay.ok) {
    return;
  }
  assert.equal(Number(replay.awardedPoints.toFixed(6)), Number(first.awardedPoints.toFixed(6)));
  assert.equal(replay.metrics.totalFingerprints, 1);
  assert.equal(replay.metrics.totalPrintsScanned, 1);

  const second = module.submitFingerprintClaim({
    scope,
    idempotencyKey: "claim-2",
    requestId: "req-3",
    correlationId: "corr-3",
    nowIso: "2026-09-11T20:00:00.000Z",
    randomValue: 0.3,
  });
  assert.equal(second.ok, false);
  if (second.ok) {
    return;
  }
  assert.equal(second.error.code, "already_claimed_today");
});

test("community top metrics cards and fingerprint UI states are wired", async () => {
  const overviewSource = await readWorkspaceFile("../../apps/points-tasks-web/app/components/points-tasks-overview-content.tsx");
  const claimCardSource = await readWorkspaceFile("../../apps/points-tasks-web/app/components/daily-claim-card.tsx");

  assert.match(overviewSource, /title="Total fingerprints"/);
  assert.match(overviewSource, /title="Total prints scanned"/);
  assert.match(overviewSource, /title="Cumulative points awarded"/);
  assert.match(overviewSource, /title="Average points per scan"/);
  assert.match(overviewSource, /title="Derived calculations"/);

  assert.match(claimCardSource, /className="daily-claim-fingerprint"/);
  assert.match(claimCardSource, /Ready to scan fingerprint/);
  assert.match(claimCardSource, /Fingerprint scan is processing/);
  assert.match(claimCardSource, /Fingerprint already claimed today/);
  assert.match(claimCardSource, /Fingerprint scan failed\. Retry when ready/);
});

test("fingerprint button state resolver returns deterministic transitions", async () => {
  const module = await loadWorkspaceModule<{
    resolveFingerprintClaimButtonState: (input: {
      isSubmitting: boolean;
      isRefreshing: boolean;
      didSucceed: boolean;
      hasError: boolean;
      isAlreadyClaimed: boolean;
    }) => string;
  }>("../../apps/points-tasks-web/app/lib/fingerprint-claim-ui.ts");

  assert.equal(
    module.resolveFingerprintClaimButtonState({
      isSubmitting: false,
      isRefreshing: false,
      didSucceed: false,
      hasError: false,
      isAlreadyClaimed: false,
    }),
    "ready_to_scan",
  );
  assert.equal(
    module.resolveFingerprintClaimButtonState({
      isSubmitting: true,
      isRefreshing: false,
      didSucceed: false,
      hasError: false,
      isAlreadyClaimed: false,
    }),
    "scanning",
  );
  assert.equal(
    module.resolveFingerprintClaimButtonState({
      isSubmitting: false,
      isRefreshing: false,
      didSucceed: true,
      hasError: false,
      isAlreadyClaimed: false,
    }),
    "success",
  );
  assert.equal(
    module.resolveFingerprintClaimButtonState({
      isSubmitting: false,
      isRefreshing: false,
      didSucceed: false,
      hasError: false,
      isAlreadyClaimed: true,
    }),
    "already_claimed",
  );
  assert.equal(
    module.resolveFingerprintClaimButtonState({
      isSubmitting: false,
      isRefreshing: false,
      didSucceed: false,
      hasError: true,
      isAlreadyClaimed: false,
    }),
    "error",
  );
});
