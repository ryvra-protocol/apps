import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ClaimExperimentStatus } from "./ClaimExperimentStatus";
import {
  buildClaimExperimentStorageKey,
  buildClaimVariantPresentation,
  claimConversionExperimentId,
  createClaimConversionEventTracker,
  resolveClaimActionEnabled,
  resolveClaimExperimentAssignment,
  resolveClaimExperimentOverride,
} from "./claim-conversion-experiment";
import { createGrowthInstrumentation, readStoredGrowthEvents } from "./growth-instrumentation";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

test("experiment assignment is deterministic and honors QA override controls", () => {
  const storageA = createMemoryStorage();
  const storageB = createMemoryStorage();

  const deterministicA = resolveClaimExperimentAssignment({
    scopeHash: "h11111111",
    storage: storageA,
  });
  const deterministicB = resolveClaimExperimentAssignment({
    scopeHash: "h11111111",
    storage: storageB,
  });

  assert.equal(deterministicA.variant, deterministicB.variant);
  assert.equal(deterministicA.source, "deterministic");

  const override = resolveClaimExperimentOverride("claim_variant=trust_boost");
  const overridden = resolveClaimExperimentAssignment({
    scopeHash: "h11111111",
    storage: storageA,
    ...(override ? { overrideVariant: override } : {}),
  });

  assert.equal(overridden.variant, "trust_boost");
  assert.equal(overridden.source, "qa_override");
  assert.equal(storageA.getItem(buildClaimExperimentStorageKey(claimConversionExperimentId, "h11111111")), "trust_boost");
});

test("claim variants render distinct conversion copy and guardrails stay enforced", () => {
  const control = buildClaimVariantPresentation("control", {
    defaultCtaLabel: "Claim",
  });
  const trustBoost = buildClaimVariantPresentation("trust_boost", {
    defaultCtaLabel: "Claim",
    trustBoostCtaLabel: "Start secure claim",
  });

  assert.equal(control.emphasizeTrust, false);
  assert.equal(trustBoost.emphasizeTrust, true);
  assert.notEqual(control.ctaLabel, trustBoost.ctaLabel);

  assert.equal(resolveClaimActionEnabled(false, true), false);
  assert.equal(resolveClaimActionEnabled(true, false), false);
  assert.equal(resolveClaimActionEnabled(true, true), true);
});

test("exposure, click, success, and abandonment tracking emits expected events", () => {
  const storage = createMemoryStorage();
  const instrumentation = createGrowthInstrumentation({
    appId: "points-tasks-web",
    route: "/points",
    scope: {
      accountId: "acct-core-1",
      workspaceId: "workspace-core-1",
    },
    storage,
    now: () => "2026-08-13T00:00:00.000Z",
  });
  const assignment = resolveClaimExperimentAssignment({
    scopeHash: instrumentation.scopeHash,
    storage,
  });

  const tracker = createClaimConversionEventTracker({
    instrumentation,
    assignment,
    actionType: "claim",
  });

  tracker.trackExposure();
  tracker.trackCtaClick();
  tracker.trackSuccess();

  const events = readStoredGrowthEvents(storage);
  assert.deepEqual(
    events.map((event) => `${event.eventName}:${event.stage ?? "none"}`),
    [
      "variant_exposed:none",
      "cta_clicked:none",
      "stage_entered:first_key_action_initiation",
      "stage_completed:first_key_action_initiation",
      "claim_success:none",
      "stage_entered:completion_success",
      "stage_completed:completion_success",
    ],
  );

  const abandonedStorage = createMemoryStorage();
  const abandonedInstrumentation = createGrowthInstrumentation({
    appId: "pay-web",
    route: "/payouts",
    scope: { accountId: "acct-core-1", workspaceId: "workspace-core-1" },
    storage: abandonedStorage,
  });
  const abandonedAssignment = resolveClaimExperimentAssignment({
    scopeHash: abandonedInstrumentation.scopeHash,
    storage: abandonedStorage,
  });
  const abandonedTracker = createClaimConversionEventTracker({
    instrumentation: abandonedInstrumentation,
    assignment: abandonedAssignment,
    actionType: "payout",
  });

  abandonedTracker.trackCtaClick();
  abandonedTracker.trackAbandoned();

  const abandonedEvents = readStoredGrowthEvents(abandonedStorage);
  assert.equal(abandonedEvents[abandonedEvents.length - 1]?.eventName, "stage_abandoned");
  assert.equal(abandonedEvents[abandonedEvents.length - 1]?.stage, "first_key_action_initiation");
});

test("claim experiment status renders accessible variant messaging", () => {
  const markup = renderToStaticMarkup(
    <ClaimExperimentStatus
      experimentId="claim_conversion_phase19_v1"
      variant="trust_boost"
      overrideActive
    />,
  );

  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /QA override active/);
});
