import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceScopeSwitcher } from "./WorkspaceScopeSwitcher";
import {
  applyScopeToQuery,
  appendScopeToHref,
  buildScopePersistenceStorageKey,
  buildWorkspaceScopeOptions,
  parseStoredScope,
  resolveWorkspaceScope,
} from "./workspace-scope";

const accountOptions = buildWorkspaceScopeOptions(["acct-core-1", "acct-core-2"]);
const workspaceOptions = buildWorkspaceScopeOptions(["workspace-core-1", "workspace-core-2"]);
const userOptions = buildWorkspaceScopeOptions(["user-core-1", "user-core-2"]);

test("scope resolution canonicalizes aliases and invalid values to safe defaults", () => {
  const result = resolveWorkspaceScope({
    searchParams: new URLSearchParams("accountId=@@invalid&workspaceId=workspace-unknown&userId=user-core-2"),
    defaults: {
      accountId: "acct-core-1",
      workspaceId: "workspace-core-1",
      userId: "user-core-1",
    },
    accountOptions,
    workspaceOptions,
    userOptions,
    includeUserScope: true,
  });

  assert.equal(result.scope.accountId, "acct-core-1");
  assert.equal(result.scope.workspaceId, "workspace-core-1");
  assert.equal(result.scope.userId, "user-core-2");
  assert.match(result.notices.join(" "), /Account scope value was invalid/);
  assert.match(result.notices.join(" "), /Workspace scope value is not available/);
  assert.equal(result.canonicalSearchParams.get("account_id"), "acct-core-1");
  assert.equal(result.canonicalSearchParams.get("workspace_id"), "workspace-core-1");
  assert.equal(result.canonicalSearchParams.get("user_id"), "user-core-2");
  assert.equal(result.canonicalSearchParams.get("accountId"), null);
  assert.equal(result.canonicalSearchParams.get("workspaceId"), null);
  assert.equal(result.canonicalSearchParams.get("userId"), null);
  assert.equal(result.needsCanonicalization, true);
});

test("scope query updates preserve only compatible keys", () => {
  const updated = applyScopeToQuery({
    searchParams: new URLSearchParams("account_id=acct-core-1&workspace_id=workspace-core-1&cursor=abc&window=30d"),
    scope: {
      accountId: "acct-core-2",
      workspaceId: "workspace-core-2",
    },
    preserveKeys: ["window"],
  });

  assert.equal(updated.get("window"), "30d");
  assert.equal(updated.get("cursor"), null);
  assert.equal(updated.get("account_id"), "acct-core-2");
  assert.equal(updated.get("workspace_id"), "workspace-core-2");
});

test("stored scope parsing accepts valid payloads and rejects malformed data", () => {
  assert.equal(parseStoredScope(null), null);
  assert.equal(parseStoredScope("not-json"), null);
  assert.equal(parseStoredScope(JSON.stringify({ accountId: "!" })), null);

  assert.deepEqual(
    parseStoredScope(
      JSON.stringify({
        accountId: "acct-core-2",
        workspaceId: "workspace-core-2",
        userId: "user-core-2",
      }),
    ),
    {
      accountId: "acct-core-2",
      workspaceId: "workspace-core-2",
      userId: "user-core-2",
    },
  );
});

test("scope switcher markup exposes accessible selectors and notices", () => {
  const markup = renderToStaticMarkup(
    <WorkspaceScopeSwitcher
      scope={{ accountId: "acct-core-1", workspaceId: "workspace-core-1", userId: "user-core-1" }}
      accountOptions={accountOptions}
      workspaceOptions={workspaceOptions}
      userOptions={userOptions}
      includeUserScope
      roleLabel="Viewer"
      notices={["Account scope value was invalid and has been reset."]}
      onScopeChange={() => undefined}
    />,
  );

  assert.match(markup, /aria-label="Account scope selector"/);
  assert.match(markup, /aria-label="Workspace scope selector"/);
  assert.match(markup, /aria-label="User scope selector"/);
  assert.match(markup, /Current workspace role Viewer/);
  assert.match(markup, /Scope validation notices/);
  assert.match(markup, /ryvra-scope-select:focus-visible/);
});

test("scope helpers remain consistent across markets, pay, and points shells", () => {
  const markets = resolveWorkspaceScope({
    searchParams: new URLSearchParams("accountId=acct-core-2&workspaceId=workspace-core-2"),
    defaults: { accountId: "acct-core-1", workspaceId: "workspace-core-1" },
    accountOptions,
    workspaceOptions,
  });
  const pay = resolveWorkspaceScope({
    searchParams: new URLSearchParams("accountId=acct-core-2&workspaceId=workspace-core-2"),
    defaults: { accountId: "acct-core-1", workspaceId: "workspace-core-1" },
    accountOptions,
    workspaceOptions,
  });
  const points = resolveWorkspaceScope({
    searchParams: new URLSearchParams("accountId=acct-core-2&workspaceId=workspace-core-2&userId=user-core-2"),
    defaults: { accountId: "acct-core-1", workspaceId: "workspace-core-1", userId: "user-core-1" },
    accountOptions,
    workspaceOptions,
    userOptions,
    includeUserScope: true,
  });

  assert.equal(markets.canonicalSearchParams.get("account_id"), "acct-core-2");
  assert.equal(pay.canonicalSearchParams.get("workspace_id"), "workspace-core-2");
  assert.equal(markets.canonicalSearchParams.get("user_id"), null);
  assert.equal(pay.canonicalSearchParams.get("user_id"), null);
  assert.equal(points.canonicalSearchParams.get("user_id"), "user-core-2");

  assert.equal(buildScopePersistenceStorageKey("markets"), "ryvra.scope.markets");
  assert.equal(buildScopePersistenceStorageKey("pay"), "ryvra.scope.pay");
  assert.equal(buildScopePersistenceStorageKey("points"), "ryvra.scope.points");
});

test("scope links retain paths while writing canonical scope keys", () => {
  const href = appendScopeToHref("/orders?foo=bar#top", {
    accountId: "acct-core-2",
    workspaceId: "workspace-core-2",
  });

  assert.equal(href, "/orders?foo=bar&account_id=acct-core-2&workspace_id=workspace-core-2#top");
});
