export const pointsApiVersions = ["2026-08-08.v1"] as const;
export type PointsApiVersion = (typeof pointsApiVersions)[number];

export const pointEntryTypes = [
  "transaction_reward",
  "task_completion_bonus",
  "referral_bonus",
  "manual_adjustment",
  "penalty",
  "reversal",
] as const;
export type PointEntryType = (typeof pointEntryTypes)[number];

export const pointEntryStatuses = ["pending", "confirmed", "rejected", "reversed", "expired"] as const;
export type PointEntryStatus = (typeof pointEntryStatuses)[number];

export const pointEntrySources = [
  "ledger_settlement",
  "policy_risk",
  "tasks_engine",
  "admin_console",
  "system_migration",
] as const;
export type PointEntrySource = (typeof pointEntrySources)[number];

export const pointsWindows = ["24h", "7d", "30d", "90d", "custom"] as const;
export type PointsWindow = (typeof pointsWindows)[number];

export const pointEntriesSortValues = [
  "occurred_at:desc",
  "occurred_at:asc",
  "created_at:desc",
  "created_at:asc",
] as const;
export type PointEntriesSortValue = (typeof pointEntriesSortValues)[number];

export interface PointsDateRangeFilter {
  occurredFrom?: string;
  occurredTo?: string;
}

export interface PointsPaginationRequest {
  limit?: number;
  cursor?: string;
  /**
   * @deprecated Canonical pagination is cursor-first; retained for compatibility through at least 2027-02-04.
   */
  page?: number;
}

export interface PointsSortRequest {
  value: PointEntriesSortValue;
}

export interface PointsDeprecatedPageMeta {
  page: number;
  translatedToCursor: string;
  removalNotBefore: string;
}

export interface PointsPaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PointsScopeContext {
  accountId: string;
  userId?: string | null;
  workspaceId?: string | null;
}

export interface PointsResponseMeta {
  apiVersion: PointsApiVersion;
  generatedAt: string;
  scope: PointsScopeContext;
  deprecatedPage?: PointsDeprecatedPageMeta | null;
}

export interface PointsListRequest<TFilters extends object> {
  filters?: TFilters;
  pagination?: PointsPaginationRequest;
  sort?: PointsSortRequest;
}

export interface PointsAccountScopedRequest {
  accountId: string;
  userId?: string;
  workspaceId?: string;
}

export interface PointsSummaryRequest extends PointsAccountScopedRequest {
  window?: PointsWindow;
  dateRange?: PointsDateRangeFilter;
}

export interface PointsOverviewRequest extends PointsAccountScopedRequest {
  window?: PointsWindow;
}

export interface PointsAccountScopedListRequest<TFilters extends object>
  extends PointsListRequest<TFilters>,
    PointsAccountScopedRequest {}

export interface PointsAccountScopedSummaryRequest<TFilters extends object> extends PointsAccountScopedRequest {
  filters?: TFilters;
}

export interface PointEntryFilters {
  entryType?: PointEntryType;
  entryStatus?: PointEntryStatus;
  entrySource?: PointEntrySource;
  dateRange?: PointsDateRangeFilter;
}

export interface PointEntryDto {
  entryId: string;
  accountId: string;
  userId?: string | null;
  workspaceId?: string | null;
  taskId?: string | null;
  ledgerEventId?: string | null;
  referenceId?: string | null;
  entryType: PointEntryType;
  entryStatus: PointEntryStatus;
  entrySource: PointEntrySource;
  pointsDelta: number;
  pointsBalanceAfter?: number | null;
  occurredAt: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface PointTypeAggregateDto {
  entryType: PointEntryType;
  entries: number;
  pointsTotal: number;
}

export interface PointStatusAggregateDto {
  entryStatus: PointEntryStatus;
  entries: number;
  pointsTotal: number;
}

export interface PointSourceAggregateDto {
  entrySource: PointEntrySource;
  entries: number;
  pointsTotal: number;
}

export interface PointSummaryDto {
  accountId: string;
  windowStart: string;
  windowEnd: string;
  totalPoints: number;
  availablePoints: number;
  pendingPoints: number;
  reversedPoints: number;
  entryCount: number;
  byType: PointTypeAggregateDto[];
  byStatus: PointStatusAggregateDto[];
  bySource: PointSourceAggregateDto[];
}

export interface PointTrendBucketDto {
  bucketStart: string;
  bucketEnd: string;
  pointsEarned: number;
  entries: number;
}

export interface PointsListResponse<TItem> {
  items: TItem[];
  pagination: PointsPaginationMeta;
  meta: PointsResponseMeta;
}

export interface PointsOverviewDto {
  accountId: string;
  windowStart: string;
  windowEnd: string;
  currentBalance: number;
  lifetimePoints: number;
  entriesLast24h: number;
  pointsLast24h: number;
  trend: PointTrendBucketDto[];
}

export const pointsCanonicalErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "upstream_unavailable",
  "internal_error",
] as const;
export type PointsCanonicalErrorCode = (typeof pointsCanonicalErrorCodes)[number];

export const pointsCanonicalErrorSources = [
  "points_tasks_api",
  "tasks_engine",
  "policy_risk",
  "ledger_settlement",
  "pay",
  "governance",
  "unknown",
] as const;
export type PointsCanonicalErrorSource = (typeof pointsCanonicalErrorSources)[number];

export interface PointsServiceErrorDto {
  code: PointsCanonicalErrorCode | string;
  message: string;
  retryable: boolean;
  source: PointsCanonicalErrorSource | string;
  details?: Record<string, unknown> | unknown[] | string;
  requestId?: string;
  correlationId?: string;
}
