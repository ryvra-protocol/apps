import type { ProductSwitcherItem, ShellNavItem } from "./navigation";
import { ShellNavList } from "./ShellNavList";
import { useI18n } from "./I18nProvider";

export interface BottomIconDockProps {
  items: ProductSwitcherItem[];
  ariaLabel?: string;
}

function toDockNavItem(item: ProductSwitcherItem): ShellNavItem {
  const navItem: ShellNavItem = {
    id: item.productId,
    label: item.label,
    ...(item.labelKey ? { labelKey: item.labelKey } : {}),
    href: item.href,
    ariaLabel: item.label,
    ...(item.labelKey ? { ariaLabelKey: item.labelKey } : {}),
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
  const { t } = useI18n();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="ryvra-bottom-dock" aria-label={t("shell.productNavigationDock", ariaLabel)}>
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
