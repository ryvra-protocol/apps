import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "./AppShell";
import { shellStyles } from "./shell-styles";
import type { BreadcrumbItem, ProductSwitcherItem, ShellNavItem, UserMenuItem } from "./navigation";

const globalNavItems: ShellNavItem[] = [
  { id: "overview", label: "Overview", labelKey: "nav.overview", href: "/overview" },
  { id: "markets", label: "Markets", labelKey: "nav.markets", href: "/markets" },
];

const localNavItems: ShellNavItem[] = [
  { id: "markets-dashboard", label: "Dashboard", labelKey: "nav.dashboard", href: "/" },
  { id: "markets-orders", label: "Orders", labelKey: "nav.orders", href: "/orders" },
];

const productSwitcherItems: ProductSwitcherItem[] = [
  { productId: "pay", label: "Pay", labelKey: "nav.pay", href: "/pay", current: false },
  { productId: "markets", label: "Markets", labelKey: "nav.markets", href: "/markets", current: true },
  { productId: "points", label: "Points", labelKey: "nav.points", href: "/points", current: false },
];

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Dashboard", labelKey: "nav.dashboard", href: "/" },
  { label: "Overview", labelKey: "nav.overview", current: true },
];

const userMenuItems: UserMenuItem[] = [
  { id: "profile", label: "Profile", labelKey: "shell.userMenu.profile", href: "/overview" },
];

function renderShell(locale: "en" | "fr" | "ar") {
  return renderToStaticMarkup(
    <AppShell
      appName="Ryvra Markets"
      globalNavItems={globalNavItems}
      localNavItems={localNavItems}
      localNavTitle="Markets"
      localNavAriaLabel="Markets navigation"
      productSwitcherItems={productSwitcherItems}
      breadcrumbs={breadcrumbs}
      currentPath="/overview"
      userMenuItems={userMenuItems}
      commandTriggerLabel="Quick Actions"
      initialLocale={locale}
      initialTimeZonePreference="UTC"
      hydrateI18nFromStorage={false}
    >
      <div>content</div>
    </AppShell>,
  );
}

test("rtl locale applies rtl direction and translated shell text", () => {
  const markup = renderShell("ar");

  assert.match(markup, /dir="rtl"/);
  assert.match(markup, /تخطي إلى المحتوى/);
  assert.match(markup, /لوحة التحكم/);
});

test("locale controls expose translated accessibility labels", () => {
  const markup = renderShell("fr");

  assert.match(markup, /aria-label="Paramètres de langue et de fuseau horaire"/);
  assert.match(markup, /aria-label="Sélecteur de langue"/);
  assert.match(markup, /aria-label="Sélecteur de fuseau horaire"/);
  assert.match(markup, /Tableau de bord/);
});

test("critical shell render smoke passes for supported locales", () => {
  const localeExpectedMap: Record<"en" | "fr" | "ar", string> = {
    en: "Dashboard",
    fr: "Tableau de bord",
    ar: "لوحة التحكم",
  };
  const localeDockLabelMap: Record<"en" | "fr" | "ar", string> = {
    en: "Product navigation dock",
    fr: "Dock de navigation produit",
    ar: "شريط تنقل المنتجات",
  };

  for (const locale of ["en", "fr", "ar"] as const) {
    const markup = renderShell(locale);
    assert.ok(markup.includes(localeExpectedMap[locale]));
    assert.ok(markup.includes(localeDockLabelMap[locale]));
  }
});

test("rtl shell styles include directional tooltip and panel fallbacks", () => {
  assert.match(shellStyles, /\.ryvra-shell-root\[dir=\"rtl\"\] \.ryvra-nav-link--icon-only::after/);
  assert.match(shellStyles, /\.ryvra-shell-root\[dir=\"rtl\"\] \.ryvra-notification-panel/);
});
