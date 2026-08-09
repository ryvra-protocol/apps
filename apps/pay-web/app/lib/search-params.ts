import {
  invoiceStatuses,
  payoutDestinationTypes,
  payoutStatuses,
  reconciliationStatuses,
  type InvoiceStatus,
  type PayDateRangeFilter,
  type PayoutDestinationType,
  type PayoutStatus,
  type ReconciliationStatus,
  type SortDirection,
} from "@ryvra/domain-payments";

export type RouteSearchParams = Record<string, string | string[] | undefined> | undefined;

const invoiceStatusSet = new Set<InvoiceStatus>(invoiceStatuses);
const payoutStatusSet = new Set<PayoutStatus>(payoutStatuses);
const payoutDestinationTypeSet = new Set<PayoutDestinationType>(payoutDestinationTypes);
const reconciliationStatusSet = new Set<ReconciliationStatus>(reconciliationStatuses);

export function getFirstParam(searchParams: RouteSearchParams, key: string): string | undefined {
  const raw = searchParams?.[key];
  if (Array.isArray(raw)) {
    return raw[0];
  }

  return raw;
}

export function parseDateRange(searchParams: RouteSearchParams): PayDateRangeFilter | undefined {
  const from = getFirstParam(searchParams, "from")?.trim();
  const to = getFirstParam(searchParams, "to")?.trim();

  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function parseSortDirection(searchParams: RouteSearchParams): SortDirection {
  return getFirstParam(searchParams, "sortDirection") === "asc" ? "asc" : "desc";
}

export function parsePage(searchParams: RouteSearchParams): number {
  const pageValue = Number.parseInt(getFirstParam(searchParams, "page") ?? "1", 10);
  return Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
}

export function parsePageSize(searchParams: RouteSearchParams, fallback = 20): number {
  const pageSizeValue = Number.parseInt(getFirstParam(searchParams, "pageSize") ?? String(fallback), 10);
  if (!Number.isFinite(pageSizeValue) || pageSizeValue <= 0) {
    return fallback;
  }

  return Math.min(pageSizeValue, 100);
}

export function parseInvoiceStatus(searchParams: RouteSearchParams): InvoiceStatus | undefined {
  const status = getFirstParam(searchParams, "status")?.toUpperCase();
  return status && invoiceStatusSet.has(status as InvoiceStatus) ? (status as InvoiceStatus) : undefined;
}

export function parsePayoutStatus(searchParams: RouteSearchParams): PayoutStatus | undefined {
  const status = getFirstParam(searchParams, "status")?.toUpperCase();
  return status && payoutStatusSet.has(status as PayoutStatus) ? (status as PayoutStatus) : undefined;
}

export function parsePayoutDestinationType(searchParams: RouteSearchParams): PayoutDestinationType | undefined {
  const destinationType = getFirstParam(searchParams, "destinationType")?.toUpperCase();
  return destinationType && payoutDestinationTypeSet.has(destinationType as PayoutDestinationType)
    ? (destinationType as PayoutDestinationType)
    : undefined;
}

export function parseReconciliationStatus(searchParams: RouteSearchParams): ReconciliationStatus | undefined {
  const status = getFirstParam(searchParams, "status")?.toUpperCase();
  return status && reconciliationStatusSet.has(status as ReconciliationStatus) ? (status as ReconciliationStatus) : undefined;
}

export function parseExceptionOnly(searchParams: RouteSearchParams): boolean {
  return getFirstParam(searchParams, "exceptionOnly") === "true";
}
