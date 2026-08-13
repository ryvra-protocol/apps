import type { ProductSwitcherItem } from "./navigation";
import { useI18n } from "./I18nProvider";

export interface ProductSwitcherProps {
  items: ProductSwitcherItem[];
  ariaLabel?: string;
}

export function ProductSwitcher({ items, ariaLabel = "Product switcher" }: ProductSwitcherProps) {
  const { t } = useI18n();

  return (
    <nav aria-label={t("shell.productSwitcher", ariaLabel)}>
      <ul className="ryvra-product-list" style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
        {items.map((item) => {
          const label = item.labelKey ? t(item.labelKey, item.label) : item.label;
          return (
            <li key={item.productId}>
              <a
                className="ryvra-product-link"
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                aria-disabled={item.disabled ? "true" : undefined}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
