export interface ShellNavItem {
  id: string;
  label: string;
  href: string;
  current?: boolean;
  disabled?: boolean;
  external?: boolean;
  ariaLabel?: string;
  badge?: string;
}

export interface ProductSwitcherItem {
  productId: string;
  label: string;
  href: string;
  current?: boolean;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface UserMenuItem {
  id: string;
  label: string;
  href: string;
  disabled?: boolean;
}
