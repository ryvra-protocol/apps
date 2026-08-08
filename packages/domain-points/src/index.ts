export const pointEntryTypes = ["award", "spend", "adjustment", "reversal"] as const;
export type PointEntryType = (typeof pointEntryTypes)[number];

export const pointEntryStatuses = ["posted", "pending", "reversed", "failed"] as const;
export type PointEntryStatus = (typeof pointEntryStatuses)[number];

export const pointEntrySources = ["ledger", "task", "manual", "bonus"] as const;
export type PointEntrySource = (typeof pointEntrySources)[number];

export type PointsSortDirection = "asc" | "desc";

export interface PointsDateRangeFilter {
  from?: string;
  to?: string;
}

export interface PointsPaginationRequest {
  limit?: number;
  cursor?: string;
  /**
   * @deprecated Canonical pagination is cursor-first; retained for compatibility through at least 2027-06-30.
   */
  page?: number;
  /**
   * @deprecated Use `limit`.
   */
  pageSize?: number;
}

export interface PointsSortRequest {
  field: string;
  direction: PointsSortDirection;
}

export interface PointsPaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
  /**
   * @deprecated Canonical pagination is cursor-first.
   */
  page?: number;
}

export interface PointsListRequest<TFilters extends object> {
  filters?: TFilters;
  pagination?: PointsPaginationRequest;
  sort?: PointsSortRequest;
}

export interface PointsAccountScopedRequest {
  accountId: string;
}

export interface PointsAccountScopedListRequest<TFilters extends object>
  extends PointsListRequest<TFilters>,
    PointsAccountScopedRequest {}

export interface PointsAccountScopedSummaryRequest<TFilters extends object> extends PointsAccountScopedRequest {
  filters?: TFilters;
}

export interface PointEntryFilters {
  type?: PointEntryType;
  status?: PointEntryStatus;
  source?: PointEntrySource;
  search?: string;
  dateRange?: PointsDateRangeFilter;
  /**
   * @deprecated Use `type`.
   */
  entryType?: PointEntryType;
}

export interface PointEntryDto {
  id: string;
  accountId: string;
  type: PointEntryType;
  source: PointEntrySource;
  amount: number;
  balance: number;
  status: PointEntryStatus;
  timestamp: string;
  referenceId?: string;
  taskId?: string;
  description?: string;
  /**
   * @deprecated Use `balance`.
   */
  balanceAfter?: number;
}

export interface PointSummaryDto {
  asOf: string;
  accountId: string;
  totalPoints: number;
  earnedPoints: number;
  spentPoints: number;
  adjustedPoints: number;
  pendingPoints: number;
  byStatus: Record<string, number>;
}

export interface PointsListResponse<TItem> {
  asOf: string;
  items: TItem[];
  pagination: PointsPaginationMeta;
}

export interface PointsOverviewDto {
  asOf: string;
  accountId: string;
  summary: PointSummaryDto;
  recentEntries: PointEntryDto[];
}

export const pointsCanonicalErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "service_unavailable",
  "internal_error",
] as const;
export type PointsCanonicalErrorCode = (typeof pointsCanonicalErrorCodes)[number];

export interface PointsServiceErrorDto {
  code: PointsCanonicalErrorCode | string;
  message: string;
  retryable: boolean;
  source: string;
  details?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
}
