import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateRoutePermission, resolveRoutePermissionMeta } from "../routing.ts";

test("route permission evaluation allows matching roles", () => {
  const decision = evaluateRoutePermission({ roles: ["member", "admin"] }, ["support", "member"]);
  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, undefined);
});

test("route permission evaluation returns explicit denied reason", () => {
  const decision = evaluateRoutePermission({ roles: ["admin"] }, ["support"]);
  assert.equal(decision.allowed, false);
  assert.match(decision.reason ?? "", /Requires admin role/i);
});

test("route permission metadata resolves for restricted pay and tasks routes", () => {
  assert.deepEqual(resolveRoutePermissionMeta("pay", "/reconciliation"), { roles: ["admin"] });
  assert.deepEqual(resolveRoutePermissionMeta("pay", "/payouts"), { roles: ["member", "admin"] });
  assert.deepEqual(resolveRoutePermissionMeta("points", "/tasks"), { roles: ["member", "admin"], permission: "tasks:read" });
});
