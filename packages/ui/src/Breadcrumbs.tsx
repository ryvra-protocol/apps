import type { BreadcrumbItem } from "./navigation";
import { useI18n } from "./I18nProvider";

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  ariaLabel?: string;
}

export function Breadcrumbs({ items, ariaLabel = "Breadcrumb" }: BreadcrumbsProps) {
  const { t } = useI18n();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="ryvra-breadcrumbs" aria-label={t("shell.breadcrumb", ariaLabel)}>
      <ol className="ryvra-breadcrumb-list">
        {items.map((item, index) => {
          const isCurrent = item.current ?? index === items.length - 1;
          const label = item.labelKey ? t(item.labelKey, item.label) : item.label;
          return (
            <li key={`${item.label}-${index}`} className="ryvra-breadcrumb-item">
              {item.href && !isCurrent ? (
                <a className="ryvra-breadcrumb-link" href={item.href}>
                  {label}
                </a>
              ) : (
                <span className="ryvra-breadcrumb-current" aria-current={isCurrent ? "page" : undefined}>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
