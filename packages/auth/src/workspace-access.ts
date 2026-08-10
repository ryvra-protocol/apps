import { Role, type Session } from "./types";

export const workspaceViewRoles = ["viewer", "operator", "admin"] as const;
export type WorkspaceViewRole = (typeof workspaceViewRoles)[number];

export const workspaceCapabilities = ["read", "operate", "admin"] as const;
export type WorkspaceCapability = (typeof workspaceCapabilities)[number];

export interface WorkspaceRoleView {
  role: WorkspaceViewRole;
  label: "Viewer" | "Operator" | "Admin";
  roleClaims: string[];
  capabilities: Record<WorkspaceCapability, boolean>;
}

export interface ResolveStubSessionOptions {
  env?: NodeJS.ProcessEnv;
  defaultUserId?: string;
  defaultRoles?: readonly Role[];
  roleEnvKeys?: readonly string[];
  userEnvKeys?: readonly string[];
}

const roleRank: Record<WorkspaceViewRole, number> = {
  viewer: 0,
  operator: 1,
  admin: 2,
};

const roleLabel: Record<WorkspaceViewRole, WorkspaceRoleView["label"]> = {
  viewer: "Viewer",
  operator: "Operator",
  admin: "Admin",
};

const capabilityMap: Record<WorkspaceViewRole, Record<WorkspaceCapability, boolean>> = {
  viewer: {
    read: true,
    operate: false,
    admin: false,
  },
  operator: {
    read: true,
    operate: true,
    admin: false,
  },
  admin: {
    read: true,
    operate: true,
    admin: true,
  },
};

const claimRoleMap: Record<string, WorkspaceViewRole> = {
  admin: "admin",
  member: "operator",
  operator: "operator",
  support: "viewer",
  viewer: "viewer",
};

const claimToSessionRole: Record<string, Role> = {
  admin: Role.Admin,
  member: Role.Member,
  support: Role.Support,
};

function normalizeClaim(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function parseDelimitedClaims(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => normalizeClaim(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function firstNonEmptyEnvValue(env: NodeJS.ProcessEnv, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const normalized = env[key]?.trim();
    if (normalized && normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
}

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function roleClaimsFromSession(session: Session | null): string[] {
  if (!session?.user?.roles || session.user.roles.length === 0) {
    return [];
  }

  return dedupe(
    session.user.roles
      .map((role) => normalizeClaim(role))
      .filter((role): role is string => Boolean(role)),
  );
}

export function resolveWorkspaceRoleView(roleClaims: readonly string[] = []): WorkspaceRoleView {
  let selectedRole: WorkspaceViewRole = "viewer";
  const normalizedClaims = dedupe(
    roleClaims
      .map((claim) => normalizeClaim(claim))
      .filter((claim): claim is string => Boolean(claim)),
  );

  for (const claim of normalizedClaims) {
    const mappedRole = claimRoleMap[claim];
    if (!mappedRole) {
      continue;
    }

    if (roleRank[mappedRole] > roleRank[selectedRole]) {
      selectedRole = mappedRole;
    }
  }

  return {
    role: selectedRole,
    label: roleLabel[selectedRole],
    roleClaims: normalizedClaims,
    capabilities: capabilityMap[selectedRole],
  };
}

export function canAccessWorkspaceCapability(roleView: WorkspaceRoleView, capability: WorkspaceCapability): boolean {
  return roleView.capabilities[capability];
}

export function describeWorkspaceCapabilityRequirement(
  capability: WorkspaceCapability,
  roleView: WorkspaceRoleView,
  actionLabel = "This action",
): string {
  if (canAccessWorkspaceCapability(roleView, capability)) {
    return "";
  }

  if (capability === "admin") {
    return `${actionLabel} requires Admin workspace access.`;
  }

  if (capability === "operate") {
    return `${actionLabel} requires Operator or Admin workspace access.`;
  }

  return `${actionLabel} requires at least Viewer workspace access.`;
}

export function resolveStubSessionFromEnv(options: ResolveStubSessionOptions = {}): Session {
  const env = options.env ?? process.env;
  const roleEnvKeys = options.roleEnvKeys ?? ["RYVRA_SESSION_ROLES", "RYVRA_SESSION_ROLE"];
  const userEnvKeys = options.userEnvKeys ?? ["RYVRA_SESSION_USER_ID"];
  const defaultRoles = options.defaultRoles ?? [Role.Member];
  const defaultUserId = options.defaultUserId ?? "user-core-1";

  const roleClaimValue = firstNonEmptyEnvValue(env, roleEnvKeys);
  const roleClaims = parseDelimitedClaims(roleClaimValue);
  const resolvedRoles = roleClaims
    .map((claim) => claimToSessionRole[claim])
    .filter((role): role is Role => Boolean(role));
  const roles = resolvedRoles.length > 0 ? (dedupe(resolvedRoles) as Role[]) : [...defaultRoles];

  const userId = firstNonEmptyEnvValue(env, userEnvKeys) ?? defaultUserId;

  return {
    user: {
      id: userId,
      roles,
    },
    issuedAt: new Date().toISOString(),
  };
}
