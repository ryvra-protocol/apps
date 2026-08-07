import type { ReactNode } from "react";
import type { BreadcrumbItem, ProductSwitcherItem, ShellNavItem, UserMenuItem } from "./navigation";
import { shellStyles } from "./shell-styles";
import { GlobalHeader } from "./GlobalHeader";
import { GlobalSidebar } from "./GlobalSidebar";

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
}: AppShellProps) {
  return (
    <div className="ryvra-shell-root">
      <style>{shellStyles}</style>
      <a className="ryvra-skip-link" href="#app-main-content">
        Skip to content
      </a>
      <GlobalHeader
        appName={appName}
        productSwitcherItems={productSwitcherItems}
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
        />
        <main id="app-main-content" className="ryvra-shell-main" tabIndex={-1}>
          <div className="ryvra-content-frame">{children}</div>
        </main>
      </div>
      {footer ? <footer className="ryvra-shell-footer">{footer}</footer> : null}
    </div>
  );
}
