import assert from "node:assert/strict";
import test from "node:test";
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

test("funnel events emit in order with privacy-safe payload shape", () => {
  const storage = createMemoryStorage();
  const instrumentation = createGrowthInstrumentation({
    appId: "pay-web",
    route: "/payouts",
    scope: {
      accountId: "acct-core-1",
      workspaceId: "workspace-core-1",
    },
    storage,
    now: () => "2026-08-13T00:00:00.000Z",
  });

  instrumentation.emitFunnelStage("landing_first_session", "stage_entered", {
    metadata: {
      safe_flag: true,
      authToken: "secret",
    },
  });
  instrumentation.emitFunnelStage("landing_first_session", "stage_completed");

  const events = readStoredGrowthEvents(storage);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.eventName, "stage_entered");
  assert.equal(events[0]?.stage, "landing_first_session");
  assert.equal(events[1]?.eventName, "stage_completed");
  assert.equal(events[1]?.stage, "landing_first_session");
  assert.equal(events[0]?.appId, "pay-web");
  assert.equal(events[0]?.route, "/payouts");
  assert.equal(events[0]?.sinkMode, "local_preview");
  assert.match(events[0]?.scopeHash ?? "", /^h[0-9a-f]{8}$/);
  assert.equal(events[0]?.at, "2026-08-13T00:00:00.000Z");
  assert.equal(events[0]?.metadata?.safe_flag, true);
  assert.equal(Object.prototype.hasOwnProperty.call(events[0]?.metadata ?? {}, "authToken"), false);
});
