import {
  NAV_ICON_SIZE,
  NAV_ICON_STROKE_WIDTH,
  NAV_ICON_VIEW_BOX,
  resolveNavIconName,
  type NavIconName,
} from "./nav-icons";

function renderIconGlyph(iconName: NavIconName) {
  switch (iconName) {
    case "overview":
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      );
    case "dashboard":
      return (
        <>
          <path d="M4 12h16" />
          <path d="M12 4v16" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      );
    case "pay":
      return (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <path d="M3 10h18" />
          <circle cx="16.5" cy="14" r="1.5" />
        </>
      );
    case "markets":
      return (
        <>
          <path d="M4 18l5-6 4 4 7-10" />
          <path d="M20 8v-4h-4" />
        </>
      );
    case "points":
      return (
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M9.5 12h5" />
          <path d="M12 9.5v5" />
        </>
      );
    case "tasks":
      return (
        <>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M8 9h8" />
          <path d="M8 13h6" />
          <path d="M8 17h4" />
        </>
      );
    case "invoices":
      return (
        <>
          <path d="M7 3h10l4 4v14H7z" />
          <path d="M17 3v4h4" />
          <path d="M10 12h8" />
          <path d="M10 16h6" />
        </>
      );
    case "payouts":
      return (
        <>
          <rect x="3" y="7" width="18" height="10" rx="2.5" />
          <path d="M7 12h10" />
          <path d="M15 9l3 3-3 3" />
        </>
      );
    case "reconciliation":
      return (
        <>
          <path d="M4 12a8 8 0 0 1 14.2-4.9" />
          <path d="M20 12a8 8 0 0 1-14.2 4.9" />
          <path d="M18.2 4.8v4.7h-4.7" />
          <path d="M5.8 19.2v-4.7h4.7" />
        </>
      );
    case "instruments":
      return (
        <>
          <path d="M4 19h16" />
          <rect x="6" y="11" width="3" height="6" rx="1" />
          <rect x="11" y="8" width="3" height="9" rx="1" />
          <rect x="16" y="5" width="3" height="12" rx="1" />
        </>
      );
    case "orders":
      return (
        <>
          <path d="M6 4h12" />
          <path d="M6 10h12" />
          <path d="M6 16h8" />
          <circle cx="17" cy="16" r="3" />
        </>
      );
    case "positions":
      return (
        <>
          <path d="M4 18h16" />
          <path d="M6 18V9" />
          <path d="M12 18V5" />
          <path d="M18 18v-6" />
        </>
      );
    case "spot":
      return (
        <>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="16" r="3" />
          <path d="M10.5 10.5l3 3" />
          <path d="M13 6h6v6" />
        </>
      );
    case "perps":
      return (
        <>
          <path d="M4 17l5-7 4 5 7-10" />
          <path d="M20 9V4h-5" />
          <path d="M4 20h16" />
        </>
      );
    case "staking":
      return (
        <>
          <path d="M12 3l5 3v6c0 3.5-2.1 6.6-5 8-2.9-1.4-5-4.5-5-8V6z" />
          <path d="M9.5 11.5h5" />
          <path d="M12 9v5" />
        </>
      );
    case "status":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2" />
          <path d="M12 6v2" />
          <path d="M12 16v2" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="6" />;
  }
}

export interface NavItemIconProps {
  itemId: string;
}

export function NavItemIcon({ itemId }: NavItemIconProps) {
  const iconName = resolveNavIconName(itemId);

  return (
    <svg
      className="ryvra-nav-icon"
      viewBox={NAV_ICON_VIEW_BOX}
      width={NAV_ICON_SIZE}
      height={NAV_ICON_SIZE}
      strokeWidth={NAV_ICON_STROKE_WIDTH}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={iconName}
    >
      {renderIconGlyph(iconName)}
    </svg>
  );
}
