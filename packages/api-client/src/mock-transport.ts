import type { AssetDto, OrderDto, PositionDto } from "@ryvra/domain-markets";
import type {
  InvoiceDto,
  InvoiceSummaryDto,
  PayActivityItemDto,
  PayListResponse,
  PayOverviewDto,
  PayoutDto,
  PayoutSummaryDto,
  ReconciliationItemDto,
  ReconciliationSummaryDto,
  SubscriptionDto,
} from "@ryvra/domain-payments";
import type { ConversionPreviewDto, EligibilityResult } from "@ryvra/domain-tokenomics";
import type { ApiRequest, ApiResult, Transport } from "./types";

const mockAssets: AssetDto[] = [
  { id: "asset-btc-usd", symbol: "BTC-USD", name: "Bitcoin / US Dollar" },
  { id: "asset-eth-usd", symbol: "ETH-USD", name: "Ether / US Dollar" },
];

const mockPositions: PositionDto[] = [{ id: "pos-1", assetId: "asset-btc-usd", quantity: 0.25, avgEntryPrice: 62200 }];

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
  const sortField = parseSortField(searchParams.get("sortField"), ["issuedAt", "dueAt", "amountMinor", "status"], "issuedAt");
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterInvoices(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), searchParams.get("pageSize"));
}

function filterPayouts(searchParams: URLSearchParams): PayoutDto[] {
  const statusFilter = searchParams.get("status")?.toUpperCase();
  const destinationType = searchParams.get("destinationType")?.toUpperCase();
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
  const sortField = parseSortField(searchParams.get("sortField"), ["createdAt", "amountMinor", "status"], "createdAt");
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterPayouts(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), searchParams.get("pageSize"));
}

function filterReconciliation(searchParams: URLSearchParams): ReconciliationItemDto[] {
  const statusFilter = searchParams.get("status")?.toUpperCase();
  const exceptionOnly = searchParams.get("exceptionOnly") === "true";
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
  const sortField = parseSortField(searchParams.get("sortField"), ["updatedAt", "deltaMinor", "status"], "updatedAt");
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";
  const filtered = filterReconciliation(searchParams);
  const sorted = sortRows(filtered, sortField, sortDirection);
  return paginate(sorted, searchParams.get("page"), searchParams.get("pageSize"));
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

export function createMockTransport(): Transport {
  return {
    async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
      const { pathname, searchParams } = parseRequestPath(request.path);

      if (request.method === "GET" && pathname === "/markets/assets") {
        return success(mockAssets as T);
      }

      if (request.method === "GET" && pathname === "/markets/positions") {
        return success(mockPositions as T);
      }

      if (request.method === "POST" && pathname === "/markets/execution/preview") {
        const body = (request.body ?? {}) as { assetId?: string; side?: "BUY" | "SELL"; quantity?: number };
        const order: OrderDto = {
          id: "preview-order-1",
          assetId: body.assetId ?? "asset-btc-usd",
          side: body.side ?? "BUY",
          quantity: body.quantity ?? 0,
          status: "PREVIEW",
        };
        return success(order as T);
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
