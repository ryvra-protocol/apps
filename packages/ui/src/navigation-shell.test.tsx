import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "./AppShell";
import { BottomIconDock } from "./BottomIconDock";
import { GlobalSidebar } from "./GlobalSidebar";
import type { ProductSwitcherItem, ShellNavItem } from "./navigation";
import { shellStyles } from "./shell-styles";
import {
  SIDEBAR_COLLAPSE_STORAGE_KEY,
  readSidebarCollapsedPreference,
  toggleSidebarCollapsed,
  writeSidebarCollapsedPreference,
} from "./sidebar-preferences";

const globalNavItems: ShellNavItem[] = [
  { id: "overview", label: "Overview", href: "/overview", ariaLabel: "Overview" },
  { id: "markets", label: "Markets", href: "/markets", ariaLabel: "Markets" },
];

const localNavItems: ShellNavItem[] = [
  { id: "markets-dashboard", label: "Dashboard", href: "/" },
  { id: "markets-orders", label: "Orders", href: "/orders" },
];

const productSwitcherItems: ProductSwitcherItem[] = [
  { productId: "pay", label: "Pay", href: "/pay", current: false },
  { productId: "markets", label: "Markets", href: "/markets", current: true },
  { productId: "points", label: "Points", href: "/points", current: false },
];

test("sidebar defaults to collapsed on first render", () => {
  const markup = renderToStaticMarkup(
    <AppShell
      appName="Ryvra Markets"
      globalNavItems={globalNavItems}
      localNavItems={localNavItems}
      localNavTitle="Markets"
      localNavAriaLabel="Markets navigation"
      productSwitcherItems={productSwitcherItems}
      breadcrumbs={[{ label: "Dashboard", current: true }]}
      currentPath="/orders"
      userMenuItems={[]}
    >
      <div>content</div>
    </AppShell>,
  );

  assert.match(markup, /data-sidebar-collapsed="true"/);
  assert.match(markup, /ryvra-sidebar--collapsed/);
});

test("collapsed sidebar renders icon-only links with hidden labels", () => {
  const markup = renderToStaticMarkup(
    <GlobalSidebar
      globalNavItems={globalNavItems}
      localNavItems={localNavItems}
      localNavTitle="Markets"
      localNavAriaLabel="Markets navigation"
      currentPath="/orders"
      collapsed
    />,
  );

  assert.match(markup, /ryvra-nav-link--icon-only/);
  assert.match(markup, /ryvra-visually-hidden/);
});

test("sidebar toggle supports expand/collapse semantics", () => {
  assert.equal(toggleSidebarCollapsed(true), false);
  assert.equal(toggleSidebarCollapsed(false), true);

  const collapsedMarkup = renderToStaticMarkup(
    <GlobalSidebar globalNavItems={globalNavItems} localNavItems={localNavItems} collapsed />,
  );
  assert.match(collapsedMarkup, /aria-expanded="false"/);
  assert.match(collapsedMarkup, /aria-label="Expand sidebar navigation"/);

  const expandedMarkup = renderToStaticMarkup(
    <GlobalSidebar globalNavItems={globalNavItems} localNavItems={localNavItems} collapsed={false} />,
  );
  assert.match(expandedMarkup, /aria-expanded="true"/);
  assert.match(expandedMarkup, /aria-label="Collapse sidebar navigation"/);
});

test("sidebar preference persistence round-trips through storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };

  assert.equal(readSidebarCollapsedPreference(storage), null);
  writeSidebarCollapsedPreference(storage, false);
  assert.equal(values.get(SIDEBAR_COLLAPSE_STORAGE_KEY), "false");
  assert.equal(readSidebarCollapsedPreference(storage), false);
  values.set(SIDEBAR_COLLAPSE_STORAGE_KEY, "true");
  assert.equal(readSidebarCollapsedPreference(storage), true);
});

test("bottom dock renders icon-only controls in non-full-width container", () => {
  const markup = renderToStaticMarkup(<BottomIconDock items={productSwitcherItems} />);

  assert.match(markup, /class="ryvra-bottom-dock"/);
  assert.match(markup, /class="ryvra-nav-list ryvra-bottom-dock-list"/);
  assert.match(markup, /ryvra-nav-link--icon-only/);
  assert.match(shellStyles, /\.ryvra-bottom-dock\s*\{[\s\S]*width: max-content;/);
  assert.match(shellStyles, /\.ryvra-bottom-dock\s*\{[\s\S]*max-width:/);
});

test("active route highlighting is applied in sidebar and bottom dock", () => {
  const sidebarMarkup = renderToStaticMarkup(
    <GlobalSidebar
      globalNavItems={globalNavItems}
      localNavItems={localNavItems}
      localNavTitle="Markets"
      localNavAriaLabel="Markets navigation"
      currentPath="/orders"
      collapsed={false}
    />,
  );
  assert.match(sidebarMarkup, /href="\/orders"[^>]*aria-current="page"/);

  const dockMarkup = renderToStaticMarkup(<BottomIconDock items={productSwitcherItems} />);
  assert.match(dockMarkup, /href="\/markets"[^>]*aria-current="page"/);
});

test("nav controls expose keyboard/focus accessibility hooks", () => {
  const markup = renderToStaticMarkup(
    <GlobalSidebar
      globalNavItems={globalNavItems}
      localNavItems={localNavItems}
      localNavTitle="Markets"
      localNavAriaLabel="Markets navigation"
      currentPath="/orders"
      collapsed
    />,
  );

  assert.match(markup, /type="button"/);
  assert.match(markup, /aria-controls="ryvra-sidebar-sections"/);
  assert.match(markup, /aria-label="Overview"/);
  assert.match(markup, /title="Overview"/);
  assert.match(shellStyles, /\.ryvra-nav-link:focus-visible/);
  assert.match(shellStyles, /\.ryvra-sidebar-toggle:focus-visible/);
});
