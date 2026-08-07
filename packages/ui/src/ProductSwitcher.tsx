import type { ProductSwitcherItem } from "./navigation";

export interface ProductSwitcherProps {
  items: ProductSwitcherItem[];
  ariaLabel?: string;
}

export function ProductSwitcher({ items, ariaLabel = "Product switcher" }: ProductSwitcherProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ul className="ryvra-product-list" style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
        {items.map((item) => (
          <li key={item.productId}>
            <a
              className="ryvra-product-link"
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              aria-disabled={item.disabled ? "true" : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
