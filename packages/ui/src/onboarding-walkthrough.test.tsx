import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingWalkthroughDialog, resolveNextFocusIndex } from "./OnboardingWalkthrough";
import {
  buildOnboardingWalkthroughStorageKey,
  readOnboardingWalkthroughState,
  shouldShowOnboardingWalkthrough,
  writeOnboardingWalkthroughState,
} from "./onboarding-walkthrough";

test("onboarding walkthrough appears once then stays dismissed or completed", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };

  assert.equal(shouldShowOnboardingWalkthrough(storage, "pay:acct-1:workspace-1"), true);

  writeOnboardingWalkthroughState(storage, "pay:acct-1:workspace-1", "dismissed");
  assert.equal(readOnboardingWalkthroughState(storage, "pay:acct-1:workspace-1"), "dismissed");
  assert.equal(shouldShowOnboardingWalkthrough(storage, "pay:acct-1:workspace-1"), false);

  writeOnboardingWalkthroughState(storage, "markets:acct-1:workspace-1", "completed");
  assert.equal(readOnboardingWalkthroughState(storage, "markets:acct-1:workspace-1"), "completed");
  assert.equal(shouldShowOnboardingWalkthrough(storage, "markets:acct-1:workspace-1"), false);

  assert.equal(
    buildOnboardingWalkthroughStorageKey("pay account"),
    "ryvra:onboarding:walkthrough:v1:pay_account",
  );
});

test("onboarding modal exposes accessible dialog semantics", () => {
  const markup = renderToStaticMarkup(
    <OnboardingWalkthroughDialog
      content={{
        heading: "Welcome to Ryvra Pay!",
        appSummary: "Move money faster.",
        keyActionsSummary: "Use Send and Receive.",
        safeStartSummary: "Start with a small transfer.",
      }}
      onDismiss={() => undefined}
      onComplete={() => undefined}
    />,
  );

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /Welcome to Ryvra Pay!/);
  assert.match(markup, /Show me around!/);
  assert.match(markup, /Maybe later/);
});

test("focus trap index wraps for tab and shift+tab", () => {
  assert.equal(resolveNextFocusIndex(-1, 3, false), 0);
  assert.equal(resolveNextFocusIndex(2, 3, false), 0);
  assert.equal(resolveNextFocusIndex(0, 3, true), 2);
  assert.equal(resolveNextFocusIndex(-1, 3, true), 2);
  assert.equal(resolveNextFocusIndex(0, 0, false), -1);
});
