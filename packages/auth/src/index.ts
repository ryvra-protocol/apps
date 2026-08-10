export { Role } from "./types";
export type { SessionUser, Session, AuthDecision } from "./types";
export type { AuthGuard } from "./guard";
export { createStubAuthGuard } from "./guard";
export {
  workspaceViewRoles,
  workspaceCapabilities,
  roleClaimsFromSession,
  resolveWorkspaceRoleView,
  canAccessWorkspaceCapability,
  describeWorkspaceCapabilityRequirement,
  resolveStubSessionFromEnv,
} from "./workspace-access";
export type {
  WorkspaceViewRole,
  WorkspaceCapability,
  WorkspaceRoleView,
  ResolveStubSessionOptions,
} from "./workspace-access";
