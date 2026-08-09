import {
  pointEntrySources,
  pointEntryStatuses,
  pointEntryTypes,
  pointsApiVersions,
  type PointEntryDto,
  type PointSummaryDto,
  type PointsListResponse,
  type PointsOverviewDto,
  type PointsPaginationMeta,
  type PointsResponseMeta,
} from "@ryvra/domain-points";
import {
  taskProgressStates,
  taskStatuses,
  taskTypes,
  tasksApiVersions,
  type TaskDto,
  type TaskSummaryDto,
  type TasksListResponse,
  type TasksOverviewDto,
  type TasksPaginationMeta,
  type TasksResponseMeta,
} from "@ryvra/domain-tasks";
import { dailyClaimStatuses, type DailyClaimStateDto } from "@ryvra/domain-tokenomics";

const supportedPointsTasksApiVersions = new Set<string>([...pointsApiVersions, ...tasksApiVersions]);

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

function ensureEnum<T extends string>(value: string, values: readonly string[], label: string): T {
  if (!values.includes(value)) {
    throw new Error(`${label} has unsupported enum value: ${value}`);
  }

  return value as T;
}

function firstPresent(payload: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    if (typeof payload[key] !== "undefined") {
      return payload[key];
    }
  }

  return undefined;
}

function optionalNullableString(value: unknown, label: string): string | null | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return ensureString(value, label);
}

function optionalNullableNumber(value: unknown, label: string): number | null | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return ensureNumber(value, label);
}

function optionalMetadata(value: unknown, label: string): Record<string, unknown> | null | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  function decodeDailyClaimStatusValue(
    payload: Record<string, unknown>,
    eligible: boolean,
    reasonCode: string | undefined,
  ): DailyClaimStateDto["status"] {
    const explicitStatus = optionalNullableString(firstPresent(payload, ["status"]), "dailyClaim.status");
    if (typeof explicitStatus === "string") {
      return ensureEnum(explicitStatus, dailyClaimStatuses, "dailyClaim.status");
    }

    if (eligible) {
      return "available";
    }

    if (typeof reasonCode === "string") {
      const normalizedReason = reasonCode.toLowerCase();
      if (normalizedReason.includes("cooldown")) {
        return "cooldown";
      }
    }

    return "already_claimed";
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new Error(`${label} must be an object or null`);
}

function decodeDeprecatedPage(value: unknown, label: string): PointsResponseMeta["deprecatedPage"] {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const payload = ensureObject(value, label);

  return {
    page: ensureNumber(payload.page, `${label}.page`),
    translatedToCursor: ensureString(payload.translated_to_cursor, `${label}.translated_to_cursor`),
    removalNotBefore: ensureString(payload.removal_not_before, `${label}.removal_not_before`),
  };
}

function decodeResponseMeta(value: unknown, label: string): PointsResponseMeta {
  const payload = ensureObject(value, label);
  const scopePayload = ensureObject(payload.scope, `${label}.scope`);
  const apiVersion = ensureString(payload.api_version, `${label}.api_version`);

  if (!supportedPointsTasksApiVersions.has(apiVersion)) {
    throw new Error(`${label}.api_version has unsupported value: ${apiVersion}`);
  }

  const userId = optionalNullableString(scopePayload.user_id, `${label}.scope.user_id`);
  const workspaceId = optionalNullableString(scopePayload.workspace_id, `${label}.scope.workspace_id`);
  const deprecatedPage = decodeDeprecatedPage(payload.deprecated_page, `${label}.deprecated_page`);

  return {
    apiVersion: apiVersion as PointsResponseMeta["apiVersion"],
    generatedAt: ensureString(payload.generated_at, `${label}.generated_at`),
    scope: {
      accountId: ensureString(scopePayload.account_id, `${label}.scope.account_id`),
      ...(typeof userId !== "undefined" ? { userId } : {}),
      ...(typeof workspaceId !== "undefined" ? { workspaceId } : {}),
    },
    ...(typeof deprecatedPage === "undefined" ? {} : { deprecatedPage }),
  };
}

function decodeCursorPagination(value: unknown, label: string): PointsPaginationMeta {
  const payload = ensureObject(value, label);
  const nextCursor = optionalNullableString(payload.next_cursor, `${label}.next_cursor`);

  return {
    limit: ensureNumber(payload.limit, `${label}.limit`),
    hasMore: ensureBoolean(payload.has_more, `${label}.has_more`),
    ...(typeof nextCursor === "string" ? { nextCursor } : {}),
  };
}

function decodePointEntry(value: unknown): PointEntryDto {
  const payload = ensureObject(value, "point entry");

  const userId = optionalNullableString(payload.user_id, "pointEntry.user_id");
  const workspaceId = optionalNullableString(payload.workspace_id, "pointEntry.workspace_id");
  const taskId = optionalNullableString(payload.task_id, "pointEntry.task_id");
  const ledgerEventId = optionalNullableString(payload.ledger_event_id, "pointEntry.ledger_event_id");
  const referenceId = optionalNullableString(payload.reference_id, "pointEntry.reference_id");
  const pointsBalanceAfter = optionalNullableNumber(payload.points_balance_after, "pointEntry.points_balance_after");
  const metadata = optionalMetadata(payload.metadata, "pointEntry.metadata");

  return {
    entryId: ensureString(payload.entry_id, "pointEntry.entry_id"),
    accountId: ensureString(payload.account_id, "pointEntry.account_id"),
    entryType: ensureEnum(ensureString(payload.entry_type, "pointEntry.entry_type"), pointEntryTypes, "pointEntry.entry_type"),
    entryStatus: ensureEnum(
      ensureString(payload.entry_status, "pointEntry.entry_status"),
      pointEntryStatuses,
      "pointEntry.entry_status",
    ),
    entrySource: ensureEnum(
      ensureString(payload.entry_source, "pointEntry.entry_source"),
      pointEntrySources,
      "pointEntry.entry_source",
    ),
    pointsDelta: ensureNumber(payload.points_delta, "pointEntry.points_delta"),
    occurredAt: ensureString(payload.occurred_at, "pointEntry.occurred_at"),
    createdAt: ensureString(payload.created_at, "pointEntry.created_at"),
    ...(typeof userId !== "undefined" ? { userId } : {}),
    ...(typeof workspaceId !== "undefined" ? { workspaceId } : {}),
    ...(typeof taskId !== "undefined" ? { taskId } : {}),
    ...(typeof ledgerEventId !== "undefined" ? { ledgerEventId } : {}),
    ...(typeof referenceId !== "undefined" ? { referenceId } : {}),
    ...(typeof pointsBalanceAfter !== "undefined" ? { pointsBalanceAfter } : {}),
    ...(typeof metadata !== "undefined" ? { metadata } : {}),
  };
}

function decodeTask(value: unknown): TaskDto {
  const payload = ensureObject(value, "task");

  const userId = optionalNullableString(payload.user_id, "task.user_id");
  const workspaceId = optionalNullableString(payload.workspace_id, "task.workspace_id");
  const description = optionalNullableString(payload.description, "task.description");
  const dueAt = optionalNullableString(payload.due_at, "task.due_at");
  const startedAt = optionalNullableString(payload.started_at, "task.started_at");
  const completedAt = optionalNullableString(payload.completed_at, "task.completed_at");

  return {
    taskId: ensureString(payload.task_id, "task.task_id"),
    accountId: ensureString(payload.account_id, "task.account_id"),
    taskType: ensureEnum(ensureString(payload.task_type, "task.task_type"), taskTypes, "task.task_type"),
    taskStatus: ensureEnum(ensureString(payload.task_status, "task.task_status"), taskStatuses, "task.task_status"),
    progressState: ensureEnum(
      ensureString(payload.progress_state, "task.progress_state"),
      taskProgressStates,
      "task.progress_state",
    ),
    title: ensureString(payload.title, "task.title"),
    progressPercent: ensureNumber(payload.progress_percent, "task.progress_percent"),
    pointsReward: ensureNumber(payload.points_reward, "task.points_reward"),
    createdAt: ensureString(payload.created_at, "task.created_at"),
    updatedAt: ensureString(payload.updated_at, "task.updated_at"),
    ...(typeof userId !== "undefined" ? { userId } : {}),
    ...(typeof workspaceId !== "undefined" ? { workspaceId } : {}),
    ...(typeof description !== "undefined" ? { description } : {}),
    ...(typeof dueAt !== "undefined" ? { dueAt } : {}),
    ...(typeof startedAt !== "undefined" ? { startedAt } : {}),
    ...(typeof completedAt !== "undefined" ? { completedAt } : {}),
  };
}

function decodePointsListResponse<TItem>(value: unknown, decodeItem: (entry: unknown) => TItem): PointsListResponse<TItem> {
  const payload = ensureObject(value, "points list response");

  return {
    items: ensureArray(payload.data, "points.data").map((entry) => decodeItem(entry)),
    pagination: decodeCursorPagination(payload.page, "points.page"),
    meta: decodeResponseMeta(payload.meta, "points.meta"),
  };
}

function decodeTasksListResponse<TItem>(value: unknown, decodeItem: (entry: unknown) => TItem): TasksListResponse<TItem> {
  const payload = ensureObject(value, "tasks list response");

  return {
    items: ensureArray(payload.data, "tasks.data").map((entry) => decodeItem(entry)),
    pagination: decodeCursorPagination(payload.page, "tasks.page") as TasksPaginationMeta,
    meta: decodeResponseMeta(payload.meta, "tasks.meta") as TasksResponseMeta,
  };
}

function decodePointSummaryAggregateByType(value: unknown): PointSummaryDto["byType"][number] {
  const payload = ensureObject(value, "pointSummary.by_type[]");

  return {
    entryType: ensureEnum(
      ensureString(payload.entry_type, "pointSummary.by_type[].entry_type"),
      pointEntryTypes,
      "pointSummary.by_type[].entry_type",
    ),
    entries: ensureNumber(payload.entries, "pointSummary.by_type[].entries"),
    pointsTotal: ensureNumber(payload.points_total, "pointSummary.by_type[].points_total"),
  };
}

function decodePointSummaryAggregateByStatus(value: unknown): PointSummaryDto["byStatus"][number] {
  const payload = ensureObject(value, "pointSummary.by_status[]");

  return {
    entryStatus: ensureEnum(
      ensureString(payload.entry_status, "pointSummary.by_status[].entry_status"),
      pointEntryStatuses,
      "pointSummary.by_status[].entry_status",
    ),
    entries: ensureNumber(payload.entries, "pointSummary.by_status[].entries"),
    pointsTotal: ensureNumber(payload.points_total, "pointSummary.by_status[].points_total"),
  };
}

function decodePointSummaryAggregateBySource(value: unknown): PointSummaryDto["bySource"][number] {
  const payload = ensureObject(value, "pointSummary.by_source[]");

  return {
    entrySource: ensureEnum(
      ensureString(payload.entry_source, "pointSummary.by_source[].entry_source"),
      pointEntrySources,
      "pointSummary.by_source[].entry_source",
    ),
    entries: ensureNumber(payload.entries, "pointSummary.by_source[].entries"),
    pointsTotal: ensureNumber(payload.points_total, "pointSummary.by_source[].points_total"),
  };
}

export function decodePointEntriesList(value: unknown): PointsListResponse<PointEntryDto> {
  return decodePointsListResponse(value, decodePointEntry);
}

export function decodeTasksList(value: unknown): TasksListResponse<TaskDto> {
  return decodeTasksListResponse(value, decodeTask);
}

export function decodePointSummary(value: unknown): PointSummaryDto {
  const payload = ensureObject(value, "point summary response");
  const summaryPayload = payload.summary ? ensureObject(payload.summary, "point summary") : payload;

  return {
    accountId: ensureString(summaryPayload.account_id, "pointSummary.account_id"),
    windowStart: ensureString(summaryPayload.window_start, "pointSummary.window_start"),
    windowEnd: ensureString(summaryPayload.window_end, "pointSummary.window_end"),
    totalPoints: ensureNumber(summaryPayload.total_points, "pointSummary.total_points"),
    availablePoints: ensureNumber(summaryPayload.available_points, "pointSummary.available_points"),
    pendingPoints: ensureNumber(summaryPayload.pending_points, "pointSummary.pending_points"),
    reversedPoints: ensureNumber(summaryPayload.reversed_points, "pointSummary.reversed_points"),
    entryCount: ensureNumber(summaryPayload.entry_count, "pointSummary.entry_count"),
    byType: ensureArray(summaryPayload.by_type, "pointSummary.by_type").map((entry) => decodePointSummaryAggregateByType(entry)),
    byStatus: ensureArray(summaryPayload.by_status, "pointSummary.by_status").map((entry) => decodePointSummaryAggregateByStatus(entry)),
    bySource: ensureArray(summaryPayload.by_source, "pointSummary.by_source").map((entry) => decodePointSummaryAggregateBySource(entry)),
  };
}

function decodePointTrendBucket(value: unknown): PointsOverviewDto["trend"][number] {
  const payload = ensureObject(value, "pointsOverview.trend[]");

  return {
    bucketStart: ensureString(payload.bucket_start, "pointsOverview.trend[].bucket_start"),
    bucketEnd: ensureString(payload.bucket_end, "pointsOverview.trend[].bucket_end"),
    pointsEarned: ensureNumber(payload.points_earned, "pointsOverview.trend[].points_earned"),
    entries: ensureNumber(payload.entries, "pointsOverview.trend[].entries"),
  };
}

export function decodePointsOverview(value: unknown): PointsOverviewDto {
  const payload = ensureObject(value, "points overview response");
  const overviewPayload = payload.overview ? ensureObject(payload.overview, "points overview") : payload;

  return {
    accountId: ensureString(overviewPayload.account_id, "pointsOverview.account_id"),
    windowStart: ensureString(overviewPayload.window_start, "pointsOverview.window_start"),
    windowEnd: ensureString(overviewPayload.window_end, "pointsOverview.window_end"),
    currentBalance: ensureNumber(overviewPayload.current_balance, "pointsOverview.current_balance"),
    lifetimePoints: ensureNumber(overviewPayload.lifetime_points, "pointsOverview.lifetime_points"),
    entriesLast24h: ensureNumber(overviewPayload.entries_last_24h, "pointsOverview.entries_last_24h"),
    pointsLast24h: ensureNumber(overviewPayload.points_last_24h, "pointsOverview.points_last_24h"),
    trend: ensureArray(overviewPayload.trend, "pointsOverview.trend").map((entry) => decodePointTrendBucket(entry)),
  };
}

function decodeTaskStatusAggregate(value: unknown): TaskSummaryDto["byStatus"][number] {
  const payload = ensureObject(value, "taskSummary.by_status[]");

  return {
    taskStatus: ensureEnum(
      ensureString(payload.task_status, "taskSummary.by_status[].task_status"),
      taskStatuses,
      "taskSummary.by_status[].task_status",
    ),
    count: ensureNumber(payload.count, "taskSummary.by_status[].count"),
  };
}

function decodeTaskProgressAggregate(value: unknown): TaskSummaryDto["byProgressState"][number] {
  const payload = ensureObject(value, "taskSummary.by_progress_state[]");

  return {
    progressState: ensureEnum(
      ensureString(payload.progress_state, "taskSummary.by_progress_state[].progress_state"),
      taskProgressStates,
      "taskSummary.by_progress_state[].progress_state",
    ),
    count: ensureNumber(payload.count, "taskSummary.by_progress_state[].count"),
  };
}

export function decodeTaskSummary(value: unknown): TaskSummaryDto {
  const payload = ensureObject(value, "task summary response");
  const summaryPayload = payload.summary ? ensureObject(payload.summary, "task summary") : payload;

  return {
    accountId: ensureString(summaryPayload.account_id, "taskSummary.account_id"),
    totalTasks: ensureNumber(summaryPayload.total_tasks, "taskSummary.total_tasks"),
    completedTasks: ensureNumber(summaryPayload.completed_tasks, "taskSummary.completed_tasks"),
    inProgressTasks: ensureNumber(summaryPayload.in_progress_tasks, "taskSummary.in_progress_tasks"),
    overdueTasks: ensureNumber(summaryPayload.overdue_tasks, "taskSummary.overdue_tasks"),
    byStatus: ensureArray(summaryPayload.by_status, "taskSummary.by_status").map((entry) => decodeTaskStatusAggregate(entry)),
    byProgressState: ensureArray(summaryPayload.by_progress_state, "taskSummary.by_progress_state").map((entry) =>
      decodeTaskProgressAggregate(entry),
    ),
  };
}

function decodeTaskOverviewItem(value: unknown): TasksOverviewDto["recentlyCompleted"][number] {
  const payload = ensureObject(value, "tasksOverview.item[]");

  return {
    taskId: ensureString(payload.task_id, "tasksOverview.item[].task_id"),
    taskType: ensureEnum(ensureString(payload.task_type, "tasksOverview.item[].task_type"), taskTypes, "tasksOverview.item[].task_type"),
    taskStatus: ensureEnum(
      ensureString(payload.task_status, "tasksOverview.item[].task_status"),
      taskStatuses,
      "tasksOverview.item[].task_status",
    ),
    progressState: ensureEnum(
      ensureString(payload.progress_state, "tasksOverview.item[].progress_state"),
      taskProgressStates,
      "tasksOverview.item[].progress_state",
    ),
    progressPercent: ensureNumber(payload.progress_percent, "tasksOverview.item[].progress_percent"),
  };
}

export function decodeTasksOverview(value: unknown): TasksOverviewDto {
  const payload = ensureObject(value, "tasks overview response");
  const overviewPayload = payload.overview ? ensureObject(payload.overview, "tasks overview") : payload;

  return {
    accountId: ensureString(overviewPayload.account_id, "tasksOverview.account_id"),
    windowStart: ensureString(overviewPayload.window_start, "tasksOverview.window_start"),
    windowEnd: ensureString(overviewPayload.window_end, "tasksOverview.window_end"),
    completionRate: ensureNumber(overviewPayload.completion_rate, "tasksOverview.completion_rate"),
    tasksCreated: ensureNumber(overviewPayload.tasks_created, "tasksOverview.tasks_created"),
    tasksCompleted: ensureNumber(overviewPayload.tasks_completed, "tasksOverview.tasks_completed"),
    recentlyCompleted: ensureArray(overviewPayload.recently_completed, "tasksOverview.recently_completed").map((entry) =>
      decodeTaskOverviewItem(entry),
    ),
    atRisk: ensureArray(overviewPayload.at_risk, "tasksOverview.at_risk").map((entry) => decodeTaskOverviewItem(entry)),
  };
}

export function decodeDailyClaimStatus(value: unknown, scope: { accountId: string; userId?: string; workspaceId?: string }): DailyClaimStateDto {
  const payload = ensureObject(value, "daily claim status");
  const explicitStatus = optionalNullableString(firstPresent(payload, ["status"]), "dailyClaim.status");
  const eligibleCandidate = firstPresent(payload, ["eligible", "is_eligible"]);
  const eligible =
    typeof eligibleCandidate === "boolean"
      ? eligibleCandidate
      : typeof explicitStatus === "string"
        ? explicitStatus === "available"
        : ensureBoolean(eligibleCandidate, "dailyClaim.eligible");
  const reasonCode = optionalNullableString(firstPresent(payload, ["reason_code", "reasonCode"]), "dailyClaim.reason_code");
  const accountId = optionalNullableString(firstPresent(payload, ["account_id", "accountId"]), "dailyClaim.account_id");
  const userId = optionalNullableString(firstPresent(payload, ["user_id", "userId"]), "dailyClaim.user_id");
  const workspaceId = optionalNullableString(
    firstPresent(payload, ["workspace_id", "workspaceId"]),
    "dailyClaim.workspace_id",
  );
  const claimedAt = optionalNullableString(firstPresent(payload, ["claimed_at", "claimedAt"]), "dailyClaim.claimed_at");
  const nextEligibleAt = optionalNullableString(
    firstPresent(payload, ["next_eligible_at", "nextEligibleAt"]),
    "dailyClaim.next_eligible_at",
  );
  const invokeEndpointAvailable = firstPresent(payload, ["invoke_endpoint_available", "invokeEndpointAvailable"]);

  return {
    accountId: accountId ?? scope.accountId,
    ...(typeof userId !== "undefined" ? { userId } : typeof scope.userId !== "undefined" ? { userId: scope.userId } : {}),
    ...(typeof workspaceId !== "undefined"
      ? { workspaceId }
      : typeof scope.workspaceId !== "undefined"
        ? { workspaceId: scope.workspaceId }
        : {}),
    eligible,
    status: decodeDailyClaimStatusValue(payload, eligible, typeof reasonCode === "string" ? reasonCode : undefined),
    ...(typeof reasonCode === "string" ? { reasonCode } : {}),
    ...(typeof claimedAt !== "undefined" ? { claimedAt } : {}),
    ...(typeof nextEligibleAt !== "undefined" ? { nextEligibleAt } : {}),
    invokeEndpointAvailable: typeof invokeEndpointAvailable === "boolean" ? invokeEndpointAvailable : false,
  };
}
