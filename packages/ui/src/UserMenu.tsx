import type { UserMenuItem } from "./navigation";
import { useI18n } from "./I18nProvider";

export interface UserMenuProps {
  items: UserMenuItem[];
  ariaLabel?: string;
  label?: string;
}

export function UserMenu({ items, ariaLabel = "User menu", label = "Account" }: UserMenuProps) {
  const { t } = useI18n();

  return (
    <details className="ryvra-menu">
      <summary className="ryvra-summary-trigger">{t("shell.account", label)}</summary>
      <nav className="ryvra-menu-panel" aria-label={t("shell.userMenu", ariaLabel)}>
        <ul className="ryvra-menu-list">
          {items.length > 0 ? (
            items.map((item) => {
              const itemLabel = item.labelKey ? t(item.labelKey, item.label) : item.label;
              return (
                <li key={item.id}>
                  <a className="ryvra-menu-link" href={item.href} aria-disabled={item.disabled ? "true" : undefined}>
                    {itemLabel}
                  </a>
                </li>
              );
            })
          ) : (
            <li>
              <span className="ryvra-menu-link" aria-disabled="true">
                {t("shell.noAccountActions", "No account actions")}
              </span>
            </li>
          )}
        </ul>
      </nav>
    </details>
  );
}
