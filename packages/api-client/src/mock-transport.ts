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
import type {
  PointEntryDto,
  PointSummaryDto,
  PointsListResponse,
  PointsOverviewDto,
} from "@ryvra/domain-points";
import type {
  TaskDto,
  TaskSummaryDto,
  TasksListResponse,
  TasksOverviewDto,
} from "@ryvra/domain-tasks";
import type { ConversionPreviewDto, DailyClaimStateDto } from "@ryvra/domain-tokenomics";
import { payCanonicalPaymentIntentStates } from "./pay-parity";
import {
  POINTS_TASKS_CANONICAL_API_VERSION,
  POINTS_TASKS_DEPRECATED_PAGE_REMOVAL_NOT_BEFORE,
  pointsTasksRouteMap,
} from "./points-tasks-parity";
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

const mockPointEntries: PointEntryDto[] = [
  {
    entryId: "pt-1001",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    taskId: "task-501",
    ledgerEventId: "ledger-evt-1001",
    referenceId: "ref-task-501",
    entryType: "task_completion_bonus",
    entryStatus: "confirmed",
    entrySource: "tasks_engine",
    pointsDelta: 120,
    pointsBalanceAfter: 1_120,
    occurredAt: "2026-08-07T08:00:00.000Z",
    createdAt: "2026-08-07T08:00:00.000Z",
    metadata: { campaign: "referral-milestone" },
  },
  {
    entryId: "pt-1002",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    ledgerEventId: "ledger-evt-1002",
    referenceId: "ref-redemption-11",
    entryType: "transaction_reward",
    entryStatus: "confirmed",
    entrySource: "ledger_settlement",
    pointsDelta: 80,
    pointsBalanceAfter: 1_200,
    occurredAt: "2026-08-06T14:10:00.000Z",
    createdAt: "2026-08-06T14:10:00.000Z",
  },
  {
    entryId: "pt-1003",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    referenceId: "ref-review-18",
    entryType: "manual_adjustment",
    entryStatus: "pending",
    entrySource: "admin_console",
    pointsDelta: 30,
    pointsBalanceAfter: 1_230,
    occurredAt: "2026-08-06T11:30:00.000Z",
    createdAt: "2026-08-06T11:30:00.000Z",
    metadata: { reviewer: "ops-admin" },
  },
  {
    entryId: "pt-1004",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    ledgerEventId: "ledger-evt-1004",
    referenceId: "ref-order-303",
    entryType: "penalty",
    entryStatus: "rejected",
    entrySource: "policy_risk",
    pointsDelta: -25,
    pointsBalanceAfter: 1_205,
    occurredAt: "2026-08-05T09:45:00.000Z",
    createdAt: "2026-08-05T09:45:00.000Z",
    metadata: { reason_code: "policy_review_required" },
  },
  {
    entryId: "pt-1005",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    referenceId: "ref-dispute-77",
    entryType: "reversal",
    entryStatus: "reversed",
    entrySource: "admin_console",
    pointsDelta: -15,
    pointsBalanceAfter: 1_190,
    occurredAt: "2026-08-04T16:22:00.000Z",
    createdAt: "2026-08-04T16:22:00.000Z",
  },
  {
    entryId: "pt-1006",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    referenceId: "ref-bonus-10",
    entryType: "referral_bonus",
    entryStatus: "expired",
    entrySource: "system_migration",
    pointsDelta: 45,
    pointsBalanceAfter: 1_235,
    occurredAt: "2026-08-03T07:01:00.000Z",
    createdAt: "2026-08-03T07:01:00.000Z",
  },
  {
    entryId: "pt-1007",
    accountId: "acct-core-2",
    userId: "user-core-2",
    workspaceId: "workspace-core-2",
    taskId: "task-700",
    ledgerEventId: "ledger-evt-2001",
    referenceId: "ref-task-700",
    entryType: "transaction_reward",
    entryStatus: "confirmed",
    entrySource: "ledger_settlement",
    pointsDelta: 65,
    pointsBalanceAfter: 860,
    occurredAt: "2026-08-06T10:00:00.000Z",
    createdAt: "2026-08-06T10:00:00.000Z",
  },
  {
    entryId: "pt-1008",
    accountId: "acct-core-2",
    userId: "user-core-2",
    workspaceId: "workspace-core-2",
    referenceId: "ref-review-88",
    entryType: "manual_adjustment",
    entryStatus: "pending",
    entrySource: "admin_console",
    pointsDelta: -10,
    pointsBalanceAfter: 850,
    occurredAt: "2026-08-05T10:30:00.000Z",
    createdAt: "2026-08-05T10:30:00.000Z",
    metadata: { reason_code: "manual_review_pending" },
  },
];

const mockTasks: TaskDto[] = [
  {
    taskId: "task-501",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    title: "Verify referral proof",
    taskType: "referral",
    taskStatus: "completed",
    progressState: "done",
    progressPercent: 100,
    pointsReward: 120,
    startedAt: "2026-08-05T09:00:00.000Z",
    createdAt: "2026-08-05T08:30:00.000Z",
    updatedAt: "2026-08-07T08:00:00.000Z",
    completedAt: "2026-08-07T08:00:00.000Z",
  },
  {
    taskId: "task-502",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    title: "Review anti-abuse signal spike",
    taskType: "security",
    taskStatus: "in_progress",
    progressState: "active",
    progressPercent: 60,
    pointsReward: 80,
    startedAt: "2026-08-06T10:10:00.000Z",
    createdAt: "2026-08-06T10:00:00.000Z",
    updatedAt: "2026-08-07T09:15:00.000Z",
    dueAt: "2026-08-09T00:00:00.000Z",
  },
  {
    taskId: "task-503",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    title: "Issue bonus campaign award batch",
    taskType: "ecosystem",
    taskStatus: "eligible",
    progressState: "queued",
    progressPercent: 0,
    pointsReward: 45,
    createdAt: "2026-08-07T05:10:00.000Z",
    updatedAt: "2026-08-07T05:10:00.000Z",
    dueAt: "2026-08-10T00:00:00.000Z",
  },
  {
    taskId: "task-504",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    title: "Backfill settlement references",
    taskType: "governance",
    taskStatus: "failed",
    progressState: "blocked",
    progressPercent: 25,
    pointsReward: 60,
    startedAt: "2026-08-04T13:30:00.000Z",
    createdAt: "2026-08-04T13:00:00.000Z",
    updatedAt: "2026-08-05T11:20:00.000Z",
    dueAt: "2026-08-06T00:00:00.000Z",
  },
  {
    taskId: "task-505",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    title: "Escalate blocked contribution review",
    taskType: "transaction_volume",
    taskStatus: "expired",
    progressState: "blocked",
    progressPercent: 40,
    pointsReward: 30,
    startedAt: "2026-08-03T10:00:00.000Z",
    createdAt: "2026-08-03T09:40:00.000Z",
    updatedAt: "2026-08-06T07:30:00.000Z",
    dueAt: "2026-08-08T00:00:00.000Z",
  },
  {
    taskId: "task-506",
    accountId: "acct-core-1",
    userId: "user-core-1",
    workspaceId: "workspace-core-1",
    title: "Cancel stale reward migration",
    taskType: "custom",
    taskStatus: "canceled",
    progressState: "under_review",
    progressPercent: 10,
    pointsReward: 20,
    description: "Superseded by canonical migration runbook",
    createdAt: "2026-08-01T09:40:00.000Z",
    updatedAt: "2026-08-02T07:30:00.000Z",
  },
  {
    taskId: "task-700",
    accountId: "acct-core-2",
    userId: "user-core-2",
    workspaceId: "workspace-core-2",
    title: "Verify retained loyalty activity",
    taskType: "onboarding",
    taskStatus: "completed",
    progressState: "done",
    progressPercent: 100,
    pointsReward: 65,
    startedAt: "2026-08-05T09:00:00.000Z",
    createdAt: "2026-08-05T08:30:00.000Z",
    updatedAt: "2026-08-06T10:00:00.000Z",
    completedAt: "2026-08-06T10:00:00.000Z",
  },
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

function resolveScope(searchParams: URLSearchParams, accountId: string): {
  accountId: string;
  userId?: string;
  workspaceId?: string;
} {
  const userId = searchParams.get("user_id")?.trim();
  const workspaceId = searchParams.get("workspace_id")?.trim();

  return {
    accountId,
    ...(userId ? { userId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
  };
}

function buildPointsTasksMeta(
  searchParams: URLSearchParams,
  accountId: string,
  deprecatedPage?:
    | {
        page: number;
        translatedToCursor: string;
        removalNotBefore: string;
      }
    | undefined,
): PointsListResponse<PointEntryDto>["meta"] {
  return {
    apiVersion: POINTS_TASKS_CANONICAL_API_VERSION,
    generatedAt: new Date().toISOString(),
    scope: resolveScope(searchParams, accountId),
    ...(typeof deprecatedPage === "undefined" ? {} : { deprecatedPage }),
  };
}

function paginatePointsTasks<T>(
  items: T[],
  searchParams: URLSearchParams,
  accountId: string,
): {
  items: T[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  meta: PointsListResponse<PointEntryDto>["meta"];
} {
  const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 200) : 50;
  const cursor = searchParams.get("cursor")?.trim();
  const deprecatedPage = !cursor ? parseLegacyPage(searchParams) : undefined;
  const startOffset = cursor ? parseCursorOffset(cursor) : ((deprecatedPage ?? 1) - 1) * limit;
  const boundedOffset = Math.max(0, Math.min(startOffset, items.length));
  const end = boundedOffset + limit;
  const hasMore = end < items.length;

  return {
    items: items.slice(boundedOffset, end),
    pagination: {
      limit,
      hasMore,
      ...(hasMore ? { nextCursor: encodeCursorOffset(end) } : {}),
    },
    meta: buildPointsTasksMeta(
      searchParams,
      accountId,
      typeof deprecatedPage === "number"
        ? {
            page: deprecatedPage,
            translatedToCursor: encodeCursorOffset(boundedOffset),
            removalNotBefore: POINTS_TASKS_DEPRECATED_PAGE_REMOVAL_NOT_BEFORE,
          }
        : undefined,
    ),
  };
}

function buildPointSummary(items: PointEntryDto[], accountId: string): PointSummaryDto {
  const nowIso = new Date().toISOString();
  const sortedByOccurred = [...items].sort((left, right) => (left.occurredAt < right.occurredAt ? -1 : 1));
  const latestBalance = [...items].sort((left, right) => (left.occurredAt < right.occurredAt ? 1 : -1))[0]?.pointsBalanceAfter ?? 0;

  const byType = new Map<PointEntryDto["entryType"], { entries: number; pointsTotal: number }>();
  const byStatus = new Map<PointEntryDto["entryStatus"], { entries: number; pointsTotal: number }>();
  const bySource = new Map<PointEntryDto["entrySource"], { entries: number; pointsTotal: number }>();

  for (const item of items) {
    const typeEntry = byType.get(item.entryType) ?? { entries: 0, pointsTotal: 0 };
    typeEntry.entries += 1;
    typeEntry.pointsTotal += item.pointsDelta;
    byType.set(item.entryType, typeEntry);

    const statusEntry = byStatus.get(item.entryStatus) ?? { entries: 0, pointsTotal: 0 };
    statusEntry.entries += 1;
    statusEntry.pointsTotal += item.pointsDelta;
    byStatus.set(item.entryStatus, statusEntry);

    const sourceEntry = bySource.get(item.entrySource) ?? { entries: 0, pointsTotal: 0 };
    sourceEntry.entries += 1;
    sourceEntry.pointsTotal += item.pointsDelta;
    bySource.set(item.entrySource, sourceEntry);
  }

  return {
    accountId,
    windowStart: sortedByOccurred[0]?.occurredAt ?? nowIso,
    windowEnd: sortedByOccurred[sortedByOccurred.length - 1]?.occurredAt ?? nowIso,
    totalPoints: latestBalance,
    availablePoints: items
      .filter((item) => item.entryStatus === "confirmed")
      .reduce((sum, item) => sum + item.pointsDelta, 0),
    pendingPoints: items
      .filter((item) => item.entryStatus === "pending")
      .reduce((sum, item) => sum + item.pointsDelta, 0),
    reversedPoints: Math.abs(
      items
        .filter((item) => item.entryStatus === "reversed")
        .reduce((sum, item) => sum + item.pointsDelta, 0),
    ),
    entryCount: items.length,
    byType: [...byType.entries()].map(([entryType, aggregate]) => ({
      entryType,
      entries: aggregate.entries,
      pointsTotal: aggregate.pointsTotal,
    })),
    byStatus: [...byStatus.entries()].map(([entryStatus, aggregate]) => ({
      entryStatus,
      entries: aggregate.entries,
      pointsTotal: aggregate.pointsTotal,
    })),
    bySource: [...bySource.entries()].map(([entrySource, aggregate]) => ({
      entrySource,
      entries: aggregate.entries,
      pointsTotal: aggregate.pointsTotal,
    })),
  };
}

function buildTaskSummary(items: TaskDto[], accountId: string): TaskSummaryDto {
  const now = Date.now();
  const byStatus = new Map<TaskDto["taskStatus"], number>();
  const byProgressState = new Map<TaskDto["progressState"], number>();

  for (const item of items) {
    byStatus.set(item.taskStatus, (byStatus.get(item.taskStatus) ?? 0) + 1);
    byProgressState.set(item.progressState, (byProgressState.get(item.progressState) ?? 0) + 1);
  }

  return {
    accountId,
    totalTasks: items.length,
    completedTasks: items.filter((item) => item.taskStatus === "completed").length,
    inProgressTasks: items.filter((item) => item.taskStatus === "in_progress").length,
    overdueTasks: items.filter((item) => {
      if (!item.dueAt) {
        return false;
      }

      const dueAt = Date.parse(item.dueAt);
      if (Number.isNaN(dueAt)) {
        return false;
      }

      return (
        dueAt < now &&
        item.taskStatus !== "completed" &&
        item.taskStatus !== "failed" &&
        item.taskStatus !== "expired" &&
        item.taskStatus !== "canceled"
      );
    }).length,
    byStatus: [...byStatus.entries()].map(([taskStatus, count]) => ({ taskStatus, count })),
    byProgressState: [...byProgressState.entries()].map(([progressState, count]) => ({ progressState, count })),
  };
}

function buildPointsOverview(accountId: string, searchParams: URLSearchParams): PointsOverviewDto {
  const scopedEntries = filterPointEntries(searchParams, accountId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const sortedByOccurred = [...scopedEntries].sort((left, right) => (left.occurredAt < right.occurredAt ? 1 : -1));
  const oldestOccurred = [...scopedEntries].sort((left, right) => (left.occurredAt < right.occurredAt ? -1 : 1))[0]?.occurredAt;

  const trendBuckets = new Map<string, { bucketStart: string; bucketEnd: string; pointsEarned: number; entries: number }>();
  for (const entry of scopedEntries) {
    const day = entry.occurredAt.slice(0, 10);
    const bucketStart = `${day}T00:00:00.000Z`;
    const bucketEnd = `${day}T23:59:59.999Z`;
    const aggregate = trendBuckets.get(day) ?? { bucketStart, bucketEnd, pointsEarned: 0, entries: 0 };
    aggregate.entries += 1;
    aggregate.pointsEarned += Math.max(entry.pointsDelta, 0);
    trendBuckets.set(day, aggregate);
  }

  const last24h = scopedEntries.filter((entry) => {
    const occurred = Date.parse(entry.occurredAt);
    return !Number.isNaN(occurred) && occurred >= now - 24 * 60 * 60 * 1000;
  });

  return {
    accountId,
    windowStart: oldestOccurred ?? nowIso,
    windowEnd: sortedByOccurred[0]?.occurredAt ?? nowIso,
    currentBalance: sortedByOccurred[0]?.pointsBalanceAfter ?? 0,
    lifetimePoints: scopedEntries.reduce((sum, entry) => sum + Math.max(entry.pointsDelta, 0), 0),
    entriesLast24h: last24h.length,
    pointsLast24h: last24h.reduce((sum, entry) => sum + Math.max(entry.pointsDelta, 0), 0),
    trend: [...trendBuckets.values()].sort((left, right) => (left.bucketStart < right.bucketStart ? -1 : 1)),
  };
}

function toTaskOverviewItem(task: TaskDto): TasksOverviewDto["recentlyCompleted"][number] {
  return {
    taskId: task.taskId,
    taskType: task.taskType,
    taskStatus: task.taskStatus,
    progressState: task.progressState,
    progressPercent: task.progressPercent,
  };
}

function buildTasksOverview(accountId: string, searchParams: URLSearchParams): TasksOverviewDto {
  const scopedTasks = filterTasks(searchParams, accountId);
  const now = Date.now();
  const sortedByCreated = [...scopedTasks].sort((left, right) => (left.createdAt < right.createdAt ? -1 : 1));
  const sortedByUpdated = [...scopedTasks].sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1));
  const completedTasks = scopedTasks.filter((task) => task.taskStatus === "completed");

  const atRisk = scopedTasks
    .filter((task) => {
      if (!task.dueAt) {
        return false;
      }

      const dueAt = Date.parse(task.dueAt);
      if (Number.isNaN(dueAt)) {
        return false;
      }

      return (
        dueAt <= now + 48 * 60 * 60 * 1000 &&
        task.taskStatus !== "completed" &&
        task.taskStatus !== "failed" &&
        task.taskStatus !== "expired" &&
        task.taskStatus !== "canceled"
      );
    })
    .sort((left, right) => (String(left.dueAt) < String(right.dueAt) ? -1 : 1))
    .slice(0, 10)
    .map((task) => toTaskOverviewItem(task));

  const recentlyCompleted = [...completedTasks]
    .sort((left, right) => {
      const leftTimestamp = left.completedAt ?? left.updatedAt;
      const rightTimestamp = right.completedAt ?? right.updatedAt;
      return leftTimestamp < rightTimestamp ? 1 : -1;
    })
    .slice(0, 10)
    .map((task) => toTaskOverviewItem(task));

  return {
    accountId,
    windowStart: sortedByCreated[0]?.createdAt ?? new Date().toISOString(),
    windowEnd: sortedByUpdated[0]?.updatedAt ?? new Date().toISOString(),
    completionRate: scopedTasks.length > 0 ? (completedTasks.length / scopedTasks.length) * 100 : 0,
    tasksCreated: scopedTasks.length,
    tasksCompleted: completedTasks.length,
    recentlyCompleted,
    atRisk,
  };
}

function filterPointEntries(searchParams: URLSearchParams, accountId: string): PointEntryDto[] {
  const typeFilter = searchParams.get("entry_type")?.trim().toLowerCase();
  const statusFilter = searchParams.get("entry_status")?.trim().toLowerCase();
  const sourceFilter = searchParams.get("entry_source")?.trim().toLowerCase();
  const userIdFilter = searchParams.get("user_id")?.trim();
  const workspaceIdFilter = searchParams.get("workspace_id")?.trim();
  const from = normalizeDateInput(searchParams.get("occurred_from"));
  const to = normalizeDateInput(searchParams.get("occurred_to"));

  return mockPointEntries.filter((item) => {
    if (item.accountId !== accountId) {
      return false;
    }

    if (userIdFilter && item.userId !== userIdFilter) {
      return false;
    }

    if (workspaceIdFilter && item.workspaceId !== workspaceIdFilter) {
      return false;
    }

    if (typeFilter && item.entryType !== typeFilter) {
      return false;
    }

    if (statusFilter && item.entryStatus !== statusFilter) {
      return false;
    }

    if (sourceFilter && item.entrySource !== sourceFilter) {
      return false;
    }

    return inDateRange(item.occurredAt, from, to);
  });
}

function listPointEntries(searchParams: URLSearchParams, accountId: string): PointsListResponse<PointEntryDto> {
  const sortValue = (searchParams.get("sort") ?? "occurred_at:desc").trim().toLowerCase();
  const [sortFieldRaw, sortDirectionRaw] = sortValue.split(":");
  const normalizedSortBy = sortFieldRaw === "created_at" ? "createdAt" : "occurredAt";
  const sortField = parseSortField(normalizedSortBy, ["occurredAt", "createdAt"], "occurredAt");
  const sortDirection = sortDirectionRaw === "asc" ? "asc" : "desc";
  const filtered = filterPointEntries(searchParams, accountId);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginatePointsTasks(sorted, searchParams, accountId);
}

function filterTasks(searchParams: URLSearchParams, accountId: string): TaskDto[] {
  const statusFilter = searchParams.get("task_status")?.trim().toLowerCase();
  const typeFilter = searchParams.get("task_type")?.trim().toLowerCase();
  const progressStateFilter = searchParams.get("progress_state")?.trim().toLowerCase();
  const userIdFilter = searchParams.get("user_id")?.trim();
  const workspaceIdFilter = searchParams.get("workspace_id")?.trim();
  const dueAfter = normalizeDateInput(searchParams.get("due_after"));
  const dueBefore = normalizeDateInput(searchParams.get("due_before"));

  return mockTasks.filter((item) => {
    if (item.accountId !== accountId) {
      return false;
    }

    if (userIdFilter && item.userId !== userIdFilter) {
      return false;
    }

    if (workspaceIdFilter && item.workspaceId !== workspaceIdFilter) {
      return false;
    }

    if (statusFilter && item.taskStatus !== statusFilter) {
      return false;
    }

    if (typeFilter && item.taskType !== typeFilter) {
      return false;
    }

    if (progressStateFilter && item.progressState !== progressStateFilter) {
      return false;
    }

    return inDateRange(item.dueAt ?? item.updatedAt, dueAfter, dueBefore);
  });
}

function listTasks(searchParams: URLSearchParams, accountId: string): TasksListResponse<TaskDto> {
  const sortValue = (searchParams.get("sort") ?? "updated_at:desc").trim().toLowerCase();
  const [sortFieldRaw, sortDirectionRaw] = sortValue.split(":");
  const normalizedSortBy =
    sortFieldRaw === "created_at" ? "createdAt" : sortFieldRaw === "due_at" ? "dueAt" : "updatedAt";
  const sortField = parseSortField(normalizedSortBy, ["updatedAt", "createdAt", "dueAt"], "updatedAt");
  const sortDirection = sortDirectionRaw === "asc" ? "asc" : "desc";
  const filtered = filterTasks(searchParams, accountId);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginatePointsTasks(sorted, searchParams, accountId) as TasksListResponse<TaskDto>;
}

function toCanonicalMeta(meta: PointsListResponse<PointEntryDto>["meta"] | TasksListResponse<TaskDto>["meta"]): {
  api_version: string;
  generated_at: string;
  scope: {
    account_id: string;
    user_id?: string | null;
    workspace_id?: string | null;
  };
  deprecated_page?:
    | {
        page: number;
        translated_to_cursor: string;
        removal_not_before: string;
      }
    | null;
} {
  return {
    api_version: meta.apiVersion,
    generated_at: meta.generatedAt,
    scope: {
      account_id: meta.scope.accountId,
      ...(typeof meta.scope.userId === "undefined" ? {} : { user_id: meta.scope.userId }),
      ...(typeof meta.scope.workspaceId === "undefined" ? {} : { workspace_id: meta.scope.workspaceId }),
    },
    ...(typeof meta.deprecatedPage === "undefined"
      ? {}
      : {
          deprecated_page: meta.deprecatedPage
            ? {
                page: meta.deprecatedPage.page,
                translated_to_cursor: meta.deprecatedPage.translatedToCursor,
                removal_not_before: meta.deprecatedPage.removalNotBefore,
              }
            : null,
        }),
  };
}

function toCanonicalPointEntry(entry: PointEntryDto): {
  entry_id: string;
  account_id: string;
  user_id?: string | null;
  workspace_id?: string | null;
  task_id?: string | null;
  ledger_event_id?: string | null;
  reference_id?: string | null;
  entry_type: PointEntryDto["entryType"];
  entry_status: PointEntryDto["entryStatus"];
  entry_source: PointEntryDto["entrySource"];
  points_delta: number;
  points_balance_after?: number | null;
  occurred_at: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
} {
  return {
    entry_id: entry.entryId,
    account_id: entry.accountId,
    ...(typeof entry.userId === "undefined" ? {} : { user_id: entry.userId }),
    ...(typeof entry.workspaceId === "undefined" ? {} : { workspace_id: entry.workspaceId }),
    ...(typeof entry.taskId === "undefined" ? {} : { task_id: entry.taskId }),
    ...(typeof entry.ledgerEventId === "undefined" ? {} : { ledger_event_id: entry.ledgerEventId }),
    ...(typeof entry.referenceId === "undefined" ? {} : { reference_id: entry.referenceId }),
    entry_type: entry.entryType,
    entry_status: entry.entryStatus,
    entry_source: entry.entrySource,
    points_delta: entry.pointsDelta,
    ...(typeof entry.pointsBalanceAfter === "undefined" ? {} : { points_balance_after: entry.pointsBalanceAfter }),
    occurred_at: entry.occurredAt,
    created_at: entry.createdAt,
    ...(typeof entry.metadata === "undefined" ? {} : { metadata: entry.metadata }),
  };
}

function toCanonicalPointSummary(summary: PointSummaryDto): {
  account_id: string;
  window_start: string;
  window_end: string;
  total_points: number;
  available_points: number;
  pending_points: number;
  reversed_points: number;
  entry_count: number;
  by_type: Array<{ entry_type: PointEntryDto["entryType"]; entries: number; points_total: number }>;
  by_status: Array<{ entry_status: PointEntryDto["entryStatus"]; entries: number; points_total: number }>;
  by_source: Array<{ entry_source: PointEntryDto["entrySource"]; entries: number; points_total: number }>;
} {
  return {
    account_id: summary.accountId,
    window_start: summary.windowStart,
    window_end: summary.windowEnd,
    total_points: summary.totalPoints,
    available_points: summary.availablePoints,
    pending_points: summary.pendingPoints,
    reversed_points: summary.reversedPoints,
    entry_count: summary.entryCount,
    by_type: summary.byType.map((item) => ({
      entry_type: item.entryType,
      entries: item.entries,
      points_total: item.pointsTotal,
    })),
    by_status: summary.byStatus.map((item) => ({
      entry_status: item.entryStatus,
      entries: item.entries,
      points_total: item.pointsTotal,
    })),
    by_source: summary.bySource.map((item) => ({
      entry_source: item.entrySource,
      entries: item.entries,
      points_total: item.pointsTotal,
    })),
  };
}

function toCanonicalPointsOverview(overview: PointsOverviewDto): {
  account_id: string;
  window_start: string;
  window_end: string;
  current_balance: number;
  lifetime_points: number;
  entries_last_24h: number;
  points_last_24h: number;
  trend: Array<{ bucket_start: string; bucket_end: string; points_earned: number; entries: number }>;
} {
  return {
    account_id: overview.accountId,
    window_start: overview.windowStart,
    window_end: overview.windowEnd,
    current_balance: overview.currentBalance,
    lifetime_points: overview.lifetimePoints,
    entries_last_24h: overview.entriesLast24h,
    points_last_24h: overview.pointsLast24h,
    trend: overview.trend.map((item) => ({
      bucket_start: item.bucketStart,
      bucket_end: item.bucketEnd,
      points_earned: item.pointsEarned,
      entries: item.entries,
    })),
  };
}

function toCanonicalTask(task: TaskDto): {
  task_id: string;
  account_id: string;
  user_id?: string | null;
  workspace_id?: string | null;
  task_type: TaskDto["taskType"];
  task_status: TaskDto["taskStatus"];
  progress_state: TaskDto["progressState"];
  title: string;
  description?: string | null;
  progress_percent: number;
  points_reward: number;
  due_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
} {
  return {
    task_id: task.taskId,
    account_id: task.accountId,
    ...(typeof task.userId === "undefined" ? {} : { user_id: task.userId }),
    ...(typeof task.workspaceId === "undefined" ? {} : { workspace_id: task.workspaceId }),
    task_type: task.taskType,
    task_status: task.taskStatus,
    progress_state: task.progressState,
    title: task.title,
    ...(typeof task.description === "undefined" ? {} : { description: task.description }),
    progress_percent: task.progressPercent,
    points_reward: task.pointsReward,
    ...(typeof task.dueAt === "undefined" ? {} : { due_at: task.dueAt }),
    ...(typeof task.startedAt === "undefined" ? {} : { started_at: task.startedAt }),
    ...(typeof task.completedAt === "undefined" ? {} : { completed_at: task.completedAt }),
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

function toCanonicalTaskSummary(summary: TaskSummaryDto): {
  account_id: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  by_status: Array<{ task_status: TaskDto["taskStatus"]; count: number }>;
  by_progress_state: Array<{ progress_state: TaskDto["progressState"]; count: number }>;
} {
  return {
    account_id: summary.accountId,
    total_tasks: summary.totalTasks,
    completed_tasks: summary.completedTasks,
    in_progress_tasks: summary.inProgressTasks,
    overdue_tasks: summary.overdueTasks,
    by_status: summary.byStatus.map((item) => ({
      task_status: item.taskStatus,
      count: item.count,
    })),
    by_progress_state: summary.byProgressState.map((item) => ({
      progress_state: item.progressState,
      count: item.count,
    })),
  };
}

function toCanonicalTasksOverview(overview: TasksOverviewDto): {
  account_id: string;
  window_start: string;
  window_end: string;
  completion_rate: number;
  tasks_created: number;
  tasks_completed: number;
  recently_completed: Array<{
    task_id: string;
    task_type: TaskDto["taskType"];
    task_status: TaskDto["taskStatus"];
    progress_state: TaskDto["progressState"];
    progress_percent: number;
  }>;
  at_risk: Array<{
    task_id: string;
    task_type: TaskDto["taskType"];
    task_status: TaskDto["taskStatus"];
    progress_state: TaskDto["progressState"];
    progress_percent: number;
  }>;
} {
  return {
    account_id: overview.accountId,
    window_start: overview.windowStart,
    window_end: overview.windowEnd,
    completion_rate: overview.completionRate,
    tasks_created: overview.tasksCreated,
    tasks_completed: overview.tasksCompleted,
    recently_completed: overview.recentlyCompleted.map((item) => ({
      task_id: item.taskId,
      task_type: item.taskType,
      task_status: item.taskStatus,
      progress_state: item.progressState,
      progress_percent: item.progressPercent,
    })),
    at_risk: overview.atRisk.map((item) => ({
      task_id: item.taskId,
      task_type: item.taskType,
      task_status: item.taskStatus,
      progress_state: item.progressState,
      progress_percent: item.progressPercent,
    })),
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

      const accountId = searchParams.get("account_id")?.trim() ?? "";
      const needsAccountScope =
        pathname === pointsTasksRouteMap.listPointEntries ||
        pathname === pointsTasksRouteMap.getPointSummary ||
        pathname === pointsTasksRouteMap.getPointsOverview ||
        pathname === pointsTasksRouteMap.listTasks ||
        pathname === pointsTasksRouteMap.getTaskSummary ||
        pathname === pointsTasksRouteMap.getTasksOverview;

      if (needsAccountScope && accountId.length === 0) {
        return errorBadRequest<T>(
          "mock_missing_account_scope",
          "account_id is required for account-scoped points/tasks endpoints",
          { pathname, query: searchParams.toString() },
        );
      }

      if (request.method === "GET" && pathname === pointsTasksRouteMap.listPointEntries) {
        const response = listPointEntries(searchParams, accountId);
        return success(
          {
            data: response.items.map((item) => toCanonicalPointEntry(item)),
            page: {
              limit: response.pagination.limit,
              has_more: response.pagination.hasMore,
              ...(response.pagination.nextCursor ? { next_cursor: response.pagination.nextCursor } : { next_cursor: null }),
            },
            meta: toCanonicalMeta(response.meta),
          } as T,
        );
      }

      if (request.method === "GET" && pathname === pointsTasksRouteMap.getPointSummary) {
        const summary = buildPointSummary(filterPointEntries(searchParams, accountId), accountId);
        return success(
          {
            summary: toCanonicalPointSummary(summary),
            meta: toCanonicalMeta(buildPointsTasksMeta(searchParams, accountId)),
          } as T,
        );
      }

      if (request.method === "GET" && pathname === pointsTasksRouteMap.getPointsOverview) {
        const overview = buildPointsOverview(accountId, searchParams);
        return success(
          {
            overview: toCanonicalPointsOverview(overview),
            meta: toCanonicalMeta(buildPointsTasksMeta(searchParams, accountId)),
          } as T,
        );
      }

      if (request.method === "GET" && pathname === pointsTasksRouteMap.listTasks) {
        const response = listTasks(searchParams, accountId);
        return success(
          {
            data: response.items.map((item) => toCanonicalTask(item)),
            page: {
              limit: response.pagination.limit,
              has_more: response.pagination.hasMore,
              ...(response.pagination.nextCursor ? { next_cursor: response.pagination.nextCursor } : { next_cursor: null }),
            },
            meta: toCanonicalMeta(response.meta),
          } as T,
        );
      }

      if (request.method === "GET" && pathname === pointsTasksRouteMap.getTaskSummary) {
        const summary = buildTaskSummary(filterTasks(searchParams, accountId), accountId);
        return success(
          {
            summary: toCanonicalTaskSummary(summary),
            meta: toCanonicalMeta(buildPointsTasksMeta(searchParams, accountId)),
          } as T,
        );
      }

      if (request.method === "GET" && pathname === pointsTasksRouteMap.getTasksOverview) {
        const overview = buildTasksOverview(accountId, searchParams);
        return success(
          {
            overview: toCanonicalTasksOverview(overview),
            meta: toCanonicalMeta(buildPointsTasksMeta(searchParams, accountId)),
          } as T,
        );
      }

      if (request.method === "GET" && pathname === pointsTasksRouteMap.status) {
        return success(
          {
            service: "points-tasks",
            status: "ok",
            timestamp: new Date().toISOString(),
            api_version: POINTS_TASKS_CANONICAL_API_VERSION,
            auth_required: true,
            components: [
              {
                name: "mock-transport",
                status: "ok",
                checked_at: new Date().toISOString(),
                latency_ms: 1,
              },
            ],
          } as T,
        );
      }

      if (request.method === "GET" && pathname === pointsTasksRouteMap.health) {
        return success(
          {
            service: "points-tasks",
            status: "ok",
            timestamp: new Date().toISOString(),
            api_version: POINTS_TASKS_CANONICAL_API_VERSION,
            uptime_seconds: 86400,
            checks: [
              {
                name: "mock-transport",
                status: "ok",
                checked_at: new Date().toISOString(),
                latency_ms: 1,
              },
            ],
          } as T,
        );
      }

      if (request.method === "GET" && pathname === "/points-tasks/eligibility") {
        const accountId = getParam(searchParams, "account_id") ?? "acct-core-1";
        const userId = getParam(searchParams, "user_id");
        const workspaceId = getParam(searchParams, "workspace_id");

        let claimState: DailyClaimStateDto;

        if (accountId === "acct-core-1") {
          claimState = {
            accountId,
            ...(userId ? { userId } : {}),
            ...(workspaceId ? { workspaceId } : {}),
            eligible: false,
            status: "cooldown",
            reasonCode: "cooldown_active",
            claimedAt: "2026-08-08T08:00:00.000Z",
            nextEligibleAt: "2026-08-09T08:00:00.000Z",
            invokeEndpointAvailable: false,
          };
        } else if (accountId === "acct-core-2") {
          claimState = {
            accountId,
            ...(userId ? { userId } : {}),
            ...(workspaceId ? { workspaceId } : {}),
            eligible: false,
            status: "already_claimed",
            reasonCode: "already_claimed_today",
            claimedAt: "2026-08-09T01:10:00.000Z",
            nextEligibleAt: "2026-08-10T00:00:00.000Z",
            invokeEndpointAvailable: false,
          };
        } else {
          claimState = {
            accountId,
            ...(userId ? { userId } : {}),
            ...(workspaceId ? { workspaceId } : {}),
            eligible: true,
            status: "available",
            reasonCode: "claim_available",
            invokeEndpointAvailable: false,
          };
        }

        return success(
          {
            account_id: claimState.accountId,
            ...(typeof claimState.userId === "undefined" ? {} : { user_id: claimState.userId }),
            ...(typeof claimState.workspaceId === "undefined" ? {} : { workspace_id: claimState.workspaceId }),
            eligible: claimState.eligible,
            status: claimState.status,
            ...(claimState.reasonCode ? { reason_code: claimState.reasonCode } : {}),
            ...(typeof claimState.claimedAt === "undefined" ? {} : { claimed_at: claimState.claimedAt }),
            ...(typeof claimState.nextEligibleAt === "undefined" ? {} : { next_eligible_at: claimState.nextEligibleAt }),
            invoke_endpoint_available: claimState.invokeEndpointAvailable,
          } as T,
        );
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
