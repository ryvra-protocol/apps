import type { ShellNavItem } from "./navigation";
import { isCurrentRoute } from "./route-utils";
import { NavItemIcon } from "./NavItemIcon";

export interface ContextualNavProps {
  title?: string;
  ariaLabel?: string;
  items: ShellNavItem[];
  currentPath?: string | undefined;
}

export function ContextualNav({
  title = "Module",
  ariaLabel = "Module navigation",
  items,
  currentPath,
}: ContextualNavProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="ryvra-nav-group" aria-label={ariaLabel}>
      <p className="ryvra-nav-title">{title}</p>
      <ul className="ryvra-nav-list">
        {items.map((item) => {
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
                <span className="ryvra-nav-link-content">
                  <NavItemIcon itemId={item.id} />
                  <span className="ryvra-nav-link-label">{item.label}</span>
                </span>
                {item.badge ? <span className="ryvra-nav-badge">{item.badge}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
