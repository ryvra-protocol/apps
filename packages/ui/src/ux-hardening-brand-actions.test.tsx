import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionToolbar, InlineStatusIndicators } from "./ActionSurface";
import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";
import { themeTokens } from "./theme";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("workspace selector is removed from user-facing shell frames", () => {
  const shellFrames = [
    "apps/markets-web/app/shell-frame.tsx",
    "apps/pay-web/app/shell-frame.tsx",
    "apps/points-tasks-web/app/shell-frame.tsx",
  ];

  for (const relativePath of shellFrames) {
    const content = readSource(relativePath);
    assert.doesNotMatch(content, /WorkspaceScopeSwitcher/);
    assert.doesNotMatch(content, /scopeSwitcher=\{/);
  }
});

test("overview surfaces use compact indicators and place snapshot cards at end", () => {
  const markets = readSource("apps/markets-web/app/components/markets-overview-content.tsx");
  const pay = readSource("apps/pay-web/app/components/pay-overview-content.tsx");
  const hub = readSource("apps/points-tasks-web/app/components/points-tasks-overview-content.tsx");

  assert.ok(markets.indexOf("markets-snapshot-indicators") < markets.indexOf("markets-snapshot-details-card"));
  assert.ok(pay.indexOf("Pay overview indicators") < pay.indexOf("pay-snapshot-details-card"));
  assert.ok(hub.indexOf("Community Hub indicators") < hub.indexOf("community-hub-snapshot-details-card"));
});

test("markets modules and module CTAs are present with deferred backend messaging", () => {
  const markets = readSource("apps/markets-web/app/components/markets-overview-content.tsx");
  const routes = readSource("packages/config/src/routing.ts");

  assert.match(routes, /"markets-spot"/);
  assert.match(routes, /"markets-perps"/);
  assert.match(routes, /"markets-staking"/);

  assert.match(markets, /Classified Spot/);
  assert.match(markets, /Perps Trading/);
  assert.match(markets, /Staking/);
  assert.match(markets, /Open Spot/);
  assert.match(markets, /Open Perps/);
  assert.match(markets, /Stake Now/);
  assert.match(markets, /Deferred backend/);
});

test("community hub naming replaces legacy points tasks branding in primary headers", () => {
  const files = [
    "apps/points-tasks-web/app/layout.tsx",
    "apps/points-tasks-web/app/shell-frame.tsx",
    "apps/points-tasks-web/app/page.tsx",
    "apps/points-tasks-web/app/overview/page.tsx",
  ];

  for (const relativePath of files) {
    const content = readSource(relativePath);
    assert.match(content, /Ryvra Community Hub/);
  }
});

test("claim CTA is wired into dashboard and overview community hub surfaces", () => {
  const dashboard = readSource("apps/points-tasks-web/app/page.tsx");
  const overview = readSource("apps/points-tasks-web/app/overview/page.tsx");
  const overviewContent = readSource("apps/points-tasks-web/app/components/points-tasks-overview-content.tsx");

  assert.match(dashboard, /claimCta=\{/);
  assert.match(overview, /claimCta=\{/);
  assert.match(overviewContent, /id: "hub-claim"/);
  assert.match(overviewContent, /disabled: !claimCta.enabled/);
});

test("send receive and utility actions are present across app overview action zones", () => {
  const markets = readSource("apps/markets-web/app/components/markets-overview-content.tsx");
  const pay = readSource("apps/pay-web/app/components/pay-overview-content.tsx");
  const hub = readSource("apps/points-tasks-web/app/components/points-tasks-overview-content.tsx");

  for (const content of [markets, pay, hub]) {
    assert.match(content, /Send/);
    assert.match(content, /Receive/);
    assert.match(content, /View History/);
    assert.match(content, /Export/);
  }
});

test("phase 21 brand tokens apply to buttons, cards, borders, and status chips", () => {
  assert.equal(themeTokens.color.primary, "#3B5BFF");
  assert.equal(themeTokens.color.secondary, "#14B8A6");
  assert.equal(themeTokens.color.accent, "#7C3AED");
  assert.equal(themeTokens.color.success, "#16A34A");
  assert.equal(themeTokens.color.warning, "#F59E0B");
  assert.equal(themeTokens.color.danger, "#DC2626");
  assert.equal(themeTokens.color.backgroundLight, "#F8FAFC");
  assert.equal(themeTokens.color.borderLight, "#CBD5E1");

  const markup = renderToStaticMarkup(
    <Card title="Brand card" tone="highlight">
      <p>body</p>
    </Card>,
  );

  assert.match(markup, /background:#EDE9FE/i);

  const statusMarkup = renderToStaticMarkup(<StatusBadge status="completed" />);
  assert.match(statusMarkup, new RegExp(`border:1px solid ${themeTokens.color.success}`, "i"));

  const indicatorsMarkup = renderToStaticMarkup(
    <InlineStatusIndicators
      items={[
        { id: "brand", label: "Brand", value: "Active", tone: "brand" },
        { id: "warning", label: "Risk", value: "Watch", tone: "warning" },
      ]}
    />,
  );
  assert.match(indicatorsMarkup, new RegExp(themeTokens.color.primarySurface, "i"));
  assert.match(indicatorsMarkup, new RegExp(themeTokens.color.warningSurface, "i"));
});

test("action toolbar preserves accessibility and deferred-action messaging", () => {
  const markup = renderToStaticMarkup(
    <ActionToolbar
      ariaLabel="Toolbar accessibility"
      items={[
        { id: "send", label: "Send", href: "/send", variant: "primary" },
        { id: "receive", label: "Receive", href: "/receive" },
        { id: "export", label: "Export", disabled: true, disabledReason: "Export backend is deferred." },
      ]}
    />,
  );

  assert.match(markup, /role="toolbar"/);
  assert.match(markup, /Toolbar accessibility/);
  assert.match(markup, /:focus-visible/);
  assert.match(markup, /Export backend is deferred/);
});
