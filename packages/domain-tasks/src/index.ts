export const tasksApiVersions = ["2026-08-08.v1"] as const;
export type TasksApiVersion = (typeof tasksApiVersions)[number];

export const taskTypes = ["onboarding", "transaction_volume", "referral", "governance", "security", "ecosystem", "custom"] as const;
export type TaskType = (typeof taskTypes)[number];

export const taskStatuses = ["not_started", "eligible", "in_progress", "completed", "failed", "expired", "canceled"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskProgressStates = ["queued", "active", "blocked", "under_review", "done"] as const;
export type TaskProgressState = (typeof taskProgressStates)[number];

export const tasksWindows = ["24h", "7d", "30d", "90d", "custom"] as const;
export type TasksWindow = (typeof tasksWindows)[number];

export const taskSortValues = [
  "updated_at:desc",
  "updated_at:asc",
  "created_at:desc",
  "created_at:asc",
  "due_at:asc",
  "due_at:desc",
] as const;
export type TaskSortValue = (typeof taskSortValues)[number];

export interface TasksDateRangeFilter {
  dueAfter?: string;
  dueBefore?: string;
}

export interface TasksPaginationRequest {
  limit?: number;
  cursor?: string;
  /**
   * @deprecated Canonical pagination is cursor-first; retained for compatibility through at least 2027-02-04.
   */
  page?: number;
}

export interface TasksSortRequest {
  value: TaskSortValue;
}

export interface TasksDeprecatedPageMeta {
  page: number;
  translatedToCursor: string;
  removalNotBefore: string;
}

export interface TasksPaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface TasksScopeContext {
  accountId: string;
  userId?: string | null;
  workspaceId?: string | null;
}

export interface TasksResponseMeta {
  apiVersion: TasksApiVersion;
  generatedAt: string;
  scope: TasksScopeContext;
  deprecatedPage?: TasksDeprecatedPageMeta | null;
}

export interface TasksListRequest<TFilters extends object> {
  filters?: TFilters;
  pagination?: TasksPaginationRequest;
  sort?: TasksSortRequest;
}

export interface TasksAccountScopedRequest {
  accountId: string;
  userId?: string;
  workspaceId?: string;
}

export interface TasksOverviewRequest extends TasksAccountScopedRequest {
  window?: TasksWindow;
}

export interface TasksAccountScopedListRequest<TFilters extends object>
  extends TasksListRequest<TFilters>,
    TasksAccountScopedRequest {}

export interface TasksAccountScopedSummaryRequest<TFilters extends object> extends TasksAccountScopedRequest {
  filters?: TFilters;
}

export interface TaskFilters {
  taskStatus?: TaskStatus;
  taskType?: TaskType;
  progressState?: TaskProgressState;
  dateRange?: TasksDateRangeFilter;
}

export interface TaskDto {
  taskId: string;
  accountId: string;
  userId?: string | null;
  workspaceId?: string | null;
  taskType: TaskType;
  taskStatus: TaskStatus;
  progressState: TaskProgressState;
  title: string;
  description?: string | null;
  progressPercent: number;
  pointsReward: number;
  dueAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStatusAggregateDto {
  taskStatus: TaskStatus;
  count: number;
}

export interface TaskProgressAggregateDto {
  progressState: TaskProgressState;
  count: number;
}

export interface TaskSummaryDto {
  accountId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  byStatus: TaskStatusAggregateDto[];
  byProgressState: TaskProgressAggregateDto[];
}

export interface TaskOverviewItemDto {
  taskId: string;
  taskType: TaskType;
  taskStatus: TaskStatus;
  progressState: TaskProgressState;
  progressPercent: number;
}

export interface TasksListResponse<TItem> {
  items: TItem[];
  pagination: TasksPaginationMeta;
  meta: TasksResponseMeta;
}

export interface TasksOverviewDto {
  accountId: string;
  windowStart: string;
  windowEnd: string;
  completionRate: number;
  tasksCreated: number;
  tasksCompleted: number;
  recentlyCompleted: TaskOverviewItemDto[];
  atRisk: TaskOverviewItemDto[];
}

export const tasksCanonicalErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "upstream_unavailable",
  "internal_error",
] as const;
export type TasksCanonicalErrorCode = (typeof tasksCanonicalErrorCodes)[number];

export const tasksCanonicalErrorSources = [
  "points_tasks_api",
  "tasks_engine",
  "policy_risk",
  "ledger_settlement",
  "pay",
  "governance",
  "unknown",
] as const;
export type TasksCanonicalErrorSource = (typeof tasksCanonicalErrorSources)[number];

export interface TasksServiceErrorDto {
  code: TasksCanonicalErrorCode | string;
  message: string;
  retryable: boolean;
  source: TasksCanonicalErrorSource | string;
  details?: Record<string, unknown> | unknown[] | string;
  requestId?: string;
  correlationId?: string;
}
