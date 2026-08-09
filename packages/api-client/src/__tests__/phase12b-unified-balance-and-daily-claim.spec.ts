import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import type { PositionDto } from "@ryvra/domain-markets";
import {
  aggregateUnifiedBalance,
  createApiClient,
  createUnifiedBalanceDisplayModelFromPositions,
  formatUnifiedBalanceQuantity,
  formatUnifiedBalanceValue,
} from "../index";
import type { ApiRequest, ApiResult, Transport } from "../types";

async function loadWorkspaceModule<TModule extends object>(relativeToApiClient: string): Promise<TModule> {
  const absolutePath = path.resolve(process.cwd(), relativeToApiClient);
  return (await import(pathToFileURL(absolutePath).href)) as TModule;
}

const logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

const samplePositions: PositionDto[] = [
  {
    id: "pos-1",
    accountId: "acct-main",
    asset: {
      canonicalId: "btc",
      symbol: "BTC",
      chainId: 1,
      decimals: 8,
    },
    state: "open",
    side: "long",
    quantity: "0.5",
    notionalQuoteAsset: "usd",
    notionalValue: "25000",
    netExposureBand: "medium",
    riskFlags: [],
    updatedAt: "2026-08-09T00:00:00.000Z",
  },
  {
    id: "pos-2",
    accountId: "acct-main",
    asset: {
      canonicalId: "eth",
      symbol: "ETH",
      chainId: 137,
      decimals: 18,
    },
    state: "open",
    side: "long",
    quantity: "3",
    notionalQuoteAsset: "usd",
    notionalValue: "9000",
    netExposureBand: "low",
    riskFlags: [],
    updatedAt: "2026-08-09T00:00:00.000Z",
  },
];

test("unified balance aggregation merges duplicate rows with deterministic precedence", () => {
  const aggregation = aggregateUnifiedBalance({
    expectedAccountId: "acct-main",
    sources: [
      {
        source: "primary",
        precedence: 0,
        rows: [
          {
            accountId: "acct-main",
            canonicalId: "btc",
            symbol: "BTC",
            chainId: 1,
            decimals: 8,
            quantity: 0.4,
            notionalValue: 20000,
            quoteAsset: "USD",
          },
        ],
      },
      {
        source: "primary",
        precedence: 0,
        rows: [
          {
            accountId: "acct-main",
            canonicalId: "btc",
            symbol: "BTC",
            chainId: 1,
            decimals: 8,
            quantity: 0.1,
            notionalValue: 5000,
            quoteAsset: "USD",
          },
          {
            accountId: "acct-main",
            canonicalId: "eth",
            symbol: "ETH",
            chainId: 1,
            decimals: 18,
            quantity: 1.5,
            notionalValue: 4500,
            quoteAsset: "USD",
          },
        ],
      },
      {
        source: "fallback",
        precedence: 2,
        rows: [
          {
            accountId: "acct-main",
            canonicalId: "btc",
            symbol: "BTC",
            chainId: 1,
            decimals: 8,
            quantity: 2,
            notionalValue: 100000,
            quoteAsset: "USD",
          },
        ],
      },
    ],
  });

  assert.equal(aggregation.rows.length, 2);
  assert.equal(aggregation.totalNotionalValue, 29500);
  assert.equal(aggregation.rows[0]?.canonicalId, "btc");
  assert.equal(aggregation.rows[0]?.quantity, 0.5);
  assert.equal(aggregation.scopeMismatch, false);
});

test("unified balance display formatting stays deterministic", () => {
  const display = createUnifiedBalanceDisplayModelFromPositions({
    positions: samplePositions,
    expectedAccountId: "acct-main",
  });

  assert.equal(display.totalLabel, "34,000 USD");
  assert.equal(display.rows[0]?.valueLabel, "25,000 USD");
  assert.equal(display.rows[1]?.chainLabel, "Chain 137");
  assert.equal(formatUnifiedBalanceValue(0.0000001, "usd"), "0 USD");
  assert.equal(formatUnifiedBalanceQuantity(0.0000004, 6), "0");
});

test("markets unified balance helper supports success, empty, and error states", async () => {
  const module = await loadWorkspaceModule<{
    loadMarketsUnifiedBalanceCard: (input: {
      marketsClient: { listPositions: () => Promise<{ items: PositionDto[] }> };
      logger: typeof logger;
      accountId: string;
      route: string;
    }) => Promise<{ state: string }>;
  }>("../../apps/markets-web/app/lib/unified-balance.ts");

  const success = await module.loadMarketsUnifiedBalanceCard({
    marketsClient: { listPositions: async () => ({ items: samplePositions }) },
    logger,
    accountId: "acct-main",
    route: "/",
  });
  assert.equal(success.state, "success");

  const empty = await module.loadMarketsUnifiedBalanceCard({
    marketsClient: { listPositions: async () => ({ items: [] }) },
    logger,
    accountId: "acct-main",
    route: "/",
  });
  assert.equal(empty.state, "empty");

  const failed = await module.loadMarketsUnifiedBalanceCard({
    marketsClient: { listPositions: async () => Promise.reject(new Error("boom")) },
    logger,
    accountId: "acct-main",
    route: "/",
  });
  assert.equal(failed.state, "error");
});

test("cross-app parity yields same unified balance totals and labels", async () => {
  const marketsModule = await loadWorkspaceModule<{
    loadMarketsUnifiedBalanceCard: (input: {
      marketsClient: { listPositions: () => Promise<{ items: PositionDto[] }> };
      logger: typeof logger;
      accountId: string;
      route: string;
    }) => Promise<{ state: string; totalLabel?: string }>;
  }>("../../apps/markets-web/app/lib/unified-balance.ts");

  const payModule = await loadWorkspaceModule<{
    loadPayUnifiedBalanceCard: (input: {
      marketsClient: { listPositions: () => Promise<{ items: PositionDto[] }> };
      logger: typeof logger;
      accountId?: string;
      route: string;
    }) => Promise<{ state: string; totalLabel?: string }>;
  }>("../../apps/pay-web/app/lib/unified-balance.ts");

  const marketsCard = await marketsModule.loadMarketsUnifiedBalanceCard({
    marketsClient: { listPositions: async () => ({ items: samplePositions }) },
    logger,
    accountId: "acct-main",
    route: "/",
  });
  const payCard = await payModule.loadPayUnifiedBalanceCard({
    marketsClient: { listPositions: async () => ({ items: samplePositions }) },
    logger,
    accountId: "acct-main",
    route: "/",
  });

  assert.equal(marketsCard.state, "success");
  assert.equal(payCard.state, "success");
  assert.equal(marketsCard.totalLabel, payCard.totalLabel);
});

test("pay unified balance helper surfaces missing account scope clearly", async () => {
  const module = await loadWorkspaceModule<{
    loadPayUnifiedBalanceCard: (input: {
      marketsClient: { listPositions: () => Promise<{ items: PositionDto[] }> };
      logger: typeof logger;
      accountId?: string;
      route: string;
    }) => Promise<{ state: string; errorMessage?: string }>;
  }>("../../apps/pay-web/app/lib/unified-balance.ts");

  const result = await module.loadPayUnifiedBalanceCard({
    marketsClient: { listPositions: async () => ({ items: samplePositions }) },
    logger,
    route: "/",
  });

  assert.equal(result.state, "error");
  assert.equal(result.errorMessage?.includes("account scope"), true);
});

test("points balance request helper preserves account/user/workspace scope", async () => {
  const module = await loadWorkspaceModule<{
    buildPointsSummaryRequest: (input: {
      accountId: string;
      userId?: string;
      workspaceId?: string;
      window?: "24h" | "7d";
    }) => {
      accountId: string;
      userId?: string;
      workspaceId?: string;
      window?: "24h" | "7d";
    };
    resolvePointsBalance: (summary: { availablePoints: number; totalPoints: number }) => number;
  }>("../../apps/points-tasks-web/app/lib/points-balance.ts");

  const request = module.buildPointsSummaryRequest({
    accountId: "acct-1",
    userId: "user-1",
    workspaceId: "ws-1",
    window: "24h",
  });

  assert.equal(request.accountId, "acct-1");
  assert.equal(request.userId, "user-1");
  assert.equal(request.workspaceId, "ws-1");
  assert.equal(module.resolvePointsBalance({ availablePoints: 120, totalPoints: 180 }), 120);
});

test("daily claim view model supports available, cooldown, already-claimed, and unavailable states", async () => {
  const module = await loadWorkspaceModule<{
    buildDailyClaimViewModel: (input: {
      claimState?: {
        accountId: string;
        eligible: boolean;
        status: "available" | "already_claimed" | "cooldown";
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
    }) => {
      status: string;
      cta: { enabled: boolean; reason?: string };
      retryable: boolean;
      retryHref?: string;
      nextEligibleLabel?: string;
    };
  }>("../../apps/points-tasks-web/app/lib/daily-claim.ts");

  const available = module.buildDailyClaimViewModel({
    claimState: {
      accountId: "acct-1",
      eligible: true,
      status: "available",
      invokeEndpointAvailable: true,
    },
    nowIso: "2026-08-09T05:00:00.000Z",
    claimStatusEndpointAvailable: true,
    expectedAccountId: "acct-1",
  });
  assert.equal(available.status, "available");
  assert.equal(available.cta.enabled, true);

  const cooldown = module.buildDailyClaimViewModel({
    claimState: {
      accountId: "acct-1",
      eligible: false,
      status: "cooldown",
      nextEligibleAt: "2026-08-09T08:30:00.000Z",
      invokeEndpointAvailable: false,
    },
    nowIso: "2026-08-09T07:00:00.000Z",
    claimStatusEndpointAvailable: true,
    expectedAccountId: "acct-1",
  });
  assert.equal(cooldown.status, "cooldown");
  assert.equal(Boolean(cooldown.nextEligibleLabel), true);

  const alreadyClaimed = module.buildDailyClaimViewModel({
    claimState: {
      accountId: "acct-1",
      eligible: false,
      status: "already_claimed",
      invokeEndpointAvailable: false,
    },
    nowIso: "2026-08-09T07:00:00.000Z",
    claimStatusEndpointAvailable: true,
    expectedAccountId: "acct-1",
  });
  assert.equal(alreadyClaimed.status, "already_claimed");
  assert.equal(alreadyClaimed.cta.enabled, false);

  const unavailable = module.buildDailyClaimViewModel({
    nowIso: "2026-08-09T07:00:00.000Z",
    claimStatusEndpointAvailable: false,
    endpointErrorMessage: "endpoint unavailable",
    endpointRetryable: true,
    retryHref: "/points?account_id=acct-1",
    expectedAccountId: "acct-1",
  });
  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.retryable, true);
  assert.equal(unavailable.retryHref, "/points?account_id=acct-1");
});

test("daily claim status client method uses scoped read endpoint", async () => {
  const calls: ApiRequest[] = [];
  const transport: Transport = {
    async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
      calls.push(request);
      return {
        ok: true,
        data: {
          account_id: "acct-1",
          eligible: false,
          status: "cooldown",
          reason_code: "cooldown_active",
          next_eligible_at: "2026-08-09T08:00:00.000Z",
          invoke_endpoint_available: false,
        } as T,
      };
    },
  };

  const client = createApiClient({
    mode: "mock",
    transport,
    pointsTasks: {
      defaultAccountId: "acct-1",
    },
  });

  const result = await client.pointsTasks.getDailyClaimStatus({
    accountId: "acct-1",
    userId: "user-1",
    workspaceId: "ws-1",
  });

  assert.equal(result.status, "cooldown");
  assert.equal(calls[0]?.path.startsWith("/points-tasks/eligibility"), true);
  assert.equal(calls[0]?.path.includes("account_id=acct-1"), true);
  assert.equal(calls[0]?.path.includes("user_id=user-1"), true);
});
