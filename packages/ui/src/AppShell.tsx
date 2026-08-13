"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { BreadcrumbItem, ProductSwitcherItem, ShellNavItem, UserMenuItem } from "./navigation";
import { shellStyles } from "./shell-styles";
import { GlobalHeader } from "./GlobalHeader";
import { GlobalSidebar } from "./GlobalSidebar";
import { BottomIconDock } from "./BottomIconDock";
import { NotificationCenterProvider } from "./NotificationCenterProvider";
import { I18nProvider, useI18n } from "./I18nProvider";
import {
  readSidebarCollapsedPreference,
  toggleSidebarCollapsed,
  writeSidebarCollapsedPreference,
} from "./sidebar-preferences";
import type { LocaleResources, SupportedLocale } from "./i18n-runtime";

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
  notificationScopeKey?: string;
  scopeSwitcher?: ReactNode;
  i18nResources?: LocaleResources;
  initialLocale?: SupportedLocale;
  initialTimeZonePreference?: string;
  hydrateI18nFromStorage?: boolean;
}

interface AppShellLayoutProps {
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
  notificationScopeKey?: string;
  scopeSwitcher?: ReactNode;
}

function AppShellLayout({
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
  notificationScopeKey,
  scopeSwitcher,
}: AppShellLayoutProps) {
  const { direction, t } = useI18n();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const resolvedNotificationScopeKey = notificationScopeKey && notificationScopeKey.trim().length > 0
    ? notificationScopeKey
    : appName.toLowerCase().replace(/\s+/g, "-");
  const resolvedLocalNavTitle = localNavTitle === "Module" ? t("shell.module", localNavTitle) : localNavTitle;
  const resolvedLocalNavAriaLabel =
    localNavAriaLabel === "Module navigation"
      ? t("shell.moduleNavigation", localNavAriaLabel)
      : localNavAriaLabel;
  const resolvedCommandTriggerLabel = commandTriggerLabel === "Command Palette"
    ? t("shell.commandPalette", commandTriggerLabel)
    : commandTriggerLabel === "Quick Actions"
      ? t("shell.quickActions", commandTriggerLabel)
      : commandTriggerLabel;
  const resolvedFooter = typeof footer === "string" && footer === "Ryvra unified shell foundation"
    ? t("shell.footerFoundation", footer)
    : footer;

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
    <div className="ryvra-shell-root" dir={direction}>
      <style>{shellStyles}</style>
      <a className="ryvra-skip-link" href="#app-main-content">
        {t("shell.skipToContent", "Skip to content")}
      </a>
      <NotificationCenterProvider scopeKey={resolvedNotificationScopeKey}>
        <GlobalHeader
          appName={appName}
          breadcrumbs={breadcrumbs}
          userMenuItems={userMenuItems}
          commandTriggerLabel={resolvedCommandTriggerLabel}
          scopeSwitcher={scopeSwitcher}
        />
        <div className="ryvra-shell-layout">
          <GlobalSidebar
            globalNavItems={globalNavItems}
            localNavItems={localNavItems}
            localNavTitle={resolvedLocalNavTitle}
            localNavAriaLabel={resolvedLocalNavAriaLabel}
            currentPath={currentPath}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={handleSidebarToggle}
          />
          <main id="app-main-content" className="ryvra-shell-main" tabIndex={-1}>
            <div className="ryvra-content-frame">{children}</div>
          </main>
        </div>
        <BottomIconDock items={productSwitcherItems} />
        {resolvedFooter ? <footer className="ryvra-shell-footer">{resolvedFooter}</footer> : null}
      </NotificationCenterProvider>
    </div>
  );
}

export function AppShell({
  i18nResources,
  initialLocale,
  initialTimeZonePreference,
  hydrateI18nFromStorage = true,
  ...props
}: AppShellProps) {
  return (
    <I18nProvider
      hydrateFromStorage={hydrateI18nFromStorage}
      {...(i18nResources ? { resources: i18nResources } : {})}
      {...(initialLocale ? { initialLocale } : {})}
      {...(initialTimeZonePreference ? { initialTimeZonePreference } : {})}
    >
      <AppShellLayout {...props} />
    </I18nProvider>
  );
}
