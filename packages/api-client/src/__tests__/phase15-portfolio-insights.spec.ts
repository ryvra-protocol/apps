import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolvePortfolioInsightState } from "../index";

async function readWorkspaceFile(relativeToApiClient: string): Promise<string> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return readFile(absolutePath, "utf8");
}

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

test("placement: markets/pay unified balance appears in top-priority section before secondary analytics", async () => {
  const marketsSource = await readWorkspaceFile("../../apps/markets-web/app/components/markets-overview-content.tsx");
  const paySource = await readWorkspaceFile("../../apps/pay-web/app/components/pay-overview-content.tsx");
  const marketsDashboardSource = await readWorkspaceFile("../../apps/markets-web/app/page.tsx");
  const marketsOverviewRouteSource = await readWorkspaceFile("../../apps/markets-web/app/overview/page.tsx");
  const payDashboardSource = await readWorkspaceFile("../../apps/pay-web/app/page.tsx");
  const payOverviewRouteSource = await readWorkspaceFile("../../apps/pay-web/app/overview/page.tsx");

  assert.match(marketsSource, /data-testid="markets-top-priority-zone"/);
  assert.match(marketsSource, /data-testid="markets-unified-balance-top-card"/);
  assert.equal(
    marketsSource.indexOf('data-testid="markets-unified-balance-top-card"') <
      marketsSource.indexOf('<Card title="Total instruments">'),
    true,
  );

  assert.match(paySource, /data-testid="pay-top-priority-zone"/);
  assert.match(paySource, /data-testid="pay-unified-balance-top-card"/);
  assert.equal(
    paySource.indexOf('data-testid="pay-unified-balance-top-card"') < paySource.indexOf('<Card title="Open invoices">'),
    true,
  );

  assert.match(marketsDashboardSource, /<MarketsOverviewContent/);
  assert.match(marketsOverviewRouteSource, /<MarketsOverviewContent/);
  assert.match(payDashboardSource, /<PayOverviewContent/);
  assert.match(payOverviewRouteSource, /<PayOverviewContent/);
});

test("placement: points/tasks top sections include points balance and daily claim surfaces", async () => {
  const pointsSource = await readWorkspaceFile("../../apps/points-tasks-web/app/points/page.tsx");
  const tasksSource = await readWorkspaceFile("../../apps/points-tasks-web/app/tasks/page.tsx");
  const topSectionSource = await readWorkspaceFile("../../apps/points-tasks-web/app/components/points-tasks-top-priority-section.tsx");

  assert.match(topSectionSource, /data-testid=\{\`\$\{route\}-top-priority-zone\`\}/);
  assert.match(topSectionSource, /data-testid=\{\`\$\{route\}-points-balance-top-card\`\}/);
  assert.match(topSectionSource, /data-testid=\{\`\$\{route\}-daily-claim-top-surface\`\}/);

  assert.match(pointsSource, /<PointsTasksTopPrioritySection/);
  assert.match(pointsSource, /route="points"/);
  assert.equal(pointsSource.indexOf("<PointsTasksTopPrioritySection") < pointsSource.indexOf('<Card title="Total points">'), true);

  assert.match(tasksSource, /<PointsTasksTopPrioritySection/);
  assert.match(tasksSource, /route="tasks"/);
  assert.equal(tasksSource.indexOf("<PointsTasksTopPrioritySection") < tasksSource.indexOf('<Card title="Total tasks">'), true);
});

test("insight module states cover loading, empty, error, and success", () => {
  assert.equal(resolvePortfolioInsightState({ isLoading: true, hasError: true, hasData: true }), "loading");
  assert.equal(resolvePortfolioInsightState({ hasError: true, hasData: true }), "error");
  assert.equal(resolvePortfolioInsightState({ hasError: false, hasData: false }), "empty");
  assert.equal(resolvePortfolioInsightState({ hasData: true }), "success");
});

test("insight fallback behavior is explicit when history coverage or sources are unavailable", async () => {
  const module = await loadWorkspaceModule<{
    buildPointsTasksPortfolioInsights: (input: {
      selectedWindow: "24h" | "7d" | "30d";
      pointsOverview?: {
        accountId: string;
        windowStart: string;
        windowEnd: string;
        currentBalance: number;
        lifetimePoints: number;
        entriesLast24h: number;
        pointsLast24h: number;
        trend: { bucketStart: string; bucketEnd: string; pointsEarned: number; entries: number }[];
      };
      tasksOverview?: {
        accountId: string;
        windowStart: string;
        windowEnd: string;
        completionRate: number;
        tasksCreated: number;
        tasksCompleted: number;
        recentlyCompleted: { taskId: string; taskType: string; taskStatus: string; progressState: string; progressPercent: number }[];
        atRisk: { taskId: string; taskType: string; taskStatus: string; progressState: string; progressPercent: number }[];
      };
      errorMessage?: string;
    }) => {
      state: string;
      fallbackMessage?: string;
    };
  }>("../../apps/points-tasks-web/app/lib/portfolio-insights.ts");

  const errored = module.buildPointsTasksPortfolioInsights({
    selectedWindow: "24h",
    errorMessage: "insight endpoint unavailable",
  });
  assert.equal(errored.state, "error");

  const empty = module.buildPointsTasksPortfolioInsights({
    selectedWindow: "24h",
  });
  assert.equal(empty.state, "empty");

  const partialCoverage = module.buildPointsTasksPortfolioInsights({
    selectedWindow: "30d",
    pointsOverview: {
      accountId: "acct-1",
      windowStart: "2026-08-01T00:00:00.000Z",
      windowEnd: "2026-08-05T00:00:00.000Z",
      currentBalance: 1200,
      lifetimePoints: 4500,
      entriesLast24h: 10,
      pointsLast24h: 250,
      trend: [{ bucketStart: "2026-08-05T00:00:00.000Z", bucketEnd: "2026-08-05T23:59:59.999Z", pointsEarned: 250, entries: 10 }],
    },
    tasksOverview: {
      accountId: "acct-1",
      windowStart: "2026-08-02T00:00:00.000Z",
      windowEnd: "2026-08-05T00:00:00.000Z",
      completionRate: 62.5,
      tasksCreated: 40,
      tasksCompleted: 25,
      recentlyCompleted: [],
      atRisk: [],
    },
  });
  assert.equal(partialCoverage.state, "success");
  assert.equal(Boolean(partialCoverage.fallbackMessage), true);
});

test("derived portfolio totals and allocations stay deterministic across markets and pay insight builders", async () => {
  const marketsModule = await loadWorkspaceModule<{
    buildMarketsPortfolioInsights: (input: {
      overview: {
        asOf: string;
        apiVersion: string;
        accountId: string;
        healthStatus: "pass" | "degraded" | "fail";
        instruments: { totalInstruments: number; tradableInstruments: number };
        orders: { totalOrders: number; openOrders: number };
        positions: { totalPositions: number; openPositions: number; netExposureBand: "low" | "medium" | "high" };
      };
      unifiedBalanceCard: {
        state: "success";
        totalLabel: string;
        portfolioSnapshot: {
          totalNotionalValue: number;
          totalQuoteAsset: string;
          rows: { id: string; symbol: string; notionalValue: number }[];
        };
      };
    }) => {
      totalValueLabel: string;
      allocation: { label: string; sharePercent: number }[];
    };
  }>("../../apps/markets-web/app/lib/portfolio-insights.ts");

  const payModule = await loadWorkspaceModule<{
    buildPayPortfolioInsights: (input: {
      overview: {
        metrics: {
          openInvoiceCount: number;
          pendingInvoiceAmountMinor: number;
          payoutInFlightCount: number;
          payoutProcessingAmountMinor: number;
          reconciliationMismatchCount: number;
          currency: string;
        };
        recentActivity: {
          id: string;
          type: "invoice" | "payout" | "reconciliation";
          title: string;
          status: string;
          createdAt: string;
          amountMinor?: number;
          currency?: string;
        }[];
      };
      unifiedBalanceCard: {
        state: "success";
        totalLabel: string;
        portfolioSnapshot: {
          totalNotionalValue: number;
          totalQuoteAsset: string;
          rows: { id: string; symbol: string; notionalValue: number }[];
        };
      };
    }) => {
      totalValueLabel: string;
      allocation: { label: string; sharePercent: number }[];
    };
  }>("../../apps/pay-web/app/lib/portfolio-insights.ts");

  const unifiedBalanceCard = {
    state: "success" as const,
    totalLabel: "34,000 USD",
    portfolioSnapshot: {
      totalNotionalValue: 34_000,
      totalQuoteAsset: "USD",
      rows: [
        { id: "btc", symbol: "BTC", notionalValue: 25_000 },
        { id: "eth", symbol: "ETH", notionalValue: 9_000 },
      ],
    },
  };

  const markets = marketsModule.buildMarketsPortfolioInsights({
    overview: {
      asOf: "2026-08-09T00:00:00.000Z",
      apiVersion: "2026-08-08",
      accountId: "acct-1",
      healthStatus: "pass",
      instruments: { totalInstruments: 12, tradableInstruments: 10 },
      orders: { totalOrders: 18, openOrders: 6 },
      positions: { totalPositions: 7, openPositions: 5, netExposureBand: "medium" },
    },
    unifiedBalanceCard,
  });

  const pay = payModule.buildPayPortfolioInsights({
    overview: {
      metrics: {
        openInvoiceCount: 4,
        pendingInvoiceAmountMinor: 350_000,
        payoutInFlightCount: 2,
        payoutProcessingAmountMinor: 220_000,
        reconciliationMismatchCount: 1,
        currency: "USD",
      },
      recentActivity: [],
    },
    unifiedBalanceCard,
  });

  assert.equal(markets.totalValueLabel, pay.totalValueLabel);
  assert.deepEqual(
    markets.allocation.map((item) => ({ label: item.label, share: Number(item.sharePercent.toFixed(6)) })),
    pay.allocation.map((item) => ({ label: item.label, share: Number(item.sharePercent.toFixed(6)) })),
  );
});

test("formatting helpers keep timestamp and unit conventions aligned across apps", async () => {
  const marketsFormat = await loadWorkspaceModule<{
    formatDateTime: (isoTimestamp: string) => string;
  }>("../../apps/markets-web/app/lib/format.ts");
  const payFormat = await loadWorkspaceModule<{
    formatDateTime: (isoTimestamp: string) => string;
    formatCurrencyMinor: (amountMinor: number, currency: string) => string;
  }>("../../apps/pay-web/app/lib/format.ts");
  const pointsFormat = await loadWorkspaceModule<{
    formatDateTime: (isoTimestamp: string) => string;
  }>("../../apps/points-tasks-web/app/lib/format.ts");

  const timestamp = "2026-08-09T12:34:00.000Z";
  const marketsLabel = marketsFormat.formatDateTime(timestamp);
  const payLabel = payFormat.formatDateTime(timestamp);
  const pointsLabel = pointsFormat.formatDateTime(timestamp);

  assert.equal(marketsLabel, payLabel);
  assert.equal(payLabel, pointsLabel);
  assert.match(marketsLabel, /UTC/);
  const currencyLabel = payFormat.formatCurrencyMinor(125000, "usd");
  assert.match(currencyLabel, /1,250/);
  assert.match(currencyLabel, /(USD|\$)/);
});

test("interaction helpers preserve window selection and daily claim CTA safety states", async () => {
  const insightsModule = await loadWorkspaceModule<{
    buildPointsTasksWindowLinks: (input: {
      route: "/points" | "/tasks";
      searchParams: Record<string, string | string[] | undefined>;
    }) => { window: "24h" | "7d" | "30d"; href: string }[];
    resolvePointsTasksInsightWindow: (searchParams: Record<string, string | string[] | undefined>) => "24h" | "7d" | "30d";
  }>("../../apps/points-tasks-web/app/lib/portfolio-insights.ts");

  const links = insightsModule.buildPointsTasksWindowLinks({
    route: "/tasks",
    searchParams: {
      account_id: "acct-9",
      user_id: "user-9",
      window: "7d",
    },
  });

  assert.equal(insightsModule.resolvePointsTasksInsightWindow({ window: "7d" }), "7d");
  assert.equal(insightsModule.resolvePointsTasksInsightWindow({ window: "90d" }), "24h");
  assert.equal(links.length, 3);
  assert.equal(links[0]?.href.includes("account_id=acct-9"), true);
  assert.equal(links[0]?.href.includes("user_id=user-9"), true);
  assert.equal(links[1]?.href.includes("window=7d"), true);

  const dailyClaimModule = await loadWorkspaceModule<{
    buildDailyClaimViewModel: (input: {
      claimState?: {
        accountId: string;
        eligible: boolean;
        status?: "available" | "already_claimed" | "cooldown";
        reasonCode?: string;
        nextEligibleAt?: string;
        invokeEndpointAvailable: boolean;
      };
      nowIso: string;
      claimStatusEndpointAvailable: boolean;
      endpointErrorMessage?: string;
      endpointRetryable?: boolean;
      retryHref?: string;
      expectedAccountId: string;
    }) => { cta: { enabled: boolean; reason?: string } };
  }>("../../apps/points-tasks-web/app/lib/daily-claim.ts");

  const enabled = dailyClaimModule.buildDailyClaimViewModel({
    claimState: {
      accountId: "acct-9",
      eligible: true,
      status: "available",
      invokeEndpointAvailable: true,
    },
    nowIso: "2026-08-09T06:00:00.000Z",
    claimStatusEndpointAvailable: true,
    expectedAccountId: "acct-9",
  });
  assert.equal(enabled.cta.enabled, true);

  const disabled = dailyClaimModule.buildDailyClaimViewModel({
    nowIso: "2026-08-09T06:00:00.000Z",
    claimStatusEndpointAvailable: false,
    endpointErrorMessage: "status endpoint down",
    endpointRetryable: true,
    retryHref: "/tasks?account_id=acct-9",
    expectedAccountId: "acct-9",
  });
  assert.equal(disabled.cta.enabled, false);
  assert.equal(Boolean(disabled.cta.reason?.includes("unavailable")), true);
});
