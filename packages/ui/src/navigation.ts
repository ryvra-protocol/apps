export interface ShellNavItem {
  id: string;
  label: string;
  labelKey?: string;
  href: string;
  current?: boolean;
  disabled?: boolean;
  external?: boolean;
  ariaLabel?: string;
  ariaLabelKey?: string;
  badge?: string;
  badgeKey?: string;
}

export interface ProductSwitcherItem {
  productId: string;
  label: string;
  labelKey?: string;
  href: string;
  current?: boolean;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  labelKey?: string;
  href?: string;
  current?: boolean;
}

export interface UserMenuItem {
  id: string;
  label: string;
  labelKey?: string;
  href: string;
  disabled?: boolean;
}
