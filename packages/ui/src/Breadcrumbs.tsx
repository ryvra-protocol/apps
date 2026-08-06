import type { BreadcrumbItem } from "./navigation";

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  ariaLabel?: string;
}

export function Breadcrumbs({ items, ariaLabel = "Breadcrumb" }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="ryvra-breadcrumbs" aria-label={ariaLabel}>
      <ol className="ryvra-breadcrumb-list">
        {items.map((item, index) => {
          const isCurrent = item.current ?? index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="ryvra-breadcrumb-item">
              {item.href && !isCurrent ? (
                <a className="ryvra-breadcrumb-link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span className="ryvra-breadcrumb-current" aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
