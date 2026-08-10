import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "../types.ts";
import {
  canAccessWorkspaceCapability,
  describeWorkspaceCapabilityRequirement,
  resolveStubSessionFromEnv,
  resolveWorkspaceRoleView,
  roleClaimsFromSession,
} from "../workspace-access.ts";

test("workspace role view maps role claims to viewer/operator/admin capabilities", () => {
  const viewer = resolveWorkspaceRoleView(["support"]);
  assert.equal(viewer.role, "viewer");
  assert.equal(canAccessWorkspaceCapability(viewer, "read"), true);
  assert.equal(canAccessWorkspaceCapability(viewer, "operate"), false);

  const operator = resolveWorkspaceRoleView(["member"]);
  assert.equal(operator.role, "operator");
  assert.equal(canAccessWorkspaceCapability(operator, "operate"), true);
  assert.equal(canAccessWorkspaceCapability(operator, "admin"), false);

  const admin = resolveWorkspaceRoleView(["support", "admin"]);
  assert.equal(admin.role, "admin");
  assert.equal(canAccessWorkspaceCapability(admin, "admin"), true);
});

test("capability requirement message is explicit when access is unavailable", () => {
  const viewer = resolveWorkspaceRoleView(["support"]);
  assert.match(
    describeWorkspaceCapabilityRequirement("operate", viewer, "Claim submission"),
    /Claim submission requires Operator or Admin workspace access/,
  );
  assert.equal(describeWorkspaceCapabilityRequirement("read", viewer), "");
});

test("stub session resolution reads explicit role and user env overrides", () => {
  const session = resolveStubSessionFromEnv({
    env: {
      RYVRA_SESSION_ROLES: "support,admin",
      RYVRA_SESSION_USER_ID: "ops-user-9",
    },
  });

  assert.equal(session.user?.id, "ops-user-9");
  assert.deepEqual(session.user?.roles, [Role.Support, Role.Admin]);
});

test("stub session resolution falls back to member role when env claims are invalid", () => {
  const session = resolveStubSessionFromEnv({
    env: {
      RYVRA_SESSION_ROLES: "unknown-role",
    },
    defaultUserId: "user-core-7",
  });

  assert.equal(session.user?.id, "user-core-7");
  assert.deepEqual(session.user?.roles, [Role.Member]);
});

test("role claims can be extracted from session values", () => {
  const session = {
    user: {
      id: "ops-user-2",
      roles: [Role.Member, Role.Admin],
    },
    issuedAt: "2026-08-09T00:00:00.000Z",
  };

  assert.deepEqual(roleClaimsFromSession(session), ["member", "admin"]);
});
