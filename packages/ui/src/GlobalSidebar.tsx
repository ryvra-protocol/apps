import type { ShellNavItem } from "./navigation";
import { ContextualNav } from "./ContextualNav";
import { ShellNavList } from "./ShellNavList";
import { useI18n } from "./I18nProvider";

export interface GlobalSidebarProps {
  globalNavItems: ShellNavItem[];
  localNavItems?: ShellNavItem[];
  localNavTitle?: string;
  localNavAriaLabel?: string;
  currentPath?: string | undefined;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function GlobalSidebar({
  globalNavItems,
  localNavItems = [],
  localNavTitle = "Module",
  localNavAriaLabel = "Module navigation",
  currentPath,
  collapsed = true,
  onToggleCollapsed,
}: GlobalSidebarProps) {
  const { direction, t } = useI18n();
  const toggleLabel = collapsed
    ? t("shell.expandSidebarNavigation", "Expand sidebar navigation")
    : t("shell.collapseSidebarNavigation", "Collapse sidebar navigation");
  const collapsedPath = direction === "rtl" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
  const expandedPath = direction === "rtl" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6";
  const resolvedLocalNavTitle = localNavTitle === "Module" ? t("shell.module", localNavTitle) : localNavTitle;
  const resolvedLocalNavAriaLabel =
    localNavAriaLabel === "Module navigation" ? t("shell.moduleNavigation", localNavAriaLabel) : localNavAriaLabel;

  return (
    <aside
      className={collapsed ? "ryvra-sidebar ryvra-sidebar--collapsed" : "ryvra-sidebar"}
      aria-label={t("shell.applicationNavigation", "Application navigation")}
      data-sidebar-collapsed={collapsed ? "true" : "false"}
    >
      <button
        type="button"
        className="ryvra-sidebar-toggle"
        aria-controls="ryvra-sidebar-sections"
        aria-expanded={!collapsed}
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={onToggleCollapsed}
      >
        <span className="ryvra-sidebar-toggle-glyph" aria-hidden="true">
          <svg
            className="ryvra-sidebar-toggle-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            {collapsed ? <path d={collapsedPath} /> : <path d={expandedPath} />}
          </svg>
        </span>
      </button>
      <div id="ryvra-sidebar-sections" className="ryvra-sidebar-sections">
        <nav className="ryvra-nav-group" aria-label={t("shell.globalNavigation", "Global navigation")}>
          <p className={collapsed ? "ryvra-nav-title ryvra-visually-hidden" : "ryvra-nav-title"}>
            {t("shell.globalSection", "Global")}
          </p>
          <ShellNavList items={globalNavItems} currentPath={currentPath} iconOnly={collapsed} />
        </nav>
        <ContextualNav
          title={resolvedLocalNavTitle}
          ariaLabel={resolvedLocalNavAriaLabel}
          items={localNavItems}
          currentPath={currentPath}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
