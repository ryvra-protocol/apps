import type { ShellNavItem } from "./navigation";
import { ContextualNav } from "./ContextualNav";
import { ShellNavList } from "./ShellNavList";

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
  const toggleLabel = collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation";

  return (
    <aside
      className={collapsed ? "ryvra-sidebar ryvra-sidebar--collapsed" : "ryvra-sidebar"}
      aria-label="Application navigation"
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
            {collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
          </svg>
        </span>
      </button>
      <div id="ryvra-sidebar-sections" className="ryvra-sidebar-sections">
        <nav className="ryvra-nav-group" aria-label="Global navigation">
          <p className={collapsed ? "ryvra-nav-title ryvra-visually-hidden" : "ryvra-nav-title"}>Global</p>
          <ShellNavList items={globalNavItems} currentPath={currentPath} iconOnly={collapsed} />
        </nav>
        <ContextualNav
          title={localNavTitle}
          ariaLabel={localNavAriaLabel}
          items={localNavItems}
          currentPath={currentPath}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
