import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GettingStartedChecklist } from "./GettingStartedChecklist";
import {
  buildGettingStartedChecklistStorageKey,
  completeChecklistStep,
  createGettingStartedChecklistState,
  readChecklistState,
  resetChecklistState,
  resolveChecklistProgress,
  setChecklistDismissed,
  toggleChecklistMinimized,
  writeChecklistState,
} from "./getting-started-checklist";

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

test("checklist progression, persistence, and reset remain deterministic", () => {
  const storage = createMemoryStorage();
  const storageKey = buildGettingStartedChecklistStorageKey("points-tasks-web", "h12345678");

  let state = createGettingStartedChecklistState(["connect_select_scope"]);
  state = completeChecklistStep(state, "review_unified_balance");
  state = completeChecklistStep(state, "complete_first_action");

  const progress = resolveChecklistProgress(state);
  assert.equal(progress.completed, 3);
  assert.equal(progress.remaining, 1);

  writeChecklistState(storage, storageKey, state);
  const restored = readChecklistState(storage, storageKey);
  assert.deepEqual(restored, state);

  const reset = resetChecklistState(state, ["connect_select_scope"]);
  assert.deepEqual(reset.completedStepIds, ["connect_select_scope"]);
  assert.equal(reset.minimized, false);
  assert.equal(reset.dismissed, false);
});

test("checklist dismiss/minimize state can resume from persistence", () => {
  const storage = createMemoryStorage();
  const storageKey = buildGettingStartedChecklistStorageKey("pay-web", "habc12345");

  let state = createGettingStartedChecklistState(["connect_select_scope"]);
  state = toggleChecklistMinimized(state);
  state = setChecklistDismissed(state, true);
  writeChecklistState(storage, storageKey, state);

  const restored = readChecklistState(storage, storageKey);
  assert.equal(restored?.minimized, true);
  assert.equal(restored?.dismissed, true);
  assert.deepEqual(restored?.completedStepIds, ["connect_select_scope"]);
});

test("getting started checklist renders accessible onboarding controls", () => {
  const markup = renderToStaticMarkup(
    <GettingStartedChecklist
      appId="markets-web"
      route="/"
      scope={{ accountId: "acct-core-1", workspaceId: "workspace-core-1" }}
      scopeHref="/?account_id=acct-core-1"
      unifiedBalanceHref="/overview?account_id=acct-core-1"
      firstActionHref="/orders?account_id=acct-core-1"
      firstActionLabel="Complete first task action"
      notificationsHref="/status?account_id=acct-core-1"
      storage={createMemoryStorage()}
    />, 
  );

  assert.match(markup, /Getting started/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /aria-label="Getting started activation checklist"/);
  assert.match(markup, /aria-label="Dismiss getting started checklist"/);
});
