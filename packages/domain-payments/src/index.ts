export type InvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "FAILED" | "VOID";

export type PayoutStatus = "SCHEDULED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type PayoutDestinationType = "BANK_ACCOUNT" | "WALLET" | "CARD";

export type ReconciliationStatus = "QUEUED" | "RUNNING" | "MATCHED" | "MISMATCH" | "FAILED";

export type ReconciliationEntityType = "INVOICE" | "PAYOUT";

export type SortDirection = "asc" | "desc";

export interface PayDateRangeFilter {
  from?: string;
  to?: string;
}

export interface PayPaginationRequest {
  page: number;
  pageSize: number;
}

export interface PaySortRequest {
  field: string;
  direction: SortDirection;
}

export interface PayPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PayListRequest<TFilters extends object> {
  filters?: TFilters;
  pagination?: PayPaginationRequest;
  sort?: PaySortRequest;
}

export interface PayListResponse<TItem> {
  items: TItem[];
  pagination: PayPaginationMeta;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  search?: string;
  dateRange?: PayDateRangeFilter;
}

export interface PayoutFilters {
  status?: PayoutStatus;
  destinationType?: PayoutDestinationType;
  dateRange?: PayDateRangeFilter;
}

export interface ReconciliationFilters {
  status?: ReconciliationStatus;
  dateRange?: PayDateRangeFilter;
  exceptionOnly?: boolean;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amountMinor: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  failedAt?: string;
  description?: string;
}

export interface InvoiceSummaryDto {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  totalAmountMinor: number;
  currency: string;
}

export interface PayoutDto {
  id: string;
  amountMinor: number;
  currency: string;
  status: PayoutStatus;
  destinationType: PayoutDestinationType;
  destinationLabel: string;
  createdAt: string;
  scheduledFor?: string;
  completedAt?: string;
  failureReason?: string;
}

export interface PayoutSummaryDto {
  scheduledCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  totalAmountMinor: number;
  currency: string;
}

export interface ReconciliationItemDto {
  id: string;
  runId: string;
  entityType: ReconciliationEntityType;
  entityId: string;
  status: ReconciliationStatus;
  expectedAmountMinor: number;
  actualAmountMinor: number;
  deltaMinor: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  exceptionCode?: string;
  exceptionMessage?: string;
}

export interface ReconciliationSummaryDto {
  runCount: number;
  matchedCount: number;
  mismatchCount: number;
  failedCount: number;
  exceptionCount: number;
  lastRunStatus: ReconciliationStatus;
  lastRunAt: string;
}

export interface PayOverviewMetricsDto {
  openInvoiceCount: number;
  pendingInvoiceAmountMinor: number;
  payoutInFlightCount: number;
  payoutProcessingAmountMinor: number;
  reconciliationMismatchCount: number;
  currency: string;
}

export interface PayActivityItemDto {
  id: string;
  type: "invoice" | "payout" | "reconciliation";
  title: string;
  status: InvoiceStatus | PayoutStatus | ReconciliationStatus;
  createdAt: string;
  amountMinor?: number;
  currency?: string;
}

export interface PayOverviewDto {
  metrics: PayOverviewMetricsDto;
  recentActivity: PayActivityItemDto[];
}

export interface SubscriptionDto {
  id: string;
  customerId: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  renewalAt: string;
}

export interface IdempotencyKeyInput {
  scope: string;
  reference: string;
  nonce?: string;
}

export function createIdempotencyKey(input: IdempotencyKeyInput): string {
  return [input.scope, input.reference, input.nonce ?? "default"].join(":");
}
