import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DelegationProvenanceChips, matchesDelegationView, type DelegatedOperationContext } from "./DelegationContext";

const availableContext: DelegatedOperationContext = {
  available: true,
  initiatedBy: "operator-1",
  actingFor: "user-9",
  accountId: "acct-core-1",
  workspaceId: "workspace-core-1",
};

test("delegation filters match mine and delegated variants", () => {
  assert.equal(matchesDelegationView(availableContext, "all", "operator-1"), true);
  assert.equal(matchesDelegationView(availableContext, "mine", "operator-1"), true);
  assert.equal(matchesDelegationView(availableContext, "mine", "user-9"), true);
  assert.equal(matchesDelegationView(availableContext, "delegated_by_me", "operator-1"), true);
  assert.equal(matchesDelegationView(availableContext, "delegated_to_me", "user-9"), true);
  assert.equal(matchesDelegationView(availableContext, "delegated_to_me", "operator-1"), false);
});

test("delegation filters reject scoped views when metadata is unavailable", () => {
  const unavailable: DelegatedOperationContext = {
    available: false,
    unavailableReason: "Not available in current environment",
  };

  assert.equal(matchesDelegationView(unavailable, "all", "user-1"), true);
  assert.equal(matchesDelegationView(unavailable, "mine", "user-1"), false);
  assert.equal(matchesDelegationView(unavailable, "delegated_by_me", "user-1"), false);
  assert.equal(matchesDelegationView(unavailable, "delegated_to_me", "user-1"), false);
});

test("provenance chips render available and unavailable states explicitly", () => {
  const availableMarkup = renderToStaticMarkup(<DelegationProvenanceChips context={availableContext} />);
  assert.match(availableMarkup, /Delegated operation provenance/);
  assert.match(availableMarkup, /Initiated by: operator-1/);
  assert.match(availableMarkup, /Acting for: user-9/);
  assert.match(availableMarkup, /Account: acct-core-1/);
  assert.match(availableMarkup, /Workspace: worksp/);

  const unavailableMarkup = renderToStaticMarkup(
    <DelegationProvenanceChips
      context={{
        available: false,
        unavailableReason: "Not available in current environment",
      }}
    />,
  );
  assert.match(unavailableMarkup, /Delegated operation provenance unavailable/);
  assert.match(unavailableMarkup, /Not available in current environment/);
});
