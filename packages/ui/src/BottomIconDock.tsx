import type { ProductSwitcherItem, ShellNavItem } from "./navigation";
import { ShellNavList } from "./ShellNavList";

export interface BottomIconDockProps {
  items: ProductSwitcherItem[];
  ariaLabel?: string;
}

function toDockNavItem(item: ProductSwitcherItem): ShellNavItem {
  const navItem: ShellNavItem = {
    id: item.productId,
    label: item.label,
    href: item.href,
    ariaLabel: item.label,
  };

  if (typeof item.current === "boolean") {
    navItem.current = item.current;
  }

  if (typeof item.disabled === "boolean") {
    navItem.disabled = item.disabled;
  }

  return navItem;
}

export function BottomIconDock({ items, ariaLabel = "Product navigation dock" }: BottomIconDockProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="ryvra-bottom-dock" aria-label={ariaLabel}>
      <ShellNavList
        items={items.map(toDockNavItem)}
        iconOnly
        tooltipPlacement="top"
        listClassName="ryvra-bottom-dock-list"
        linkClassName="ryvra-bottom-dock-link"
      />
    </nav>
  );
}
