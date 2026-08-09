import type { ShellNavItem } from "./navigation";
import { ShellNavList } from "./ShellNavList";

export interface ContextualNavProps {
  title?: string;
  ariaLabel?: string;
  items: ShellNavItem[];
  currentPath?: string | undefined;
  collapsed?: boolean;
}

export function ContextualNav({
  title = "Module",
  ariaLabel = "Module navigation",
  items,
  currentPath,
  collapsed = false,
}: ContextualNavProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="ryvra-nav-group" aria-label={ariaLabel}>
      <p className={collapsed ? "ryvra-nav-title ryvra-visually-hidden" : "ryvra-nav-title"}>{title}</p>
      <ShellNavList items={items} currentPath={currentPath} iconOnly={collapsed} />
    </nav>
  );
}
