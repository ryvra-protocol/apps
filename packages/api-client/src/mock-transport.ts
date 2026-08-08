import type {
  InstrumentDto,
  InstrumentSummaryDto,
  MarketsListResponse,
  MarketsOverviewDto,
  OrderDto,
  OrderSummaryDto,
  PositionDto,
  PositionSummaryDto,
} from "@ryvra/domain-markets";
import {
  type InvoiceDto,
  type InvoiceSummaryDto,
  type PayActivityItemDto,
  type PayListResponse,
  type PayOverviewDto,
  type PaymentIntent,
  type PayoutDto,
  type PayoutSummaryDto,
  type ReconciliationResult,
  type ReconciliationItemDto,
  type ReconciliationSummaryDto,
  type SettlementSnapshot,
  type SubscriptionDto,
} from "@ryvra/domain-payments";
import type { ConversionPreviewDto, EligibilityResult } from "@ryvra/domain-tokenomics";
import { payCanonicalPaymentIntentStates } from "./pay-parity";
import type { ApiRequest, ApiResult, Transport } from "./types";

const mockInstruments: InstrumentDto[] = [
  {
    id: "asset-btc-usd",
    symbol: "BTC/USD",
    baseAsset: "btc",
    quoteAsset: "usd",
    assetClass: "crypto",
    availability: "tradable",
    status: "active",
    chainId: 1,
    tickSize: "0.01",
    lotSize: "0.0001",
    minNotional: "10",
    maxNotional: "500000",
    pricePrecision: 2,
    sizePrecision: 6,
    updatedAt: "2026-08-06T10:00:00.000Z",
  },
  {
    id: "asset-eth-usd",
    symbol: "ETH/USD",
    baseAsset: "eth",
    quoteAsset: "usd",
    assetClass: "crypto",
    availability: "tradable",
    status: "active",
    chainId: 1,
    tickSize: "0.01",
    lotSize: "0.0001",
    minNotional: "10",
    maxNotional: "500000",
    pricePrecision: 2,
    sizePrecision: 6,
    updatedAt: "2026-08-06T09:00:00.000Z",
  },
  {
    id: "asset-sol-usd",
    symbol: "SOL/USD",
    baseAsset: "sol",
    quoteAsset: "usd",
    assetClass: "crypto",
    availability: "close_only",
    status: "active",
    chainId: 1,
    tickSize: "0.01",
    lotSize: "0.1",
    minNotional: "10",
    maxNotional: "500000",
    pricePrecision: 2,
    sizePrecision: 4,
    updatedAt: "2026-08-05T21:30:00.000Z",
  },
  {
    id: "asset-xau-usd",
    symbol: "XAU/USD",
    baseAsset: "xau",
    quoteAsset: "usd",
    assetClass: "metal",
    availability: "tradable",
    status: "active",
    chainId: 1,
    tickSize: "0.01",
    lotSize: "0.001",
    minNotional: "10",
    maxNotional: "500000",
    pricePrecision: 2,
    sizePrecision: 4,
    updatedAt: "2026-08-06T07:15:00.000Z",
  },
  {
    id: "asset-eur-usd",
    symbol: "EUR/USD",
    baseAsset: "eur",
    quoteAsset: "usd",
    assetClass: "fiat",
    availability: "halted",
    status: "suspended",
    chainId: 1,
    tickSize: "0.0001",
    lotSize: "1",
    minNotional: "10",
    maxNotional: "500000",
    pricePrecision: 4,
    sizePrecision: 2,
    updatedAt: "2026-08-04T18:45:00.000Z",
  },
  {
    id: "asset-rwa-carbon",
    symbol: "CARBON/USD",
    baseAsset: "carbon",
    quoteAsset: "usd",
    assetClass: "rwa",
    availability: "view_only",
    status: "delisted",
    chainId: 1,
    tickSize: "0.01",
    lotSize: "1",
    minNotional: "10",
    maxNotional: "500000",
    pricePrecision: 2,
    sizePrecision: 2,
    updatedAt: "2026-07-28T06:00:00.000Z",
  },
];

const mockOrders: OrderDto[] = [
  {
    id: "ord-7001",
    referenceId: "ref-7001",
    idempotencyKey: "idem-7001",
    correlationId: "cor-7001",
    accountId: "acct-core-1",
    routeId: "route-1",
    side: "buy",
    type: "market",
    policyDecision: "ALLOW",
    reasonCodes: [],
    baseAsset: "btc",
    quoteAsset: "usd",
    size: "0.25",
    filledSize: "0.25",
    avgExecutionPrice: "63000.00",
    status: "filled",
    createdAt: "2026-08-05T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:07.000Z",
  },
  {
    id: "ord-7002",
    referenceId: "ref-7002",
    idempotencyKey: "idem-7002",
    correlationId: "cor-7002",
    accountId: "acct-core-1",
    routeId: "route-1",
    side: "sell",
    type: "market",
    policyDecision: "ALLOW",
    reasonCodes: [],
    baseAsset: "eth",
    quoteAsset: "usd",
    size: "1.40",
    filledSize: "0.70",
    avgExecutionPrice: "3342.85",
    status: "routed",
    createdAt: "2026-08-05T10:30:00.000Z",
    updatedAt: "2026-08-05T10:30:04.000Z",
  },
  {
    id: "ord-7003",
    referenceId: "ref-7003",
    idempotencyKey: "idem-7003",
    correlationId: "cor-7003",
    accountId: "acct-core-2",
    routeId: "route-2",
    side: "buy",
    type: "market",
    policyDecision: "REVIEW",
    reasonCodes: ["manual_review_required"],
    baseAsset: "sol",
    quoteAsset: "usd",
    size: "80",
    status: "created",
    createdAt: "2026-08-05T11:00:00.000Z",
    updatedAt: "2026-08-05T11:00:00.000Z",
  },
  {
    id: "ord-7004",
    referenceId: "ref-7004",
    idempotencyKey: "idem-7004",
    correlationId: "cor-7004",
    accountId: "acct-core-2",
    routeId: "route-2",
    side: "buy",
    type: "market",
    policyDecision: "ALLOW",
    reasonCodes: [],
    baseAsset: "xau",
    quoteAsset: "usd",
    size: "4",
    filledSize: "2",
    avgExecutionPrice: "2350.00",
    status: "partially_filled",
    createdAt: "2026-08-04T14:45:00.000Z",
    updatedAt: "2026-08-04T14:46:30.000Z",
  },
  {
    id: "ord-7005",
    referenceId: "ref-7005",
    idempotencyKey: "idem-7005",
    correlationId: "cor-7005",
    accountId: "acct-core-2",
    routeId: "route-2",
    side: "sell",
    type: "market",
    policyDecision: "DENY",
    reasonCodes: ["policy_denied"],
    baseAsset: "eur",
    quoteAsset: "usd",
    size: "10000",
    status: "canceled",
    createdAt: "2026-08-04T08:10:00.000Z",
    updatedAt: "2026-08-04T08:15:00.000Z",
  },
  {
    id: "ord-7006",
    referenceId: "ref-7006",
    idempotencyKey: "idem-7006",
    correlationId: "cor-7006",
    accountId: "acct-core-1",
    routeId: "route-1",
    side: "sell",
    type: "market",
    policyDecision: "ALLOW",
    reasonCodes: ["execution_dependency_failed"],
    baseAsset: "btc",
    quoteAsset: "usd",
    size: "0.10",
    status: "failed",
    createdAt: "2026-08-03T12:20:00.000Z",
    updatedAt: "2026-08-03T12:20:12.000Z",
  },
  {
    id: "ord-7007",
    referenceId: "ref-7007",
    idempotencyKey: "idem-7007",
    correlationId: "cor-7007",
    accountId: "acct-core-1",
    routeId: "route-1",
    side: "buy",
    type: "market",
    policyDecision: "ALLOW",
    reasonCodes: [],
    baseAsset: "eth",
    quoteAsset: "usd",
    size: "2.00",
    filledSize: "2.00",
    avgExecutionPrice: "3450.00",
    status: "settled",
    createdAt: "2026-08-02T16:00:00.000Z",
    updatedAt: "2026-08-02T16:00:45.000Z",
  },
  {
    id: "ord-7008",
    referenceId: "ref-7008",
    idempotencyKey: "idem-7008",
    correlationId: "cor-7008",
    accountId: "acct-core-3",
    routeId: "route-3",
    side: "buy",
    type: "market",
    policyDecision: "REVIEW",
    reasonCodes: ["manual_review_required"],
    baseAsset: "carbon",
    quoteAsset: "usd",
    size: "250",
    status: "expired",
    createdAt: "2026-08-01T09:30:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
];

const mockPositions: PositionDto[] = [
  {
    id: "pos-8001",
    accountId: "acct-core-1",
    asset: {
      canonicalId: "btc",
      symbol: "BTC",
      decimals: 8,
      chainId: 1,
      assetClass: "crypto",
    },
    state: "open",
    side: "long",
    quantity: "0.80",
    notionalQuoteAsset: "usd",
    notionalValue: "50568.00",
    netExposureBand: "high",
    riskFlags: [],
    updatedAt: "2026-08-06T10:05:00.000Z",
  },
  {
    id: "pos-8002",
    accountId: "acct-core-1",
    asset: {
      canonicalId: "eth",
      symbol: "ETH",
      decimals: 18,
      chainId: 1,
      assetClass: "crypto",
    },
    state: "reducing",
    side: "long",
    quantity: "7.00",
    notionalQuoteAsset: "usd",
    notionalValue: "23030.00",
    netExposureBand: "medium",
    riskFlags: ["size_limit_near"],
    updatedAt: "2026-08-06T10:03:00.000Z",
  },
  {
    id: "pos-8003",
    accountId: "acct-core-2",
    asset: {
      canonicalId: "eur",
      symbol: "EUR",
      decimals: 2,
      chainId: 1,
      assetClass: "fiat",
    },
    state: "suspended",
    side: "short",
    quantity: "12000",
    notionalQuoteAsset: "usd",
    notionalValue: "13128.00",
    netExposureBand: "medium",
    riskFlags: ["concentration_limit_breached", "volatility_halt"],
    updatedAt: "2026-08-06T09:48:00.000Z",
  },
  {
    id: "pos-8004",
    accountId: "acct-core-2",
    asset: {
      canonicalId: "xau",
      symbol: "XAU",
      decimals: 3,
      chainId: 1,
      assetClass: "metal",
    },
    state: "open",
    side: "long",
    quantity: "3",
    notionalQuoteAsset: "usd",
    notionalValue: "7080.00",
    netExposureBand: "low",
    riskFlags: [],
    updatedAt: "2026-08-06T09:15:00.000Z",
  },
  {
    id: "pos-8005",
    accountId: "acct-core-3",
    asset: {
      canonicalId: "sol",
      symbol: "SOL",
      decimals: 9,
      chainId: 1,
      assetClass: "crypto",
    },
    state: "closed",
    side: "flat",
    quantity: "0",
    notionalQuoteAsset: "usd",
    notionalValue: "0",
    netExposureBand: "flat",
    riskFlags: ["manual_review_required"],
    updatedAt: "2026-08-06T08:40:00.000Z",
  },
];

const mockInvoices: InvoiceDto[] = [
  {
    id: "inv-1001",
    invoiceNumber: "RIV-1001",
    customerName: "Atlas Trading",
    amountMinor: 150000,
    currency: "USD",
    status: "PAID",
    issuedAt: "2026-07-01T08:00:00.000Z",
    dueAt: "2026-07-07T08:00:00.000Z",
    paidAt: "2026-07-03T11:15:00.000Z",
    description: "Market liquidity services",
  },
  {
    id: "inv-1002",
    invoiceNumber: "RIV-1002",
    customerName: "Northern Cartography",
    amountMinor: 89000,
    currency: "USD",
    status: "PENDING",
    issuedAt: "2026-07-08T09:10:00.000Z",
    dueAt: "2026-07-15T09:10:00.000Z",
    description: "Subscription renewal",
  },
  {
    id: "inv-1003",
    invoiceNumber: "RIV-1003",
    customerName: "Seabright Capital",
    amountMinor: 124500,
    currency: "USD",
    status: "FAILED",
    issuedAt: "2026-07-10T14:00:00.000Z",
    dueAt: "2026-07-17T14:00:00.000Z",
    failedAt: "2026-07-17T16:35:00.000Z",
    description: "Settlement fee",
  },
  {
    id: "inv-1004",
    invoiceNumber: "RIV-1004",
    customerName: "Ion Freight",
    amountMinor: 76000,
    currency: "USD",
    status: "PENDING",
    issuedAt: "2026-07-20T10:20:00.000Z",
    dueAt: "2026-07-27T10:20:00.000Z",
    description: "Cross-border transfer handling",
  },
  {
    id: "inv-1005",
    invoiceNumber: "RIV-1005",
    customerName: "Blue Ridge Brokers",
    amountMinor: 198000,
    currency: "USD",
    status: "PAID",
    issuedAt: "2026-07-25T13:05:00.000Z",
    dueAt: "2026-08-01T13:05:00.000Z",
    paidAt: "2026-07-29T10:00:00.000Z",
    description: "Custody fee",
  },
  {
    id: "inv-1006",
    invoiceNumber: "RIV-1006",
    customerName: "Twin Pine Logistics",
    amountMinor: 61500,
    currency: "USD",
    status: "DRAFT",
    issuedAt: "2026-08-01T12:00:00.000Z",
    dueAt: "2026-08-10T12:00:00.000Z",
    description: "Draft invoice for review",
  },
];

const mockPayouts: PayoutDto[] = [
  {
    id: "po-2001",
    amountMinor: 50000,
    currency: "USD",
    status: "SCHEDULED",
    destinationType: "BANK_ACCOUNT",
    destinationLabel: "Atlas Treasury ••••9981",
    createdAt: "2026-07-05T08:00:00.000Z",
    scheduledFor: "2026-07-06T08:00:00.000Z",
  },
  {
    id: "po-2002",
    amountMinor: 31000,
    currency: "USD",
    status: "PROCESSING",
    destinationType: "WALLET",
    destinationLabel: "Ops Wallet 0x7A...03A",
    createdAt: "2026-07-12T10:00:00.000Z",
    scheduledFor: "2026-07-12T13:00:00.000Z",
  },
  {
    id: "po-2003",
    amountMinor: 76000,
    currency: "USD",
    status: "COMPLETED",
    destinationType: "BANK_ACCOUNT",
    destinationLabel: "Northwind Custody ••••1021",
    createdAt: "2026-07-15T15:30:00.000Z",
    completedAt: "2026-07-16T09:10:00.000Z",
  },
  {
    id: "po-2004",
    amountMinor: 28000,
    currency: "USD",
    status: "FAILED",
    destinationType: "CARD",
    destinationLabel: "Card ending 5542",
    createdAt: "2026-07-20T07:30:00.000Z",
    failureReason: "Beneficiary verification required",
  },
  {
    id: "po-2005",
    amountMinor: 140000,
    currency: "USD",
    status: "PROCESSING",
    destinationType: "BANK_ACCOUNT",
    destinationLabel: "Operations Float ••••9005",
    createdAt: "2026-07-28T09:05:00.000Z",
    scheduledFor: "2026-07-28T10:00:00.000Z",
  },
];

const mockReconciliationItems: ReconciliationItemDto[] = [
  {
    id: "rec-3001",
    runId: "run-2026-07-31-a",
    entityType: "INVOICE",
    entityId: "inv-1001",
    status: "MATCHED",
    expectedAmountMinor: 150000,
    actualAmountMinor: 150000,
    deltaMinor: 0,
    currency: "USD",
    createdAt: "2026-07-31T04:00:00.000Z",
    updatedAt: "2026-07-31T04:10:00.000Z",
  },
  {
    id: "rec-3002",
    runId: "run-2026-07-31-a",
    entityType: "PAYOUT",
    entityId: "po-2002",
    status: "MISMATCH",
    expectedAmountMinor: 31000,
    actualAmountMinor: 30500,
    deltaMinor: -500,
    currency: "USD",
    createdAt: "2026-07-31T04:05:00.000Z",
    updatedAt: "2026-07-31T04:12:00.000Z",
    exceptionCode: "amount_delta",
    exceptionMessage: "Processor settlement lower than expected",
  },
  {
    id: "rec-3003",
    runId: "run-2026-08-01-a",
    entityType: "PAYOUT",
    entityId: "po-2004",
    status: "FAILED",
    expectedAmountMinor: 28000,
    actualAmountMinor: 0,
    deltaMinor: -28000,
    currency: "USD",
    createdAt: "2026-08-01T04:02:00.000Z",
    updatedAt: "2026-08-01T04:13:00.000Z",
    exceptionCode: "missing_transfer",
    exceptionMessage: "No settlement found for failed payout",
  },
  {
    id: "rec-3004",
    runId: "run-2026-08-01-a",
    entityType: "INVOICE",
    entityId: "inv-1002",
    status: "RUNNING",
    expectedAmountMinor: 89000,
    actualAmountMinor: 0,
    deltaMinor: -89000,
    currency: "USD",
    createdAt: "2026-08-01T04:03:00.000Z",
    updatedAt: "2026-08-01T04:13:00.000Z",
  },
  {
    id: "rec-3005",
    runId: "run-2026-08-02-a",
    entityType: "PAYOUT",
    entityId: "po-2005",
    status: "QUEUED",
    expectedAmountMinor: 140000,
    actualAmountMinor: 0,
    deltaMinor: -140000,
    currency: "USD",
    createdAt: "2026-08-02T03:59:00.000Z",
    updatedAt: "2026-08-02T04:00:00.000Z",
  },
];

const mockSubscriptions: SubscriptionDto[] = [
  { id: "sub-1", customerId: "cust-1", status: "ACTIVE", renewalAt: "2026-12-01T00:00:00Z" },
];

const paymentIntentStateSet = new Set(payCanonicalPaymentIntentStates);

const mockPaymentIntents = new Map<string, PaymentIntent>([
  [
    "pi-4001",
    {
      intent_id: "pi-4001",
      reference_id: "ref-4001",
      idempotency_key: "idem-4001",
      kind: "payout",
      sourceAccountId: "acct-treasury",
      destinationAccountId: "acct-vendor",
      asset: {
        chain: "eip155:1",
        asset: "usd_stable",
        decimals: 2,
      },
      assetId: "usd_stable",
      amount: "250.00",
      reason_code: "PAYMENT_PAYOUT_OK",
      state: "created",
      created_at: "2026-08-01T00:00:00.000Z",
    },
  ],
]);

type PaymentExecutionShape = NonNullable<PaymentIntent["execution"]>;

function success<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function parseRequestPath(path: string): { pathname: string; searchParams: URLSearchParams } {
  const url = new URL(path, "http://mock.local");
  return { pathname: url.pathname, searchParams: url.searchParams };
}

function normalizeDateInput(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function toBoundaryTimestamp(value: string | undefined, bound: "start" | "end"): number | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue =
    value.length === 10
      ? `${value}${bound === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z"}`
      : value;

  const parsed = Date.parse(normalizedValue);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function inDateRange(value: string, from: string | undefined, to: string | undefined): boolean {
  const valueTimestamp = Date.parse(value);
  if (Number.isNaN(valueTimestamp)) {
    return false;
  }

  const startTimestamp = toBoundaryTimestamp(from, "start");
  if (typeof startTimestamp === "number" && valueTimestamp < startTimestamp) {
    return false;
  }

  const endTimestamp = toBoundaryTimestamp(to, "end");
  if (typeof endTimestamp === "number" && valueTimestamp > endTimestamp) {
    return false;
  }

  return true;
}

function sortRows<T>(items: T[], field: keyof T, direction: "asc" | "desc"): T[] {
  return [...items].sort((left, right) => {
    const leftValue = left[field];
    const rightValue = right[field];

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
    }

    const leftText = String(leftValue ?? "");
    const rightText = String(rightValue ?? "");

    if (leftText < rightText) {
      return direction === "asc" ? -1 : 1;
    }

    if (leftText > rightText) {
      return direction === "asc" ? 1 : -1;
    }

    return 0;
  });
}

function parseSortField<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (value && allowed.includes(value as T)) {
    return value as T;
  }

  return fallback;
}

function getParam(searchParams: URLSearchParams, key: string, legacyKey?: string): string | null {
  const primary = searchParams.get(key);
  if (primary !== null) {
    return primary;
  }

  return legacyKey ? searchParams.get(legacyKey) : null;
}

function paginate<T>(items: T[], pageValue: string | null, pageSizeValue: string | null): PayListResponse<T> {
  const parsedPage = Number.parseInt(pageValue ?? "1", 10);
  const parsedPageSize = Number.parseInt(pageSizeValue ?? "20", 10);
  const pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? parsedPageSize : 20;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, totalPages) : 1;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

function buildInvoiceSummary(items: InvoiceDto[]): InvoiceSummaryDto {
  return {
    totalCount: items.length,
    paidCount: items.filter((item) => item.status === "PAID").length,
    pendingCount: items.filter((item) => item.status === "PENDING").length,
    failedCount: items.filter((item) => item.status === "FAILED").length,
    totalAmountMinor: items.reduce((sum, item) => sum + item.amountMinor, 0),
    currency: items[0]?.currency ?? "USD",
  };
}

function buildPayoutSummary(items: PayoutDto[]): PayoutSummaryDto {
  return {
    scheduledCount: items.filter((item) => item.status === "SCHEDULED").length,
    processingCount: items.filter((item) => item.status === "PROCESSING").length,
    completedCount: items.filter((item) => item.status === "COMPLETED").length,
    failedCount: items.filter((item) => item.status === "FAILED").length,
    totalAmountMinor: items.reduce((sum, item) => sum + item.amountMinor, 0),
    currency: items[0]?.currency ?? "USD",
  };
}

function buildReconciliationSummary(items: ReconciliationItemDto[]): ReconciliationSummaryDto {
  const latestItem = [...items].sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1))[0];

  return {
    runCount: new Set(items.map((item) => item.runId)).size,
    matchedCount: items.filter((item) => item.status === "MATCHED").length,
    mismatchCount: items.filter((item) => item.status === "MISMATCH").length,
    failedCount: items.filter((item) => item.status === "FAILED").length,
    exceptionCount: items.filter((item) => Boolean(item.exceptionCode)).length,
    lastRunStatus: latestItem?.status ?? "QUEUED",
    lastRunAt: latestItem?.updatedAt ?? "1970-01-01T00:00:00.000Z",
  };
}

function buildOverview(): PayOverviewDto {
  const invoicePending = mockInvoices.filter((item) => item.status === "PENDING");
  const payoutProcessing = mockPayouts.filter((item) => item.status === "PROCESSING");
  const reconMismatches = mockReconciliationItems.filter((item) => item.status === "MISMATCH");

  const activity: PayActivityItemDto[] = [
    ...mockInvoices.map((item) => ({
      id: `activity-invoice-${item.id}`,
      type: "invoice" as const,
      title: `${item.invoiceNumber} • ${item.customerName}`,
      status: item.status,
      createdAt: item.issuedAt,
      amountMinor: item.amountMinor,
      currency: item.currency,
    })),
    ...mockPayouts.map((item) => ({
      id: `activity-payout-${item.id}`,
      type: "payout" as const,
      title: `${item.id} • ${item.destinationLabel}`,
      status: item.status,
      createdAt: item.createdAt,
      amountMinor: item.amountMinor,
      currency: item.currency,
    })),
    ...mockReconciliationItems.map((item) => ({
      id: `activity-recon-${item.id}`,
      type: "reconciliation" as const,
      title: `${item.runId} • ${item.entityType} ${item.entityId}`,
      status: item.status,
      createdAt: item.updatedAt,
      amountMinor: item.actualAmountMinor,
      currency: item.currency,
    })),
  ]
    .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))
    .slice(0, 10);

  return {
    metrics: {
      openInvoiceCount: invoicePending.length,
      pendingInvoiceAmountMinor: invoicePending.reduce((sum, item) => sum + item.amountMinor, 0),
      payoutInFlightCount: mockPayouts.filter((item) => item.status === "PROCESSING" || item.status === "SCHEDULED").length,
      payoutProcessingAmountMinor: payoutProcessing.reduce((sum, item) => sum + item.amountMinor, 0),
      reconciliationMismatchCount: reconMismatches.length,
      currency: "USD",
    },
    recentActivity: activity,
  };
}

function buildInstrumentSummary(items: InstrumentDto[]): InstrumentSummaryDto {
  const byAssetClass: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byAvailability: Record<string, number> = {};

  for (const item of items) {
    byAssetClass[item.assetClass] = (byAssetClass[item.assetClass] ?? 0) + 1;
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    byAvailability[item.availability] = (byAvailability[item.availability] ?? 0) + 1;
  }

  return {
    asOf: new Date().toISOString(),
    totalInstruments: items.length,
    tradableInstruments: items.filter((item) => item.availability === "tradable").length,
    haltedInstruments: items.filter((item) => item.availability === "halted").length,
    byAssetClass,
    byStatus,
    byAvailability,
  };
}

function buildOrderSummary(items: OrderDto[], accountId: string): OrderSummaryDto {
  const byStatus: Record<string, number> = {};
  const bySide: Record<string, number> = {};

  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    bySide[item.side] = (bySide[item.side] ?? 0) + 1;
  }

  const openOrders = items.filter((item) =>
    item.status === "created" ||
    item.status === "validated" ||
    item.status === "routed" ||
    item.status === "partially_filled"
  ).length;

  return {
    asOf: new Date().toISOString(),
    accountId,
    totalOrders: items.length,
    openOrders,
    terminalOrders: items.length - openOrders,
    reviewRequiredOrders: items.filter((item) => item.policyDecision === "REVIEW").length,
    blockedOrders: items.filter((item) => item.policyDecision === "DENY").length,
    byStatus,
    bySide,
  };
}

function resolveNetExposureBand(netExposureValue: number): PositionSummaryDto["netExposureBand"] {
  const absoluteExposure = Math.abs(netExposureValue);

  if (absoluteExposure === 0) {
    return "flat";
  }

  if (absoluteExposure < 5_000) {
    return "low";
  }

  if (absoluteExposure < 25_000) {
    return "medium";
  }

  if (absoluteExposure < 100_000) {
    return "high";
  }

  return "critical";
}

function computeNetExposureValue(positions: PositionDto[]): number {
  return positions.reduce((sum, position) => {
    const parsed = Number.parseFloat(position.notionalValue);
    if (Number.isNaN(parsed)) {
      return sum;
    }

    if (position.side === "short") {
      return sum - parsed;
    }

    if (position.side === "flat") {
      return sum;
    }

    return sum + parsed;
  }, 0);
}

function countBy<T extends string>(entries: readonly T[]): Record<string, number> {
  const result: Record<string, number> = {};

  for (const entry of entries) {
    result[entry] = (result[entry] ?? 0) + 1;
  }

  return result;
}

function buildPositionSummary(items: PositionDto[], accountId: string): PositionSummaryDto {
  const netExposureValue = computeNetExposureValue(items);
  const riskFlags = new Set<string>();
  for (const item of items) {
    for (const riskFlag of item.riskFlags) {
      riskFlags.add(riskFlag);
    }
  }

  return {
    asOf: new Date().toISOString(),
    accountId,
    totalPositions: items.length,
    openPositions: items.filter((item) => item.state === "open" || item.state === "reducing").length,
    byState: countBy(items.map((item) => item.state)),
    bySide: countBy(items.map((item) => item.side)),
    netExposureQuoteAsset: "usd",
    netExposureValue: netExposureValue.toFixed(2),
    netExposureBand: resolveNetExposureBand(netExposureValue),
    riskFlags: Array.from(riskFlags) as PositionSummaryDto["riskFlags"],
  };
}

function buildMarketsOverview(accountId: string): MarketsOverviewDto {
  const scopedOrders = mockOrders.filter((item) => item.accountId === accountId);
  const scopedPositions = mockPositions.filter((item) => item.accountId === accountId);
  const orderSummary = buildOrderSummary(scopedOrders, accountId);
  const positionSummary = buildPositionSummary(scopedPositions, accountId);

  return {
    asOf: new Date().toISOString(),
    apiVersion: "MARKETS_API_VERSION=2026-08-08",
    accountId,
    healthStatus: "pass",
    instruments: buildInstrumentSummary(mockInstruments),
    orders: orderSummary,
    positions: positionSummary,
  };
}

function parseLegacyPage(searchParams: URLSearchParams): number | undefined {
  const rawPage = searchParams.get("page");
  if (!rawPage) {
    return undefined;
  }

  const parsed = Number.parseInt(rawPage, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function parseCursorOffset(cursor: string | null): number {
  if (!cursor) {
    return 0;
  }

  if (cursor.startsWith("mk_")) {
    const encoded = cursor.slice(3);
    try {
      const decoded = Buffer.from(encoded, "base64url").toString("utf8");
      const parsed = Number.parseInt(decoded, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  return 0;
}

function encodeCursorOffset(offset: number): string {
  return `mk_${Buffer.from(String(offset), "utf8").toString("base64url")}`;
}

function paginateMarkets<T>(items: T[], searchParams: URLSearchParams): MarketsListResponse<T> {
  const parsedLimit = Number.parseInt(
    getParam(searchParams, "limit", "page_size") ?? searchParams.get("pageSize") ?? "50",
    10,
  );
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 200) : 50;
  const cursor = searchParams.get("cursor");
  const deprecatedPage = !cursor ? parseLegacyPage(searchParams) : undefined;
  const startOffset = cursor ? parseCursorOffset(cursor) : ((deprecatedPage ?? 1) - 1) * limit;
  const boundedOffset = Math.max(0, Math.min(startOffset, items.length));
  const end = boundedOffset + limit;
  const hasMore = end < items.length;

  return {
    asOf: new Date().toISOString(),
    items: items.slice(boundedOffset, end),
    pagination: {
      limit,
      hasMore,
      ...(hasMore ? { nextCursor: encodeCursorOffset(end) } : {}),
      ...(typeof deprecatedPage === "number" ? { page: deprecatedPage } : {}),
    },
  };
}

function filterInstruments(searchParams: URLSearchParams): InstrumentDto[] {
  const statusFilter = searchParams.get("status")?.trim().toLowerCase();
  const assetClassFilter = getParam(searchParams, "asset_class", "assetClass")?.trim().toLowerCase();
  const availabilityFilter = searchParams.get("availability")?.trim().toLowerCase();
  const chainIdFilter = Number.parseInt(searchParams.get("chain_id") ?? "", 10);
  const searchFilter = (searchParams.get("q") ?? searchParams.get("search"))?.trim().toLowerCase();

  return mockInstruments.filter((item) => {
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    if (assetClassFilter && item.assetClass !== assetClassFilter) {
      return false;
    }

    if (availabilityFilter && item.availability !== availabilityFilter) {
      return false;
    }

    if (Number.isFinite(chainIdFilter) && chainIdFilter > 0 && item.chainId !== chainIdFilter) {
      return false;
    }

    if (searchFilter) {
      const searchTarget = `${item.id} ${item.symbol} ${item.baseAsset} ${item.quoteAsset} ${item.assetClass}`.toLowerCase();
      if (!searchTarget.includes(searchFilter)) {
        return false;
      }
    }

    return true;
  });
}

function listInstruments(searchParams: URLSearchParams): MarketsListResponse<InstrumentDto> {
  const sortBy = getParam(searchParams, "sort_by", "sortField");
  const normalizedSortBy =
    sortBy === "updated_at" ? "updatedAt" : sortBy === "asset_class" ? "assetClass" : sortBy;
  const sortField = parseSortField(
    normalizedSortBy,
    ["updatedAt", "symbol", "assetClass"],
    "updatedAt",
  );
  const sortDirection = getParam(searchParams, "sort_order", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterInstruments(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginateMarkets(sorted, searchParams);
}

function filterOrders(searchParams: URLSearchParams, accountId: string): OrderDto[] {
  const referenceIdFilter = (searchParams.get("reference_id") ?? searchParams.get("search"))?.trim().toLowerCase();
  const correlationIdFilter = searchParams.get("correlation_id")?.trim().toLowerCase();
  const routeIdFilter = searchParams.get("route_id")?.trim().toLowerCase();
  const statusFilter = searchParams.get("status")?.trim().toLowerCase();
  const sideFilter = searchParams.get("side")?.trim().toLowerCase();
  const typeFilter = searchParams.get("type")?.trim().toLowerCase();
  const policyDecisionFilter = searchParams.get("policy_decision")?.trim().toUpperCase();
  const from = normalizeDateInput(searchParams.get("created_after") ?? searchParams.get("from"));
  const to = normalizeDateInput(searchParams.get("created_before") ?? searchParams.get("to"));

  return mockOrders.filter((item) => {
    if (item.accountId !== accountId) {
      return false;
    }

    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    if (sideFilter && item.side !== sideFilter) {
      return false;
    }

    if (typeFilter && item.type !== typeFilter) {
      return false;
    }

    if (policyDecisionFilter && item.policyDecision !== policyDecisionFilter) {
      return false;
    }

    if (referenceIdFilter && !item.referenceId.toLowerCase().includes(referenceIdFilter)) {
      return false;
    }

    if (correlationIdFilter && !item.correlationId.toLowerCase().includes(correlationIdFilter)) {
      return false;
    }

    if (routeIdFilter && (item.routeId ?? "").toLowerCase() !== routeIdFilter) {
      return false;
    }

    return inDateRange(item.createdAt, from, to);
  });
}

function listOrders(searchParams: URLSearchParams, accountId: string): MarketsListResponse<OrderDto> {
  const sortBy = getParam(searchParams, "sort_by", "sortField");
  const normalizedSortBy =
    sortBy === "updated_at" ? "updatedAt" : sortBy === "created_at" ? "createdAt" : sortBy;
  const sortField = parseSortField(
    normalizedSortBy,
    ["updatedAt", "createdAt", "status"],
    "updatedAt",
  );
  const sortDirection = getParam(searchParams, "sort_order", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterOrders(searchParams, accountId);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginateMarkets(sorted, searchParams);
}

function filterPositions(searchParams: URLSearchParams, accountId: string): PositionDto[] {
  const assetClassFilter = getParam(searchParams, "asset_class", "assetClass")?.trim().toLowerCase();
  const stateFilter = (searchParams.get("state") ?? getParam(searchParams, "risk_state", "riskState"))?.trim().toLowerCase();
  const sideFilter = searchParams.get("side")?.trim().toLowerCase();
  const riskFlagFilter = searchParams
    .get("risk_flag")
    ?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return mockPositions.filter((item) => {
    if (item.accountId !== accountId) {
      return false;
    }

    if (assetClassFilter && item.asset.assetClass !== assetClassFilter) {
      return false;
    }

    if (sideFilter && item.side !== sideFilter) {
      return false;
    }

    if (stateFilter && item.state !== stateFilter) {
      return false;
    }

    if (riskFlagFilter && riskFlagFilter.length > 0 && !riskFlagFilter.every((entry) => item.riskFlags.includes(entry as PositionDto["riskFlags"][number]))) {
      return false;
    }

    return true;
  });
}

function listMarketsPositions(searchParams: URLSearchParams, accountId: string): MarketsListResponse<PositionDto> {
  const sortBy = getParam(searchParams, "sort_by", "sortField");
  const normalizedSortBy =
    sortBy === "updated_at" ? "updatedAt" : sortBy === "notional_value" ? "notionalValue" : sortBy;
  const sortField = parseSortField(
    normalizedSortBy,
    ["updatedAt", "notionalValue", "quantity"],
    "updatedAt",
  );
  const sortDirection = getParam(searchParams, "sort_order", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterPositions(searchParams, accountId);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginateMarkets(sorted, searchParams);
}

function filterInvoices(searchParams: URLSearchParams): InvoiceDto[] {
  const statusFilter = searchParams.get("status")?.toUpperCase();
  const searchFilter = searchParams.get("search")?.trim().toLowerCase();
  const from = normalizeDateInput(searchParams.get("from"));
  const to = normalizeDateInput(searchParams.get("to"));

  return mockInvoices.filter((item) => {
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    if (searchFilter) {
      const searchTarget = `${item.id} ${item.invoiceNumber} ${item.customerName} ${item.description ?? ""}`.toLowerCase();
      if (!searchTarget.includes(searchFilter)) {
        return false;
      }
    }

    return inDateRange(item.issuedAt, from, to);
  });
}

function listInvoices(searchParams: URLSearchParams): PayListResponse<InvoiceDto> {
  const sortField = parseSortField(getParam(searchParams, "sort_field", "sortField"), ["issuedAt", "dueAt", "amountMinor", "status"], "issuedAt");
  const sortDirection = getParam(searchParams, "sort_direction", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterInvoices(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), getParam(searchParams, "page_size", "pageSize"));
}

function filterPayouts(searchParams: URLSearchParams): PayoutDto[] {
  const statusFilter = searchParams.get("status")?.toUpperCase();
  const destinationType = getParam(searchParams, "destination_type", "destinationType")?.toUpperCase();
  const from = normalizeDateInput(searchParams.get("from"));
  const to = normalizeDateInput(searchParams.get("to"));

  return mockPayouts.filter((item) => {
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    if (destinationType && item.destinationType !== destinationType) {
      return false;
    }

    return inDateRange(item.createdAt, from, to);
  });
}

function listPayouts(searchParams: URLSearchParams): PayListResponse<PayoutDto> {
  const sortField = parseSortField(getParam(searchParams, "sort_field", "sortField"), ["createdAt", "amountMinor", "status"], "createdAt");
  const sortDirection = getParam(searchParams, "sort_direction", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterPayouts(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), getParam(searchParams, "page_size", "pageSize"));
}

function filterReconciliation(searchParams: URLSearchParams): ReconciliationItemDto[] {
  const statusFilter = searchParams.get("status")?.toUpperCase();
  const exceptionOnly = getParam(searchParams, "exception_only", "exceptionOnly") === "true";
  const from = normalizeDateInput(searchParams.get("from"));
  const to = normalizeDateInput(searchParams.get("to"));

  return mockReconciliationItems.filter((item) => {
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    if (exceptionOnly && !item.exceptionCode) {
      return false;
    }

    return inDateRange(item.updatedAt, from, to);
  });
}

function listReconciliation(searchParams: URLSearchParams): PayListResponse<ReconciliationItemDto> {
  const sortField = parseSortField(getParam(searchParams, "sort_field", "sortField"), ["updatedAt", "deltaMinor", "status"], "updatedAt");
  const sortDirection = getParam(searchParams, "sort_direction", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterReconciliation(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), getParam(searchParams, "page_size", "pageSize"));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function toMockPaymentIntent(payload: unknown): PaymentIntent | null {
  if (!isObject(payload)) {
    return null;
  }

  const state = ensureString(payload.state) ?? "created";
  if (!paymentIntentStateSet.has(state as PaymentIntent["state"])) {
    return null;
  }

  const intentId = ensureString(payload.intent_id) ?? `pi-${Date.now()}`;
  const referenceId = ensureString(payload.reference_id) ?? `ref-${intentId}`;
  const idempotencyKey = ensureString(payload.idempotency_key) ?? `idem-${intentId}`;
  const reasonCodes = Array.isArray(payload.reason_codes)
    ? payload.reason_codes.filter((entry): entry is string => typeof entry === "string")
    : undefined;
  const userOpHash = ensureString(payload.user_op_hash);
  const execution = isObject(payload.execution)
    ? (() => {
        const mode = (ensureString(payload.execution.mode) ?? "legacy") as PaymentExecutionShape["mode"];
        const smartAccountId = ensureString(payload.execution.smart_account_id);
        const entryPoint = ensureString(payload.execution.entry_point);
        const sponsorshipMode = ensureString(payload.execution.sponsorship_mode) as PaymentExecutionShape["sponsorship_mode"] | undefined;
        const sponsorAccountId = ensureString(payload.execution.sponsor_account_id);
        const sponsorChain = ensureString(payload.execution.sponsor_chain);
        const sponsorAsset = ensureString(payload.execution.sponsor_asset);
        const allowLegacyFallback =
          typeof payload.execution.allow_legacy_fallback === "boolean" ? payload.execution.allow_legacy_fallback : undefined;

        return {
          mode,
          ...(smartAccountId ? { smart_account_id: smartAccountId } : {}),
          ...(entryPoint ? { entry_point: entryPoint } : {}),
          ...(sponsorshipMode ? { sponsorship_mode: sponsorshipMode } : {}),
          ...(sponsorAccountId ? { sponsor_account_id: sponsorAccountId } : {}),
          ...(sponsorChain ? { sponsor_chain: sponsorChain } : {}),
          ...(sponsorAsset ? { sponsor_asset: sponsorAsset } : {}),
          ...(typeof allowLegacyFallback === "boolean" ? { allow_legacy_fallback: allowLegacyFallback } : {}),
        } as PaymentExecutionShape;
      })()
    : undefined;
  const metadata = isObject(payload.metadata)
    ? Object.fromEntries(
        Object.entries(payload.metadata).map(([key, value]) => [key, typeof value === "string" ? value : String(value)]),
      )
    : undefined;

  return {
    intent_id: intentId,
    reference_id: referenceId,
    idempotency_key: idempotencyKey,
    kind: (ensureString(payload.kind) ?? "payout") as PaymentIntent["kind"],
    sourceAccountId: ensureString(payload.sourceAccountId) ?? "acct-source",
    destinationAccountId: ensureString(payload.destinationAccountId) ?? "acct-destination",
    asset: {
      chain: ensureString((payload.asset as Record<string, unknown> | undefined)?.chain) ?? "eip155:1",
      asset: ensureString((payload.asset as Record<string, unknown> | undefined)?.asset) ?? "usd_stable",
      decimals: Number((payload.asset as Record<string, unknown> | undefined)?.decimals ?? 2),
    },
    assetId: ensureString(payload.assetId) ?? "usd_stable",
    amount: ensureString(payload.amount) ?? "0",
    reason_code: ensureString(payload.reason_code) ?? "PAYMENT_PAYOUT_OK",
    ...(reasonCodes ? { reason_codes: reasonCodes } : {}),
    ...(userOpHash ? { user_op_hash: userOpHash } : {}),
    ...(execution ? { execution } : {}),
    ...(metadata ? { metadata } : {}),
    state: state as PaymentIntent["state"],
    created_at: ensureString(payload.created_at) ?? new Date().toISOString(),
  };
}

function toSettlementSnapshot(payload: unknown): SettlementSnapshot | null {
  if (!isObject(payload) || !isObject(payload.asset)) {
    return null;
  }

  const state = ensureString(payload.state);
  if (!state || !["pending", "settled", "failed"].includes(state)) {
    return null;
  }

  return {
    reference_id: ensureString(payload.reference_id) ?? "unknown-reference",
    state: state as SettlementSnapshot["state"],
    amount: ensureString(payload.amount) ?? "0",
    asset: {
      chain: ensureString(payload.asset.chain) ?? "eip155:1",
      asset: ensureString(payload.asset.asset) ?? "usd_stable",
      decimals: Number(payload.asset.decimals ?? 2),
    },
    observed_at: ensureString(payload.observed_at) ?? new Date().toISOString(),
  };
}

function reconcileIntentSettlement(intent: PaymentIntent, settlement: SettlementSnapshot): ReconciliationResult {
  if (intent.reference_id !== settlement.reference_id) {
    return { status: "mismatch", reason_code: "RECON_REFERENCE_MISMATCH" };
  }

  if (settlement.state === "pending") {
    return { status: "pending", reason_code: "SETTLEMENT_PENDING" };
  }

  const amountMatches = intent.amount.trim() === settlement.amount.trim();
  const assetMatches =
    intent.asset.chain === settlement.asset.chain &&
    intent.asset.asset === settlement.asset.asset &&
    intent.asset.decimals === settlement.asset.decimals;

  if (amountMatches && assetMatches) {
    return { status: "matched", reason_code: "RECON_MATCHED" };
  }

  return {
    status: "mismatch",
    reason_code: amountMatches ? "RECON_ASSET_MISMATCH" : "RECON_AMOUNT_MISMATCH",
  };
}

function errorNotFound<T>(request: ApiRequest): ApiResult<T> {
  return {
    ok: false,
    error: {
      status: 404,
      code: "mock_not_found",
      message: `No mock route for ${request.method} ${request.path}`,
      retryable: false,
      source: "mock",
    },
  };
}

function errorBadRequest<T>(code: string, message: string, details?: unknown): ApiResult<T> {
  return {
    ok: false,
    error: {
      status: 400,
      code,
      message,
      retryable: false,
      source: "mock",
      ...(typeof details === "undefined" ? {} : { details }),
    },
  };
}

function getRequiredAccountId(searchParams: URLSearchParams): string {
  const accountId = searchParams.get("account_id")?.trim();
  return accountId && accountId.length > 0 ? accountId : "acct-core-1";
}

export function createMockTransport(): Transport {
  return {
    async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
      const { pathname, searchParams } = parseRequestPath(request.path);

      if (request.method === "GET" && pathname === "/markets/instruments") {
        return success(listInstruments(searchParams) as T);
      }

      if (request.method === "GET" && pathname === "/markets/positions") {
        const accountId = getRequiredAccountId(searchParams);
        return success(listMarketsPositions(searchParams, accountId) as T);
      }

      if (request.method === "GET" && pathname === "/markets/instruments/summary") {
        return success(buildInstrumentSummary(filterInstruments(searchParams)) as T);
      }

      if (request.method === "GET" && pathname === "/markets/orders") {
        const accountId = getRequiredAccountId(searchParams);
        return success(listOrders(searchParams, accountId) as T);
      }

      if (request.method === "GET" && pathname === "/markets/orders/summary") {
        const accountId = getRequiredAccountId(searchParams);
        return success(buildOrderSummary(filterOrders(searchParams, accountId), accountId) as T);
      }

      if (request.method === "GET" && pathname === "/markets/positions/summary") {
        const accountId = getRequiredAccountId(searchParams);
        return success(buildPositionSummary(filterPositions(searchParams, accountId), accountId) as T);
      }

      if (request.method === "GET" && pathname === "/markets/overview") {
        const accountId = getRequiredAccountId(searchParams);
        return success(buildMarketsOverview(accountId) as T);
      }

      if (request.method === "GET" && pathname === "/health") {
        return success(
          {
            status: "pass",
            service: "markets",
            api_version: "MARKETS_API_VERSION=2026-08-08",
            timestamp: new Date().toISOString(),
            checks: [
              {
                name: "mock-transport",
                status: "pass",
                latency_ms: 1,
              },
            ],
          } as T,
        );
      }

      if (request.method === "POST" && pathname === "/pay/intents") {
        const intent = toMockPaymentIntent(request.body);
        if (!intent) {
          return errorBadRequest<T>("mock_invalid_intent_payload", "Invalid payment intent payload", request.body);
        }

        mockPaymentIntents.set(intent.intent_id, intent);
        return success(intent as T);
      }

      const transitionMatch = pathname.match(/^\/pay\/intents\/([^/]+)\/transitions$/u);
      if (request.method === "POST" && transitionMatch) {
        const intentId = decodeURIComponent(transitionMatch[1] ?? "");
        const existing = mockPaymentIntents.get(intentId);
        if (!existing) {
          return {
            ok: false,
            error: {
              status: 404,
              code: "mock_intent_not_found",
              message: `No mock payment intent for ${intentId}`,
              retryable: false,
              source: "mock",
            },
          };
        }

        const body = isObject(request.body) ? request.body : undefined;
        const toState = ensureString(body?.to_state);
        if (!toState || !paymentIntentStateSet.has(toState as PaymentIntent["state"])) {
          return errorBadRequest<T>(
            "mock_invalid_intent_state",
            "to_state must match canonical payment intent states",
            request.body,
          );
        }

        const transitionedReasonCodes = Array.isArray(body?.reason_codes)
          ? body.reason_codes.filter((entry): entry is string => typeof entry === "string")
          : existing.reason_codes;
        const transitioned: PaymentIntent = {
          ...existing,
          state: toState as PaymentIntent["state"],
          reason_code: ensureString(body?.reason_code) ?? existing.reason_code,
          ...(transitionedReasonCodes ? { reason_codes: transitionedReasonCodes } : {}),
        };
        mockPaymentIntents.set(intentId, transitioned);
        return success(transitioned as T);
      }

      const reconciliationMatch = pathname.match(/^\/pay\/reconciliation\/intents\/([^/]+)$/u);
      if (request.method === "POST" && reconciliationMatch) {
        const intentId = decodeURIComponent(reconciliationMatch[1] ?? "");
        const body = isObject(request.body) ? request.body : undefined;
        const intentFromBody = toMockPaymentIntent(body?.intent);
        const intent = intentFromBody ?? mockPaymentIntents.get(intentId);

        if (!intent) {
          return {
            ok: false,
            error: {
              status: 404,
              code: "mock_intent_not_found",
              message: `No mock payment intent for ${intentId}`,
              retryable: false,
              source: "mock",
            },
          };
        }

        const settlement = toSettlementSnapshot(body?.settlement);
        if (!settlement) {
          return errorBadRequest<T>(
            "mock_invalid_settlement_payload",
            "Settlement payload must include canonical settlement fields",
            body?.settlement,
          );
        }

        return success(reconcileIntentSettlement(intent, settlement) as T);
      }
      if (request.method === "GET" && pathname === "/pay/invoices") {
        return success(listInvoices(searchParams) as T);
      }

      if (request.method === "GET" && pathname === "/pay/invoices/summary") {
        return success(buildInvoiceSummary(filterInvoices(searchParams)) as T);
      }

      if (request.method === "GET" && pathname === "/pay/payouts") {
        return success(listPayouts(searchParams) as T);
      }

      if (request.method === "GET" && pathname === "/pay/payouts/summary") {
        return success(buildPayoutSummary(filterPayouts(searchParams)) as T);
      }

      if (request.method === "GET" && pathname === "/pay/reconciliation/items") {
        return success(listReconciliation(searchParams) as T);
      }

      if (request.method === "GET" && pathname === "/pay/reconciliation/summary") {
        return success(buildReconciliationSummary(filterReconciliation(searchParams)) as T);
      }

      if (request.method === "GET" && pathname === "/pay/overview") {
        return success(buildOverview() as T);
      }

      if (request.method === "GET" && pathname === "/pay/subscriptions") {
        return success(mockSubscriptions as T);
      }

      if (request.method === "GET" && pathname === "/points-tasks/eligibility") {
        const eligibility: EligibilityResult = {
          eligible: true,
          reasonCode: "mock-mode",
        };
        return success(eligibility as T);
      }

      if (request.method === "POST" && pathname === "/points-tasks/conversion/preview") {
        const body = (request.body ?? {}) as ConversionPreviewDto;
        const preview: ConversionPreviewDto = {
          sourcePoints: body.sourcePoints ?? 0,
          conversionRate: body.conversionRate ?? 0,
          targetToken: body.targetToken ?? "RYV",
          expectedTokens: body.sourcePoints && body.conversionRate ? body.sourcePoints * body.conversionRate : 0,
        };
        return success(preview as T);
      }

      return errorNotFound<T>(request);
    },
  };
}
