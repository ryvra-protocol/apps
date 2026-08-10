"use client";

import {
  canAccessWorkspaceCapability,
  describeWorkspaceCapabilityRequirement,
  resolveWorkspaceRoleView,
} from "@ryvra/auth";
import {
  evaluateRoutePermission,
  getGlobalNavItems,
  getProductNav,
  type ProductId,
  type ResolvedRouteDefinition,
} from "@ryvra/config";
import {
  AppShell,
  WorkspaceScopeSwitcher,
  appendScopeToHref,
  applyScopeToQuery,
  buildScopePersistenceStorageKey,
  buildWorkspaceScopeOptions,
  parseStoredScope,
  resolveWorkspaceScope,
  type BreadcrumbItem,
  type ProductSwitcherItem,
  type ShellNavItem,
  type UserMenuItem,
  type WorkspaceScopeSelection,
} from "@ryvra/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const productId: ProductId = "points";
const scopePreserveKeys = ["ref", "entity", "id", "ctx", "window"] as const;

const breadcrumbLabelMap: Record<string, string> = {
  "/": "Dashboard",
  "/overview": "Overview",
  "/points": "Points",
  "/tasks": "Tasks",
  "/status": "Status",
};

interface ShellFrameProps {
  children: ReactNode;
  roleClaims: string[];
  defaultAccountId: string;
  defaultWorkspaceId: string;
  sessionUserId: string;
}

function normalizePath(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function sameScope(left: WorkspaceScopeSelection, right: WorkspaceScopeSelection): boolean {
  return (
    left.accountId === right.accountId &&
    (left.workspaceId ?? "") === (right.workspaceId ?? "") &&
    (left.userId ?? "") === (right.userId ?? "")
  );
}

function toShellNavItem(route: ResolvedRouteDefinition, scope: WorkspaceScopeSelection, roleClaims: readonly string[]): ShellNavItem {
  const permission = evaluateRoutePermission(route.permission, roleClaims);
  const restrictedLabel = permission.allowed ? route.label : `${route.label} (${permission.reason ?? "Permission required."})`;

  return {
    id: route.id,
    label: restrictedLabel,
    href: appendScopeToHref(route.href, scope, { includeUserScope: true }),
    ariaLabel: restrictedLabel,
    ...(permission.allowed ? {} : { disabled: true, badge: "Restricted" }),
  };
}

function toProductSwitcherItems(
  globalNavItems: ResolvedRouteDefinition[],
  scope: WorkspaceScopeSelection,
  roleClaims: readonly string[],
): ProductSwitcherItem[] {
  const switchableProductIds = new Set(["pay", "markets", "points"]);

  return globalNavItems
    .filter((item) => switchableProductIds.has(item.id))
    .map((item) => {
      const permission = evaluateRoutePermission(item.permission, roleClaims);
      const restrictedLabel = permission.allowed ? item.label : `${item.label} (${permission.reason ?? "Permission required."})`;

      return {
        productId: item.product,
        label: restrictedLabel,
        href: appendScopeToHref(item.href, scope, { includeUserScope: true }),
        current: item.product === productId,
        ...(permission.allowed ? {} : { disabled: true }),
      };
    });
}

function buildBreadcrumbs(pathname: string, scope: WorkspaceScopeSelection): BreadcrumbItem[] {
  const normalizedPath = normalizePath(pathname);
  const currentLabel = breadcrumbLabelMap[normalizedPath] ?? "Page";
  const homeHref = appendScopeToHref("/", scope, { includeUserScope: true });

  if (normalizedPath === "/") {
    return [{ label: currentLabel, current: true }];
  }

  return [
    { label: "Dashboard", href: homeHref },
    { label: currentLabel, current: true },
  ];
}

function buildUserMenuItems(canManageWorkspace: boolean): UserMenuItem[] {
  const settingsDisabledReason = "Admin role required";

  return [
    { id: "profile", label: "Profile", href: "/overview" },
    {
      id: "settings",
      label: canManageWorkspace ? "Workspace Settings" : `Workspace Settings (${settingsDisabledReason})`,
      href: "/status",
      disabled: !canManageWorkspace,
    },
  ];
}

export function ShellFrame({ children, roleClaims, defaultAccountId, defaultWorkspaceId, sessionUserId }: ShellFrameProps) {
  const pathname = usePathname() ?? "/";
  const normalizedPathname = normalizePath(pathname);
  const router = useRouter();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const storageKey = buildScopePersistenceStorageKey(productId);
  const roleView = useMemo(() => resolveWorkspaceRoleView(roleClaims), [roleClaims]);
  const [persistenceNotices, setPersistenceNotices] = useState<string[]>([]);
  const restoredScopeRef = useRef(false);

  const accountOptions = useMemo(
    () => buildWorkspaceScopeOptions([defaultAccountId, "acct-core-1", "acct-core-2"]),
    [defaultAccountId],
  );
  const workspaceOptions = useMemo(
    () => buildWorkspaceScopeOptions([defaultWorkspaceId, "workspace-core-1", "workspace-core-2"]),
    [defaultWorkspaceId],
  );
  const userOptions = useMemo(
    () => buildWorkspaceScopeOptions([sessionUserId, "user-core-1", "user-core-2"]),
    [sessionUserId],
  );

  const scopeResolution = useMemo(
    () =>
      resolveWorkspaceScope({
        searchParams: new URLSearchParams(serializedSearchParams),
        defaults: {
          accountId: defaultAccountId,
          workspaceId: defaultWorkspaceId,
          userId: sessionUserId,
        },
        accountOptions,
        workspaceOptions,
        userOptions,
        includeUserScope: true,
      }),
    [
      accountOptions,
      defaultAccountId,
      defaultWorkspaceId,
      serializedSearchParams,
      sessionUserId,
      userOptions,
      workspaceOptions,
    ],
  );

  const canonicalSearch = scopeResolution.canonicalSearchParams.toString();

  useEffect(() => {
    if (!scopeResolution.needsCanonicalization) {
      return;
    }

    router.replace(canonicalSearch ? `${normalizedPathname}?${canonicalSearch}` : normalizedPathname, {
      scroll: false,
    });
  }, [canonicalSearch, normalizedPathname, router, scopeResolution.needsCanonicalization]);

  useEffect(() => {
    if (typeof window === "undefined" || restoredScopeRef.current) {
      return;
    }

    restoredScopeRef.current = true;
    const storedRawScope = window.localStorage.getItem(storageKey);
    if (!storedRawScope) {
      return;
    }

    const storedScope = parseStoredScope(storedRawScope);
    if (!storedScope) {
      setPersistenceNotices(["Saved scope preference was invalid and has been ignored."]);
      return;
    }

    const storedParams = applyScopeToQuery({
      searchParams: new URLSearchParams(),
      scope: {
        accountId: storedScope.accountId,
        workspaceId: storedScope.workspaceId ?? defaultWorkspaceId,
        userId: storedScope.userId ?? sessionUserId,
      },
      preserveKeys: [],
      includeUserScope: true,
    });

    const resolvedStoredScope = resolveWorkspaceScope({
      searchParams: storedParams,
      defaults: {
        accountId: defaultAccountId,
        workspaceId: defaultWorkspaceId,
        userId: sessionUserId,
      },
      accountOptions,
      workspaceOptions,
      userOptions,
      includeUserScope: true,
    });

    if (!sameScope(scopeResolution.scope, resolvedStoredScope.scope)) {
      const nextParams = applyScopeToQuery({
        searchParams: new URLSearchParams(serializedSearchParams),
        scope: resolvedStoredScope.scope,
        preserveKeys: scopePreserveKeys,
        includeUserScope: true,
      });
      const serialized = nextParams.toString();
      router.replace(serialized ? `${normalizedPathname}?${serialized}` : normalizedPathname, {
        scroll: false,
      });
    }

    if (resolvedStoredScope.notices.length > 0) {
      setPersistenceNotices(resolvedStoredScope.notices);
    }
  }, [
    accountOptions,
    defaultAccountId,
    defaultWorkspaceId,
    normalizedPathname,
    router,
    scopeResolution.scope,
    serializedSearchParams,
    sessionUserId,
    storageKey,
    userOptions,
    workspaceOptions,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(scopeResolution.scope));
  }, [scopeResolution.scope, storageKey]);

  const handleScopeChange = useCallback(
    (nextScope: WorkspaceScopeSelection) => {
      const candidateParams = applyScopeToQuery({
        searchParams: new URLSearchParams(),
        scope: nextScope,
        preserveKeys: [],
        includeUserScope: true,
      });

      const validatedScope = resolveWorkspaceScope({
        searchParams: candidateParams,
        defaults: {
          accountId: defaultAccountId,
          workspaceId: defaultWorkspaceId,
          userId: sessionUserId,
        },
        accountOptions,
        workspaceOptions,
        userOptions,
        includeUserScope: true,
      });

      setPersistenceNotices(validatedScope.notices);

      const nextParams = applyScopeToQuery({
        searchParams: new URLSearchParams(serializedSearchParams),
        scope: validatedScope.scope,
        preserveKeys: scopePreserveKeys,
        includeUserScope: true,
      });
      const serialized = nextParams.toString();

      router.replace(serialized ? `${normalizedPathname}?${serialized}` : normalizedPathname, {
        scroll: false,
      });
    },
    [
      accountOptions,
      defaultAccountId,
      defaultWorkspaceId,
      normalizedPathname,
      router,
      serializedSearchParams,
      sessionUserId,
      userOptions,
      workspaceOptions,
    ],
  );

  const globalNav = useMemo(() => getGlobalNavItems({ currentProduct: productId }), []);
  const localNav = useMemo(() => getProductNav(productId), []);

  const globalNavItems = useMemo(
    () => globalNav.map((route) => toShellNavItem(route, scopeResolution.scope, roleClaims)),
    [globalNav, roleClaims, scopeResolution.scope],
  );
  const localNavItems = useMemo(
    () => localNav.map((route) => toShellNavItem(route, scopeResolution.scope, roleClaims)),
    [localNav, roleClaims, scopeResolution.scope],
  );
  const productSwitcherItems = useMemo(
    () => toProductSwitcherItems(globalNav, scopeResolution.scope, roleClaims),
    [globalNav, roleClaims, scopeResolution.scope],
  );

  const canManageWorkspace = canAccessWorkspaceCapability(roleView, "admin");
  const scopeNotices = useMemo(
    () => [...new Set([...scopeResolution.notices, ...persistenceNotices])],
    [persistenceNotices, scopeResolution.notices],
  );
  const notificationScopeKey = `${productId}:${scopeResolution.scope.accountId}:${scopeResolution.scope.workspaceId ?? "workspace-none"}:${scopeResolution.scope.userId ?? "user-none"}`;

  return (
    <AppShell
      appName="Ryvra Points & Tasks"
      globalNavItems={globalNavItems}
      localNavItems={localNavItems}
      localNavTitle="Points & Tasks"
      localNavAriaLabel="Points and tasks module navigation"
      productSwitcherItems={productSwitcherItems}
      breadcrumbs={buildBreadcrumbs(normalizedPathname, scopeResolution.scope)}
      currentPath={normalizedPathname}
      userMenuItems={buildUserMenuItems(canManageWorkspace).map((item) => ({
        ...item,
        href: appendScopeToHref(item.href, scopeResolution.scope, { includeUserScope: true }),
      }))}
      commandTriggerLabel="Quick Actions"
      notificationScopeKey={notificationScopeKey}
      scopeSwitcher={
        <WorkspaceScopeSwitcher
          scope={scopeResolution.scope}
          accountOptions={accountOptions}
          workspaceOptions={workspaceOptions}
          userOptions={userOptions}
          includeUserScope
          roleLabel={roleView.label}
          roleAriaLabel={`Current workspace role ${roleView.label}`}
          notices={scopeNotices}
          onScopeChange={handleScopeChange}
        />
      }
      footer={
        canManageWorkspace
          ? "Ryvra unified shell foundation"
          : describeWorkspaceCapabilityRequirement("admin", roleView, "Workspace settings")
      }
    >
      {children}
    </AppShell>
  );
}
