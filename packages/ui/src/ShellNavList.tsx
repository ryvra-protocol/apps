import { NavItemIcon } from "./NavItemIcon";
import type { ShellNavItem } from "./navigation";
import { isCurrentRoute } from "./route-utils";
import { useI18n } from "./I18nProvider";

export interface ShellNavListProps {
  items: ShellNavItem[];
  currentPath?: string | undefined;
  iconOnly?: boolean;
  linkClassName?: string;
  listClassName?: string;
  tooltipPlacement?: "right" | "top";
}

function classNameFor(parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function ShellNavList({
  items,
  currentPath,
  iconOnly = false,
  linkClassName,
  listClassName,
  tooltipPlacement = "right",
}: ShellNavListProps) {
  const { t } = useI18n();

  return (
    <ul className={classNameFor(["ryvra-nav-list", listClassName])}>
      {items.map((item) => {
        const current = isCurrentRoute(item, currentPath);
        const translatedLabel = item.labelKey ? t(item.labelKey, item.label) : item.label;
        const ariaLabel =
          item.ariaLabelKey ? t(item.ariaLabelKey, item.ariaLabel ?? translatedLabel) : item.ariaLabel ?? translatedLabel;
        const translatedBadge = item.badgeKey ? t(item.badgeKey, item.badge ?? item.badgeKey) : item.badge;
        return (
          <li key={item.id}>
            <a
              className={classNameFor([
                "ryvra-nav-link",
                iconOnly && "ryvra-nav-link--icon-only",
                iconOnly && tooltipPlacement === "top" && "ryvra-nav-link--tooltip-top",
                iconOnly && tooltipPlacement === "right" && "ryvra-nav-link--tooltip-right",
                linkClassName,
              ])}
              href={item.href}
              aria-current={current ? "page" : undefined}
              aria-label={ariaLabel}
              aria-disabled={item.disabled ? "true" : undefined}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              title={iconOnly ? ariaLabel : undefined}
              data-tooltip={iconOnly ? ariaLabel : undefined}
            >
              <span className="ryvra-nav-link-content">
                <NavItemIcon itemId={item.id} />
                <span className={classNameFor(["ryvra-nav-link-label", iconOnly && "ryvra-visually-hidden"])}>
                  {translatedLabel}
                </span>
              </span>
              {!iconOnly && translatedBadge ? <span className="ryvra-nav-badge">{translatedBadge}</span> : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
