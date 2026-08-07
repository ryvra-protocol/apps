import type { ShellNavItem } from "./navigation";
import { isCurrentRoute } from "./route-utils";
import { ContextualNav } from "./ContextualNav";

export interface GlobalSidebarProps {
  globalNavItems: ShellNavItem[];
  localNavItems?: ShellNavItem[];
  localNavTitle?: string;
  localNavAriaLabel?: string;
  currentPath?: string | undefined;
}

export function GlobalSidebar({
  globalNavItems,
  localNavItems = [],
  localNavTitle = "Module",
  localNavAriaLabel = "Module navigation",
  currentPath,
}: GlobalSidebarProps) {
  return (
    <aside className="ryvra-sidebar" aria-label="Application navigation">
      <nav className="ryvra-nav-group" aria-label="Global navigation">
        <p className="ryvra-nav-title">Global</p>
        <ul className="ryvra-nav-list">
          {globalNavItems.map((item) => {
            const current = isCurrentRoute(item, currentPath);
            return (
              <li key={item.id}>
                <a
                  className="ryvra-nav-link"
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  aria-label={item.ariaLabel}
                  aria-disabled={item.disabled ? "true" : undefined}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                >
                  <span>{item.label}</span>
                  {item.badge ? <span className="ryvra-nav-badge">{item.badge}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <ContextualNav title={localNavTitle} ariaLabel={localNavAriaLabel} items={localNavItems} currentPath={currentPath} />
    </aside>
  );
}
