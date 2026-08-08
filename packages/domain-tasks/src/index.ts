export const taskTypes = ["verification", "review", "reward", "operations"] as const;
export type TaskType = (typeof taskTypes)[number];

export const taskStatuses = ["open", "in_progress", "done", "failed", "blocked", "canceled"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export type TasksSortDirection = "asc" | "desc";

export interface TasksDateRangeFilter {
  from?: string;
  to?: string;
}

export interface TasksPaginationRequest {
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

export interface TasksSortRequest {
  field: string;
  direction: TasksSortDirection;
}

export interface TasksPaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
  /**
   * @deprecated Canonical pagination is cursor-first.
   */
  page?: number;
}

export interface TasksListRequest<TFilters extends object> {
  filters?: TFilters;
  pagination?: TasksPaginationRequest;
  sort?: TasksSortRequest;
}

export interface TasksAccountScopedRequest {
  accountId: string;
}

export interface TasksAccountScopedListRequest<TFilters extends object>
  extends TasksListRequest<TFilters>,
    TasksAccountScopedRequest {}

export interface TasksAccountScopedSummaryRequest<TFilters extends object> extends TasksAccountScopedRequest {
  filters?: TFilters;
}

export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  ownerId?: string;
  search?: string;
  dateRange?: TasksDateRangeFilter;
  /**
   * @deprecated Use `ownerId`.
   */
  owner?: string;
}

export interface TaskDto {
  id: string;
  accountId: string;
  title: string;
  type: TaskType;
  ownerId: string;
  status: TaskStatus;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
  completedAt?: string;
  description?: string;
  /**
   * @deprecated Use `progressPercent`.
   */
  progress?: number;
}

export interface TaskSummaryDto {
  asOf: string;
  accountId: string;
  total: number;
  open: number;
  inProgress: number;
  done: number;
  failed: number;
  byStatus: Record<string, number>;
}

export interface TasksListResponse<TItem> {
  asOf: string;
  items: TItem[];
  pagination: TasksPaginationMeta;
}

export interface TasksOverviewDto {
  asOf: string;
  accountId: string;
  summary: TaskSummaryDto;
  recentTasks: TaskDto[];
}

export const tasksCanonicalErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "service_unavailable",
  "internal_error",
] as const;
export type TasksCanonicalErrorCode = (typeof tasksCanonicalErrorCodes)[number];

export interface TasksServiceErrorDto {
  code: TasksCanonicalErrorCode | string;
  message: string;
  retryable: boolean;
  source: string;
  details?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
}
