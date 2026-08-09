"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { BreadcrumbItem, ProductSwitcherItem, ShellNavItem, UserMenuItem } from "./navigation";
import { shellStyles } from "./shell-styles";
import { GlobalHeader } from "./GlobalHeader";
import { GlobalSidebar } from "./GlobalSidebar";
import { BottomIconDock } from "./BottomIconDock";
import { NotificationCenterProvider, type NotificationDeliveryMode } from "./NotificationCenter";
import {
  readSidebarCollapsedPreference,
  toggleSidebarCollapsed,
  writeSidebarCollapsedPreference,
} from "./sidebar-preferences";

export interface AppShellProps {
  appName: string;
  globalNavItems: ShellNavItem[];
  localNavItems?: ShellNavItem[];
  localNavTitle?: string;
  localNavAriaLabel?: string;
  productSwitcherItems: ProductSwitcherItem[];
  breadcrumbs: BreadcrumbItem[];
  currentPath?: string;
  children: ReactNode;
  footer?: ReactNode;
  userMenuItems?: UserMenuItem[];
  commandTriggerLabel?: string;
  notificationAppId?: string;
  notificationScopeKey?: string;
  notificationFeedMode?: NotificationDeliveryMode;
  notificationPreferenceMode?: NotificationDeliveryMode;
}

export function AppShell({
  appName,
  globalNavItems,
  localNavItems = [],
  localNavTitle = "Module",
  localNavAriaLabel = "Module navigation",
  productSwitcherItems,
  breadcrumbs,
  currentPath,
  children,
  footer,
  userMenuItems = [],
  commandTriggerLabel = "Command Palette",
  notificationAppId = "shared-shell",
  notificationScopeKey = "workspace-default",
  notificationFeedMode = "local-preview",
  notificationPreferenceMode = "local-preview",
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    const preference = readSidebarCollapsedPreference(typeof window !== "undefined" ? window.localStorage : null);
    if (preference !== null) {
      setSidebarCollapsed(preference);
    }
  }, []);

  function handleSidebarToggle() {
    setSidebarCollapsed((current) => {
      const next = toggleSidebarCollapsed(current);
      writeSidebarCollapsedPreference(typeof window !== "undefined" ? window.localStorage : null, next);
      return next;
    });
  }

  return (
    <div className="ryvra-shell-root">
      <style>{shellStyles}</style>
      <NotificationCenterProvider
        appId={notificationAppId}
        scopeKey={notificationScopeKey}
        feedMode={notificationFeedMode}
        preferenceMode={notificationPreferenceMode}
      >
        <a className="ryvra-skip-link" href="#app-main-content">
          Skip to content
        </a>
        <GlobalHeader
          appName={appName}
          breadcrumbs={breadcrumbs}
          userMenuItems={userMenuItems}
          commandTriggerLabel={commandTriggerLabel}
        />
        <div className="ryvra-shell-layout">
          <GlobalSidebar
            globalNavItems={globalNavItems}
            localNavItems={localNavItems}
            localNavTitle={localNavTitle}
            localNavAriaLabel={localNavAriaLabel}
            currentPath={currentPath}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={handleSidebarToggle}
          />
          <main id="app-main-content" className="ryvra-shell-main" tabIndex={-1}>
            <div className="ryvra-content-frame">{children}</div>
          </main>
        </div>
        <BottomIconDock items={productSwitcherItems} />
        {footer ? <footer className="ryvra-shell-footer">{footer}</footer> : null}
      </NotificationCenterProvider>
    </div>
  );
}
