"use client";

import { getGlobalNavItems, getProductNav, type ProductId, type ResolvedRouteDefinition } from "@ryvra/config";
import {
  AppShell,
  type BreadcrumbItem,
  type ProductSwitcherItem,
  type ShellNavItem,
  type UserMenuItem,
} from "@ryvra/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const productId: ProductId = "points";

const breadcrumbLabelMap: Record<string, string> = {
  "/": "Points Overview",
  "/overview": "Overview",
  "/activity": "Activity",
  "/tasks": "Tasks",
  "/status": "Status",
};

const userMenuItems: UserMenuItem[] = [
  { id: "profile", label: "Profile", href: "/overview" },
  { id: "settings", label: "Workspace Settings", href: "/status" },
];

function normalizePath(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function toShellNavItem(route: ResolvedRouteDefinition): ShellNavItem {
  return {
    id: route.id,
    label: route.label,
    href: route.href,
    ariaLabel: route.label,
  };
}

function toProductSwitcherItems(globalNavItems: ResolvedRouteDefinition[]): ProductSwitcherItem[] {
  const switchableProductIds = new Set(["pay", "markets", "points"]);

  return globalNavItems
    .filter((item) => switchableProductIds.has(item.id))
    .map((item) => ({
      productId: item.product,
      label: item.label,
      href: item.href,
      current: item.product === productId,
    }));
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const normalizedPath = normalizePath(pathname);
  const currentLabel = breadcrumbLabelMap[normalizedPath] ?? "Page";

  if (normalizedPath === "/") {
    return [{ label: currentLabel, current: true }];
  }

  return [
    { label: "Points Overview", href: "/" },
    { label: currentLabel, current: true },
  ];
}

export function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const normalizedPathname = normalizePath(pathname);
  const globalNav = getGlobalNavItems({ currentProduct: productId });
  const localNav = getProductNav(productId);

  return (
    <AppShell
      appName="Ryvra Points & Tasks"
      globalNavItems={globalNav.map(toShellNavItem)}
      localNavItems={localNav.map(toShellNavItem)}
      localNavTitle="Points & Tasks"
      localNavAriaLabel="Points and tasks module navigation"
      productSwitcherItems={toProductSwitcherItems(globalNav)}
      breadcrumbs={buildBreadcrumbs(normalizedPathname)}
      currentPath={normalizedPathname}
      userMenuItems={userMenuItems}
      commandTriggerLabel="Quick Actions"
      footer="Ryvra unified shell foundation"
    >
      {children}
    </AppShell>
  );
}
