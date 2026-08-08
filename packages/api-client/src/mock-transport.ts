import type {
  InstrumentDto,
  InstrumentSummaryDto,
  MarketsActivityItemDto,
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
    symbol: "BTC-USD",
    name: "Bitcoin / US Dollar",
    assetClass: "crypto",
    availability: "tradable",
    status: "active",
    tradable: true,
    updatedAt: "2026-08-06T10:00:00.000Z",
  },
  {
    id: "asset-eth-usd",
    symbol: "ETH-USD",
    name: "Ether / US Dollar",
    assetClass: "crypto",
    availability: "tradable",
    status: "active",
    tradable: true,
    updatedAt: "2026-08-06T09:00:00.000Z",
  },
  {
    id: "asset-sol-usd",
    symbol: "SOL-USD",
    name: "Solana / US Dollar",
    assetClass: "crypto",
    availability: "close_only",
    status: "active",
    tradable: false,
    updatedAt: "2026-08-05T21:30:00.000Z",
  },
  {
    id: "asset-xau-usd",
    symbol: "XAU-USD",
    name: "Gold / US Dollar",
    assetClass: "metal",
    availability: "tradable",
    status: "active",
    tradable: true,
    updatedAt: "2026-08-06T07:15:00.000Z",
  },
  {
    id: "asset-eur-usd",
    symbol: "EUR-USD",
    name: "Euro / US Dollar",
    assetClass: "fiat",
    availability: "suspended",
    status: "halted",
    tradable: false,
    updatedAt: "2026-08-04T18:45:00.000Z",
  },
  {
    id: "asset-rwa-carbon",
    symbol: "RWA-CARBON",
    name: "Carbon Credit Index",
    assetClass: "rwa",
    availability: "suspended",
    status: "delisted",
    tradable: false,
    updatedAt: "2026-07-28T06:00:00.000Z",
  },
];

const mockOrders: OrderDto[] = [
  {
    id: "ord-7001",
    referenceId: "ref-7001",
    symbol: "BTC-USD",
    side: "buy",
    type: "market",
    quantity: "0.25",
    notionalValue: "15750.00",
    status: "filled",
    createdAt: "2026-08-05T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:07.000Z",
  },
  {
    id: "ord-7002",
    referenceId: "ref-7002",
    symbol: "ETH-USD",
    side: "sell",
    type: "limit",
    quantity: "1.40",
    notionalValue: "4680.00",
    status: "routed",
    createdAt: "2026-08-05T10:30:00.000Z",
    updatedAt: "2026-08-05T10:30:04.000Z",
  },
  {
    id: "ord-7003",
    referenceId: "ref-7003",
    symbol: "SOL-USD",
    side: "buy",
    type: "rfq",
    quantity: "80",
    notionalValue: "1520.00",
    status: "created",
    createdAt: "2026-08-05T11:00:00.000Z",
    updatedAt: "2026-08-05T11:00:00.000Z",
  },
  {
    id: "ord-7004",
    referenceId: "ref-7004",
    symbol: "XAU-USD",
    side: "buy",
    type: "limit",
    quantity: "4",
    notionalValue: "9400.00",
    status: "partially_filled",
    createdAt: "2026-08-04T14:45:00.000Z",
    updatedAt: "2026-08-04T14:46:30.000Z",
  },
  {
    id: "ord-7005",
    referenceId: "ref-7005",
    symbol: "EUR-USD",
    side: "sell",
    type: "market",
    quantity: "10000",
    notionalValue: "10830.00",
    status: "canceled",
    createdAt: "2026-08-04T08:10:00.000Z",
    updatedAt: "2026-08-04T08:15:00.000Z",
  },
  {
    id: "ord-7006",
    referenceId: "ref-7006",
    symbol: "BTC-USD",
    side: "sell",
    type: "limit",
    quantity: "0.10",
    notionalValue: "6380.00",
    status: "failed",
    createdAt: "2026-08-03T12:20:00.000Z",
    updatedAt: "2026-08-03T12:20:12.000Z",
  },
  {
    id: "ord-7007",
    referenceId: "ref-7007",
    symbol: "ETH-USD",
    side: "buy",
    type: "market",
    quantity: "2.00",
    notionalValue: "6900.00",
    status: "settled",
    createdAt: "2026-08-02T16:00:00.000Z",
    updatedAt: "2026-08-02T16:00:45.000Z",
  },
  {
    id: "ord-7008",
    referenceId: "ref-7008",
    symbol: "RWA-CARBON",
    side: "buy",
    type: "rfq",
    quantity: "250",
    notionalValue: "1125.00",
    status: "expired",
    createdAt: "2026-08-01T09:30:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
];

const mockPositions: PositionDto[] = [
  {
    id: "pos-8001",
    accountId: "acct-core-1",
    assetId: "asset-btc-usd",
    symbol: "BTC-USD",
    side: "long",
    quantity: "0.80",
    entryPrice: "59820.00",
    markPrice: "63210.00",
    unrealizedPnl: "2712.00",
    riskState: "normal",
    riskFlags: [],
    updatedAt: "2026-08-06T10:05:00.000Z",
  },
  {
    id: "pos-8002",
    accountId: "acct-core-1",
    assetId: "asset-eth-usd",
    symbol: "ETH-USD",
    side: "long",
    quantity: "7.00",
    entryPrice: "3345.00",
    markPrice: "3290.00",
    unrealizedPnl: "-385.00",
    riskState: "watch",
    riskFlags: ["liquidity_stress"],
    updatedAt: "2026-08-06T10:03:00.000Z",
  },
  {
    id: "pos-8003",
    accountId: "acct-core-2",
    assetId: "asset-eur-usd",
    symbol: "EUR-USD",
    side: "short",
    quantity: "12000",
    entryPrice: "1.0870",
    markPrice: "1.0940",
    unrealizedPnl: "-84.00",
    riskState: "at_risk",
    riskFlags: ["exposure_limit", "volatility_halt"],
    updatedAt: "2026-08-06T09:48:00.000Z",
  },
  {
    id: "pos-8004",
    accountId: "acct-core-2",
    assetId: "asset-xau-usd",
    symbol: "XAU-USD",
    side: "long",
    quantity: "3",
    entryPrice: "2290.00",
    markPrice: "2360.00",
    unrealizedPnl: "210.00",
    riskState: "normal",
    riskFlags: [],
    updatedAt: "2026-08-06T09:15:00.000Z",
  },
  {
    id: "pos-8005",
    accountId: "acct-core-3",
    assetId: "asset-sol-usd",
    symbol: "SOL-USD",
    side: "flat",
    quantity: "0",
    entryPrice: "0",
    markPrice: "19.2",
    unrealizedPnl: "0",
    riskState: "watch",
    riskFlags: ["policy_review_required"],
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
  return {
    totalCount: items.length,
    activeCount: items.filter((item) => item.status === "active").length,
    haltedCount: items.filter((item) => item.status === "halted").length,
    tradableCount: items.filter((item) => item.tradable).length,
  };
}

function buildOrderSummary(items: OrderDto[]): OrderSummaryDto {
  return {
    totalCount: items.length,
    openCount: items.filter((item) =>
      item.status === "created" ||
      item.status === "validated" ||
      item.status === "routed" ||
      item.status === "partially_filled"
    ).length,
    filledCount: items.filter((item) => item.status === "filled" || item.status === "settled").length,
    canceledCount: items.filter((item) => item.status === "canceled" || item.status === "expired").length,
    failedCount: items.filter((item) => item.status === "failed").length,
  };
}

function resolveNetExposureBand(positions: PositionDto[]): PositionSummaryDto["netExposureBand"] {
  const longCount = positions.filter((item) => item.side === "long").length;
  const shortCount = positions.filter((item) => item.side === "short").length;

  if (longCount > shortCount) {
    return "net_long";
  }

  if (shortCount > longCount) {
    return "net_short";
  }

  return "neutral";
}

function buildPositionSummary(items: PositionDto[]): PositionSummaryDto {
  return {
    totalCount: items.length,
    longCount: items.filter((item) => item.side === "long").length,
    shortCount: items.filter((item) => item.side === "short").length,
    flatCount: items.filter((item) => item.side === "flat").length,
    atRiskCount: items.filter((item) => item.riskState === "at_risk").length,
    netExposureBand: resolveNetExposureBand(items),
  };
}

function buildMarketsOverview(): MarketsOverviewDto {
  const orderSummary = buildOrderSummary(mockOrders);
  const positionSummary = buildPositionSummary(mockPositions);
  const recentActivity: MarketsActivityItemDto[] = [
    ...mockOrders.map((item) => ({
      id: `activity-order-${item.id}`,
      type: "order" as const,
      title: `${item.symbol} ${item.side} ${item.quantity}`,
      status: item.status,
      createdAt: item.updatedAt,
      symbol: item.symbol,
      detail: `${item.type} • ${item.notionalValue}`,
    })),
    ...mockPositions.map((item) => ({
      id: `activity-position-${item.id}`,
      type: "position" as const,
      title: `${item.symbol} ${item.side} ${item.quantity}`,
      status: item.riskState,
      createdAt: item.updatedAt,
      symbol: item.symbol,
      detail: item.riskFlags.join(", ") || "risk_clear",
    })),
    ...mockInstruments.map((item) => ({
      id: `activity-instrument-${item.id}`,
      type: "instrument" as const,
      title: `${item.symbol} ${item.name}`,
      status: item.status,
      createdAt: item.updatedAt,
      symbol: item.symbol,
      detail: `${item.assetClass} • ${item.availability}`,
    })),
  ]
    .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))
    .slice(0, 12);

  return {
    metrics: {
      totalInstruments: mockInstruments.length,
      activeInstruments: mockInstruments.filter((item) => item.status === "active").length,
      openOrders: orderSummary.openCount,
      totalPositions: mockPositions.length,
      atRiskPositions: positionSummary.atRiskCount,
      netExposureBand: positionSummary.netExposureBand,
    },
    recentActivity,
  };
}

function filterInstruments(searchParams: URLSearchParams): InstrumentDto[] {
  const statusFilter = searchParams.get("status")?.trim().toLowerCase();
  const assetClassFilter = getParam(searchParams, "asset_class", "assetClass")?.trim().toLowerCase();
  const searchFilter = searchParams.get("search")?.trim().toLowerCase();

  return mockInstruments.filter((item) => {
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    if (assetClassFilter && item.assetClass !== assetClassFilter) {
      return false;
    }

    if (searchFilter) {
      const searchTarget = `${item.id} ${item.symbol} ${item.name} ${item.assetClass}`.toLowerCase();
      if (!searchTarget.includes(searchFilter)) {
        return false;
      }
    }

    return true;
  });
}

function listInstruments(searchParams: URLSearchParams): MarketsListResponse<InstrumentDto> {
  const sortField = parseSortField(
    getParam(searchParams, "sort_field", "sortField"),
    ["symbol", "name", "assetClass", "status", "updatedAt"],
    "symbol",
  );
  const sortDirection = getParam(searchParams, "sort_direction", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterInstruments(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), getParam(searchParams, "page_size", "pageSize"));
}

function filterOrders(searchParams: URLSearchParams): OrderDto[] {
  const statusFilter = searchParams.get("status")?.trim().toLowerCase();
  const sideFilter = searchParams.get("side")?.trim().toLowerCase();
  const typeFilter = searchParams.get("type")?.trim().toLowerCase();
  const searchFilter = searchParams.get("search")?.trim().toLowerCase();
  const from = normalizeDateInput(searchParams.get("from"));
  const to = normalizeDateInput(searchParams.get("to"));

  return mockOrders.filter((item) => {
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    if (sideFilter && item.side !== sideFilter) {
      return false;
    }

    if (typeFilter && item.type !== typeFilter) {
      return false;
    }

    if (searchFilter) {
      const searchTarget = `${item.id} ${item.referenceId} ${item.symbol}`.toLowerCase();
      if (!searchTarget.includes(searchFilter)) {
        return false;
      }
    }

    return inDateRange(item.createdAt, from, to);
  });
}

function listOrders(searchParams: URLSearchParams): MarketsListResponse<OrderDto> {
  const sortField = parseSortField(
    getParam(searchParams, "sort_field", "sortField"),
    ["createdAt", "updatedAt", "status", "symbol", "notionalValue"],
    "createdAt",
  );
  const sortDirection = getParam(searchParams, "sort_direction", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterOrders(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), getParam(searchParams, "page_size", "pageSize"));
}

function filterPositions(searchParams: URLSearchParams): PositionDto[] {
  const sideFilter = searchParams.get("side")?.trim().toLowerCase();
  const riskStateFilter = getParam(searchParams, "risk_state", "riskState")?.trim().toLowerCase();
  const symbolFilter = searchParams.get("symbol")?.trim().toLowerCase();
  const searchFilter = searchParams.get("search")?.trim().toLowerCase();
  const from = normalizeDateInput(searchParams.get("from"));
  const to = normalizeDateInput(searchParams.get("to"));

  return mockPositions.filter((item) => {
    if (sideFilter && item.side !== sideFilter) {
      return false;
    }

    if (riskStateFilter && item.riskState !== riskStateFilter) {
      return false;
    }

    if (symbolFilter && item.symbol.toLowerCase() !== symbolFilter) {
      return false;
    }

    if (searchFilter) {
      const searchTarget = `${item.id} ${item.accountId} ${item.assetId} ${item.symbol}`.toLowerCase();
      if (!searchTarget.includes(searchFilter)) {
        return false;
      }
    }

    return inDateRange(item.updatedAt, from, to);
  });
}

function listMarketsPositions(searchParams: URLSearchParams): MarketsListResponse<PositionDto> {
  const sortField = parseSortField(
    getParam(searchParams, "sort_field", "sortField"),
    ["updatedAt", "symbol", "side", "riskState"],
    "updatedAt",
  );
  const sortDirection = getParam(searchParams, "sort_direction", "sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterPositions(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), getParam(searchParams, "page_size", "pageSize"));
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

export function createMockTransport(): Transport {
  return {
    async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
      const { pathname, searchParams } = parseRequestPath(request.path);

      if (request.method === "GET" && pathname === "/markets/instruments") {
        return success(listInstruments(searchParams) as T);
      }

      if (request.method === "GET" && pathname === "/markets/positions") {
        return success(listMarketsPositions(searchParams) as T);
      }

      if (request.method === "GET" && pathname === "/markets/instruments/summary") {
        return success(buildInstrumentSummary(filterInstruments(searchParams)) as T);
      }

      if (request.method === "GET" && pathname === "/markets/orders") {
        return success(listOrders(searchParams) as T);
      }

      if (request.method === "GET" && pathname === "/markets/orders/summary") {
        return success(buildOrderSummary(filterOrders(searchParams)) as T);
      }

      if (request.method === "GET" && pathname === "/markets/positions/summary") {
        return success(buildPositionSummary(filterPositions(searchParams)) as T);
      }

      if (request.method === "GET" && pathname === "/markets/overview") {
        return success(buildMarketsOverview() as T);
      }

      if (request.method === "GET" && pathname === "/health") {
        return success(
          {
            service: "pay",
            status: "ok",
            timestamp: new Date().toISOString(),
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
