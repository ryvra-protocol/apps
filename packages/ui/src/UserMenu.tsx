import type { UserMenuItem } from "./navigation";

export interface UserMenuProps {
  items: UserMenuItem[];
  ariaLabel?: string;
  label?: string;
}

export function UserMenu({ items, ariaLabel = "User menu", label = "Account" }: UserMenuProps) {
  return (
    <details className="ryvra-menu">
      <summary className="ryvra-summary-trigger">{label}</summary>
      <nav className="ryvra-menu-panel" aria-label={ariaLabel}>
        <ul className="ryvra-menu-list">
          {items.length > 0 ? (
            items.map((item) => (
              <li key={item.id}>
                <a className="ryvra-menu-link" href={item.href} aria-disabled={item.disabled ? "true" : undefined}>
                  {item.label}
                </a>
              </li>
            ))
          ) : (
            <li>
              <span className="ryvra-menu-link" aria-disabled="true">
                No account actions
              </span>
            </li>
          )}
        </ul>
      </nav>
    </details>
  );
}
