import {
  pointEntrySources,
  pointEntryStatuses,
  pointEntryTypes,
  type PointEntryDto,
  type PointSummaryDto,
  type PointsListResponse,
  type PointsOverviewDto,
} from "@ryvra/domain-points";
import {
  taskStatuses,
  taskTypes,
  type TaskDto,
  type TaskSummaryDto,
  type TasksListResponse,
  type TasksOverviewDto,
} from "@ryvra/domain-tasks";

function ensureObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function ensureString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  return value;
}

function ensureNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }

  return value;
}

function ensureBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }

  return value;
}

function ensureArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  return ensureString(value, label);
}

function optionalNumber(value: unknown, label: string): number | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  return ensureNumber(value, label);
}

function firstPresent(payload: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (typeof payload[key] !== "undefined") {
      return payload[key];
    }
  }

  return undefined;
}

function assertEnum<T extends string>(value: string, values: readonly string[], label: string): T {
  if (!values.includes(value)) {
    throw new Error(`${label} has unsupported enum value: ${value}`);
  }

  return value as T;
}

function decodeCursorPagination(value: unknown): {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
  page?: number;
} {
  const payload = ensureObject(value, "pagination");

  if (typeof payload.limit !== "undefined" || typeof payload.has_more !== "undefined" || typeof payload.hasMore !== "undefined") {
    const nextCursor = optionalString(payload.next_cursor ?? payload.nextCursor, "pagination.next_cursor");
    const page = optionalNumber(payload.page, "pagination.page");
    return {
      limit: ensureNumber(payload.limit, "pagination.limit"),
      hasMore: ensureBoolean(payload.has_more ?? payload.hasMore, "pagination.has_more"),
      ...(nextCursor ? { nextCursor } : {}),
      ...(typeof page === "number" ? { page } : {}),
    };
  }

  const currentPage = ensureNumber(payload.page, "pagination.page");
  const pageSize = ensureNumber(payload.pageSize, "pagination.pageSize");
  const totalPages = ensureNumber(payload.totalPages, "pagination.totalPages");
  const hasMore = currentPage < totalPages;

  return {
    limit: pageSize,
    hasMore,
    ...(hasMore ? { nextCursor: `legacy-page-${currentPage + 1}` } : {}),
    page: currentPage,
  };
}

function decodePointsListResponse<TItem>(value: unknown, decodeItem: (entry: unknown) => TItem): PointsListResponse<TItem> {
  const payload = ensureObject(value, "points list response");
  const asOf = optionalString(firstPresent(payload, ["as_of", "asOf", "timestamp"]), "points.as_of") ?? new Date(0).toISOString();
  const rawItems = firstPresent(payload, ["items", "data"]);

  return {
    asOf,
    items: ensureArray(rawItems, "points.items").map((entry) => decodeItem(entry)),
    pagination: decodeCursorPagination(firstPresent(payload, ["pagination", "page"])),
  };
}

function decodeTasksListResponse<TItem>(value: unknown, decodeItem: (entry: unknown) => TItem): TasksListResponse<TItem> {
  const payload = ensureObject(value, "tasks list response");
  const asOf = optionalString(firstPresent(payload, ["as_of", "asOf", "timestamp"]), "tasks.as_of") ?? new Date(0).toISOString();
  const rawItems = firstPresent(payload, ["items", "data"]);

  return {
    asOf,
    items: ensureArray(rawItems, "tasks.items").map((entry) => decodeItem(entry)),
    pagination: decodeCursorPagination(firstPresent(payload, ["pagination", "page"])),
  };
}

function decodePointEntry(value: unknown): PointEntryDto {
  const payload = ensureObject(value, "point entry");
  const fallbackBalance = optionalNumber(payload.balance_after, "pointEntry.balance_after");
  const balance = optionalNumber(firstPresent(payload, ["running_balance", "balance"]), "pointEntry.running_balance") ?? fallbackBalance;

  if (typeof balance !== "number") {
    throw new Error("pointEntry.running_balance is required");
  }

  return {
    id: ensureString(firstPresent(payload, ["entry_id", "id"]), "pointEntry.entry_id"),
    accountId: ensureString(firstPresent(payload, ["account_id", "accountId"]), "pointEntry.account_id"),
    type: assertEnum(
      ensureString(firstPresent(payload, ["entry_type", "type"]), "pointEntry.entry_type"),
      pointEntryTypes,
      "pointEntry.entry_type",
    ),
    source: assertEnum(
      ensureString(firstPresent(payload, ["source"]), "pointEntry.source"),
      pointEntrySources,
      "pointEntry.source",
    ),
    amount: ensureNumber(firstPresent(payload, ["amount_points", "amount"]), "pointEntry.amount_points"),
    balance,
    status: assertEnum(
      ensureString(firstPresent(payload, ["status"]), "pointEntry.status"),
      pointEntryStatuses,
      "pointEntry.status",
    ),
    timestamp: ensureString(firstPresent(payload, ["occurred_at", "timestamp", "created_at"]), "pointEntry.occurred_at"),
    ...(optionalString(firstPresent(payload, ["reference_id", "referenceId"]), "pointEntry.reference_id")
      ? { referenceId: ensureString(firstPresent(payload, ["reference_id", "referenceId"]), "pointEntry.reference_id") }
      : {}),
    ...(optionalString(firstPresent(payload, ["task_id", "taskId"]), "pointEntry.task_id")
      ? { taskId: ensureString(firstPresent(payload, ["task_id", "taskId"]), "pointEntry.task_id") }
      : {}),
    ...(optionalString(firstPresent(payload, ["description"]), "pointEntry.description")
      ? { description: ensureString(firstPresent(payload, ["description"]), "pointEntry.description") }
      : {}),
    ...(typeof fallbackBalance === "number" ? { balanceAfter: fallbackBalance } : {}),
  };
}

function decodeTask(value: unknown): TaskDto {
  const payload = ensureObject(value, "task");
  const deprecatedProgress = optionalNumber(payload.progress, "task.progress");
  const progressPercent =
    optionalNumber(firstPresent(payload, ["progress_percent", "progressPercent"]), "task.progress_percent") ?? deprecatedProgress;

  if (typeof progressPercent !== "number") {
    throw new Error("task.progress_percent is required");
  }

  return {
    id: ensureString(firstPresent(payload, ["task_id", "id"]), "task.task_id"),
    accountId: ensureString(firstPresent(payload, ["account_id", "accountId"]), "task.account_id"),
    title: ensureString(firstPresent(payload, ["title"]), "task.title"),
    type: assertEnum(
      ensureString(firstPresent(payload, ["type"]), "task.type"),
      taskTypes,
      "task.type",
    ),
    ownerId: ensureString(firstPresent(payload, ["owner_id", "ownerId", "owner"]), "task.owner_id"),
    status: assertEnum(
      ensureString(firstPresent(payload, ["status"]), "task.status"),
      taskStatuses,
      "task.status",
    ),
    progressPercent,
    createdAt: ensureString(firstPresent(payload, ["created_at", "createdAt"]), "task.created_at"),
    updatedAt: ensureString(firstPresent(payload, ["updated_at", "updatedAt"]), "task.updated_at"),
    ...(optionalString(firstPresent(payload, ["due_at", "dueAt"]), "task.due_at")
      ? { dueAt: ensureString(firstPresent(payload, ["due_at", "dueAt"]), "task.due_at") }
      : {}),
    ...(optionalString(firstPresent(payload, ["completed_at", "completedAt"]), "task.completed_at")
      ? { completedAt: ensureString(firstPresent(payload, ["completed_at", "completedAt"]), "task.completed_at") }
      : {}),
    ...(optionalString(firstPresent(payload, ["description"]), "task.description")
      ? { description: ensureString(firstPresent(payload, ["description"]), "task.description") }
      : {}),
    ...(typeof deprecatedProgress === "number" ? { progress: deprecatedProgress } : {}),
  };
}

export function decodePointEntriesList(value: unknown): PointsListResponse<PointEntryDto> {
  return decodePointsListResponse(value, decodePointEntry);
}

export function decodeTasksList(value: unknown): TasksListResponse<TaskDto> {
  return decodeTasksListResponse(value, decodeTask);
}

export function decodePointSummary(value: unknown): PointSummaryDto {
  const payload = ensureObject(value, "point summary");
  return {
    asOf: ensureString(firstPresent(payload, ["as_of", "asOf"]), "pointSummary.as_of"),
    accountId: ensureString(firstPresent(payload, ["account_id", "accountId"]), "pointSummary.account_id"),
    totalPoints: ensureNumber(firstPresent(payload, ["total_points", "totalPoints"]), "pointSummary.total_points"),
    earnedPoints: ensureNumber(firstPresent(payload, ["earned_points", "earnedPoints"]), "pointSummary.earned_points"),
    spentPoints: ensureNumber(firstPresent(payload, ["spent_points", "spentPoints"]), "pointSummary.spent_points"),
    adjustedPoints: ensureNumber(firstPresent(payload, ["adjusted_points", "adjustedPoints"]), "pointSummary.adjusted_points"),
    pendingPoints: ensureNumber(firstPresent(payload, ["pending_points", "pendingPoints"]), "pointSummary.pending_points"),
    byStatus: Object.fromEntries(
      Object.entries(ensureObject(firstPresent(payload, ["by_status", "byStatus"]) ?? {}, "pointSummary.by_status")).map(
        ([key, entry]) => [key, ensureNumber(entry, `pointSummary.by_status.${key}`)],
      ),
    ),
  };
}

export function decodeTaskSummary(value: unknown): TaskSummaryDto {
  const payload = ensureObject(value, "task summary");
  return {
    asOf: ensureString(firstPresent(payload, ["as_of", "asOf"]), "taskSummary.as_of"),
    accountId: ensureString(firstPresent(payload, ["account_id", "accountId"]), "taskSummary.account_id"),
    total: ensureNumber(firstPresent(payload, ["total"]), "taskSummary.total"),
    open: ensureNumber(firstPresent(payload, ["open"]), "taskSummary.open"),
    inProgress: ensureNumber(firstPresent(payload, ["in_progress", "inProgress"]), "taskSummary.in_progress"),
    done: ensureNumber(firstPresent(payload, ["done"]), "taskSummary.done"),
    failed: ensureNumber(firstPresent(payload, ["failed"]), "taskSummary.failed"),
    byStatus: Object.fromEntries(
      Object.entries(ensureObject(firstPresent(payload, ["by_status", "byStatus"]) ?? {}, "taskSummary.by_status")).map(
        ([key, entry]) => [key, ensureNumber(entry, `taskSummary.by_status.${key}`)],
      ),
    ),
  };
}

export function decodePointsOverview(value: unknown): PointsOverviewDto {
  const payload = ensureObject(value, "points overview");
  const summaryPayload = firstPresent(payload, ["summary"]) ?? payload;
  const recentEntries = firstPresent(payload, ["recent_entries", "recentEntries", "items"]) ?? [];

  return {
    asOf: ensureString(firstPresent(payload, ["as_of", "asOf"]), "pointsOverview.as_of"),
    accountId: ensureString(firstPresent(payload, ["account_id", "accountId"]), "pointsOverview.account_id"),
    summary: decodePointSummary(summaryPayload),
    recentEntries: ensureArray(recentEntries, "pointsOverview.recent_entries").map((entry) => decodePointEntry(entry)),
  };
}

export function decodeTasksOverview(value: unknown): TasksOverviewDto {
  const payload = ensureObject(value, "tasks overview");
  const summaryPayload = firstPresent(payload, ["summary"]) ?? payload;
  const recentTasks = firstPresent(payload, ["recent_tasks", "recentTasks", "items"]) ?? [];

  return {
    asOf: ensureString(firstPresent(payload, ["as_of", "asOf"]), "tasksOverview.as_of"),
    accountId: ensureString(firstPresent(payload, ["account_id", "accountId"]), "tasksOverview.account_id"),
    summary: decodeTaskSummary(summaryPayload),
    recentTasks: ensureArray(recentTasks, "tasksOverview.recent_tasks").map((entry) => decodeTask(entry)),
  };
}
