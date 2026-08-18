import type { RuntimeMode } from "@ryvra/config";
import type { InvoiceDto, PayoutDto, PayoutSummaryDto, ReconciliationItemDto } from "@ryvra/domain-payments";
import { redactIdentifier } from "./privacy";

export interface MerchantTransactionRow {
  id: string;
  type: "invoice" | "payout" | "reconciliation";
  status: string;
  amountMinor: number;
  currency: string;
  payer: string;
  payee: string;
  timestamp: string;
  reference: string;
  retrySupported: boolean;
}

export interface MerchantKpiModel {
  totalVolumeMinor: number;
  successfulCount: number;
  successfulRate: number;
  pendingCount: number;
  failedCount: number;
  totalCount: number;
  currency: string;
}

export interface MerchantFilterInput {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface MerchantActionState {
  enabled: boolean;
  reason?: string;
}

export interface MerchantActionAvailability {
  createPaymentLink: MerchantActionState;
  exportTransactions: MerchantActionState;
  retryFailed: MerchantActionState;
}

function toEpoch(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPending(status: string): boolean {
  return /pending|processing|queued|scheduled|created|authorized|executing|running/i.test(status);
}

function isFailed(status: string): boolean {
  return /failed|mismatch|rejected|void|reversed|blocked/i.test(status);
}

function isSuccess(status: string): boolean {
  return /paid|completed|matched|settled|confirmed/i.test(status);
}

function inRange(timestamp: string, from?: string, to?: string): boolean {
  const value = toEpoch(timestamp);
  if (value === 0) {
    return false;
  }

  const fromBoundary = from ? toEpoch(from.length === 10 ? `${from}T00:00:00.000Z` : from) : 0;
  const toBoundary = to ? toEpoch(to.length === 10 ? `${to}T23:59:59.999Z` : to) : Number.MAX_SAFE_INTEGER;

  return value >= fromBoundary && value <= toBoundary;
}

export function buildMerchantTransactions(input: {
  invoices: InvoiceDto[];
  payouts: PayoutDto[];
  reconciliation: ReconciliationItemDto[];
}): MerchantTransactionRow[] {
  const invoiceRows = input.invoices.map<MerchantTransactionRow>((invoice) => ({
    id: `merchant-invoice-${invoice.id}`,
    type: "invoice",
    status: invoice.status,
    amountMinor: invoice.amountMinor,
    currency: invoice.currency,
    payer: redactIdentifier(invoice.customerName, 4, 2),
    payee: "Workspace account",
    timestamp: invoice.issuedAt,
    reference: invoice.invoiceNumber,
    retrySupported: invoice.status === "FAILED",
  }));

  const payoutRows = input.payouts.map<MerchantTransactionRow>((payout) => ({
    id: `merchant-payout-${payout.id}`,
    type: "payout",
    status: payout.status,
    amountMinor: payout.amountMinor,
    currency: payout.currency,
    payer: "Workspace treasury",
    payee: redactIdentifier(payout.destinationLabel, 4, 2),
    timestamp: payout.createdAt,
    reference: payout.id,
    retrySupported: payout.status === "FAILED",
  }));

  const reconciliationRows = input.reconciliation.map<MerchantTransactionRow>((item) => ({
    id: `merchant-reconciliation-${item.id}`,
    type: "reconciliation",
    status: item.status,
    amountMinor: Math.abs(item.actualAmountMinor),
    currency: item.currency,
    payer: "Settlement ledger",
    payee: redactIdentifier(item.entityId, 3, 2),
    timestamp: item.updatedAt,
    reference: item.runId,
    retrySupported: item.status === "FAILED",
  }));

  return [...payoutRows, ...invoiceRows, ...reconciliationRows].sort((left, right) => toEpoch(right.timestamp) - toEpoch(left.timestamp));
}

export function buildMerchantKpis(rows: readonly MerchantTransactionRow[], defaultCurrency = "USD"): MerchantKpiModel {
  const totalCount = rows.length;
  const successfulCount = rows.filter((row) => isSuccess(row.status)).length;
  const pendingCount = rows.filter((row) => isPending(row.status)).length;
  const failedCount = rows.filter((row) => isFailed(row.status)).length;

  return {
    totalVolumeMinor: rows.reduce((sum, row) => sum + Math.max(0, row.amountMinor), 0),
    successfulCount,
    successfulRate: totalCount > 0 ? successfulCount / totalCount : 0,
    pendingCount,
    failedCount,
    totalCount,
    currency: rows[0]?.currency ?? defaultCurrency,
  };
}

export function filterMerchantTransactions(rows: readonly MerchantTransactionRow[], filters: MerchantFilterInput): MerchantTransactionRow[] {
  const normalizedSearch = filters.search?.trim().toLowerCase() ?? "";
  const normalizedStatus = filters.status?.trim().toUpperCase();

  return rows.filter((row) => {
    if (normalizedStatus && normalizedStatus !== "ALL" && row.status.toUpperCase() !== normalizedStatus) {
      return false;
    }

    if (!inRange(row.timestamp, filters.from, filters.to)) {
      return false;
    }

    if (normalizedSearch.length > 0) {
      const haystack = `${row.reference} ${row.type} ${row.status} ${row.payer} ${row.payee}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }

    return true;
  });
}

export function resolveMerchantActionAvailability(input: {
  mode: RuntimeMode;
  hasRows: boolean;
  hasFailedRows: boolean;
}): MerchantActionAvailability {
  return {
    createPaymentLink: {
      enabled: false,
      reason: "Not available in current environment: payment-link endpoint is deferred.",
    },
    exportTransactions: {
      enabled: input.hasRows,
      ...(input.hasRows ? {} : { reason: "Export is unavailable until there are transactions to export." }),
    },
    retryFailed: {
      enabled: false,
      reason: input.hasFailedRows
        ? "Retry failed is deferred: retry mutation endpoint is not available."
        : "Retry failed is unavailable because there are no failed transactions.",
    },
  };
}

export function resolveMerchantDataSourceMode(mode: RuntimeMode): "remote" | "preview" {
  return mode === "http" ? "remote" : "preview";
}

export function buildMerchantSettlementSummary(summary: PayoutSummaryDto): {
  scheduledCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  totalAmountMinor: number;
  currency: string;
} {
  return {
    scheduledCount: summary.scheduledCount,
    processingCount: summary.processingCount,
    completedCount: summary.completedCount,
    failedCount: summary.failedCount,
    totalAmountMinor: summary.totalAmountMinor,
    currency: summary.currency,
  };
}
