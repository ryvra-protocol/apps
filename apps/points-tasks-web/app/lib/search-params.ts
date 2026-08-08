import {
  pointEntriesSortValues,
  pointEntrySources,
  pointEntryStatuses,
  pointEntryTypes,
  pointsWindows,
  type PointEntriesSortValue,
  type PointEntryFilters,
  type PointsDateRangeFilter,
  type PointsWindow,
} from "@ryvra/domain-points";
import {
  taskProgressStates,
  taskSortValues,
  taskStatuses,
  taskTypes,
  tasksWindows,
  type TaskFilters,
  type TaskSortValue,
  type TasksDateRangeFilter,
  type TasksWindow,
} from "@ryvra/domain-tasks";

export type RouteSearchParams = Record<string, string | string[] | undefined> | undefined;

const pointEntryStatusSet = new Set(pointEntryStatuses);
const pointEntryTypeSet = new Set(pointEntryTypes);
const pointEntrySourceSet = new Set(pointEntrySources);
const pointSortSet = new Set(pointEntriesSortValues);
const pointsWindowSet = new Set(pointsWindows);

const taskStatusSet = new Set(taskStatuses);
const taskTypeSet = new Set(taskTypes);
const taskProgressStateSet = new Set(taskProgressStates);
const taskSortSet = new Set(taskSortValues);
const tasksWindowSet = new Set(tasksWindows);

export function getFirstParam(searchParams: RouteSearchParams, key: string): string | undefined {
  const raw = searchParams?.[key];
  if (Array.isArray(raw)) {
    return raw[0];
  }

  return raw;
}

function normalizeParam(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

/**
 * @deprecated Canonical pagination is cursor-first. Use `parseCursor`.
 */
export function parsePage(searchParams: RouteSearchParams): number | undefined {
  if (parseCursor(searchParams)) {
    return undefined;
  }

  const pageValue = Number.parseInt(getFirstParam(searchParams, "page") ?? "", 10);
  return Number.isFinite(pageValue) && pageValue > 0 ? pageValue : undefined;
}

export function parseLimit(searchParams: RouteSearchParams, fallback = 50): number {
  const limitValue = Number.parseInt(getFirstParam(searchParams, "limit") ?? String(fallback), 10);
  if (!Number.isFinite(limitValue) || limitValue <= 0) {
    return fallback;
  }

  return Math.min(limitValue, 200);
}

export function parseCursor(searchParams: RouteSearchParams): string | undefined {
  return normalizeParam(getFirstParam(searchParams, "cursor"));
}

export function parseAccountId(searchParams: RouteSearchParams): string | undefined {
  return normalizeParam(getFirstParam(searchParams, "account_id") ?? getFirstParam(searchParams, "accountId"));
}

export function parseUserId(searchParams: RouteSearchParams): string | undefined {
  return normalizeParam(getFirstParam(searchParams, "user_id") ?? getFirstParam(searchParams, "userId"));
}

export function parseWorkspaceId(searchParams: RouteSearchParams): string | undefined {
  return normalizeParam(getFirstParam(searchParams, "workspace_id") ?? getFirstParam(searchParams, "workspaceId"));
}

export function parsePointDateRange(searchParams: RouteSearchParams): PointsDateRangeFilter | undefined {
  const occurredFrom = normalizeParam(getFirstParam(searchParams, "occurred_from") ?? getFirstParam(searchParams, "from"));
  const occurredTo = normalizeParam(getFirstParam(searchParams, "occurred_to") ?? getFirstParam(searchParams, "to"));

  if (!occurredFrom && !occurredTo) {
    return undefined;
  }

  return {
    ...(occurredFrom ? { occurredFrom } : {}),
    ...(occurredTo ? { occurredTo } : {}),
  };
}

export function parsePointSort(searchParams: RouteSearchParams): PointEntriesSortValue {
  const sort = normalizeParam(getFirstParam(searchParams, "sort"));
  if (sort && pointSortSet.has(sort as PointEntriesSortValue)) {
    return sort as PointEntriesSortValue;
  }

  const sortBy = normalizeParam(getFirstParam(searchParams, "sortBy") ?? getFirstParam(searchParams, "sortField"));
  const sortOrder = normalizeParam(getFirstParam(searchParams, "sortOrder") ?? getFirstParam(searchParams, "sortDirection"));
  const composed = `${sortBy ?? "occurred_at"}:${sortOrder === "asc" ? "asc" : "desc"}` as PointEntriesSortValue;

  return pointSortSet.has(composed) ? composed : "occurred_at:desc";
}

export function parsePointsWindow(searchParams: RouteSearchParams): PointsWindow | undefined {
  const window = normalizeParam(getFirstParam(searchParams, "window"));
  return window && pointsWindowSet.has(window as PointsWindow) ? (window as PointsWindow) : undefined;
}

export function parsePointEntryType(searchParams: RouteSearchParams): PointEntryFilters["entryType"] | undefined {
  const type = normalizeParam(getFirstParam(searchParams, "entry_type") ?? getFirstParam(searchParams, "type"))?.toLowerCase();
  return type && pointEntryTypeSet.has(type as (typeof pointEntryTypes)[number])
    ? (type as PointEntryFilters["entryType"])
    : undefined;
}

export function parsePointEntryStatus(searchParams: RouteSearchParams): PointEntryFilters["entryStatus"] | undefined {
  const status = normalizeParam(getFirstParam(searchParams, "entry_status") ?? getFirstParam(searchParams, "status"))?.toLowerCase();
  return status && pointEntryStatusSet.has(status as (typeof pointEntryStatuses)[number])
    ? (status as PointEntryFilters["entryStatus"])
    : undefined;
}

export function parsePointEntrySource(searchParams: RouteSearchParams): PointEntryFilters["entrySource"] | undefined {
  const source = normalizeParam(getFirstParam(searchParams, "entry_source") ?? getFirstParam(searchParams, "source"))?.toLowerCase();
  return source && pointEntrySourceSet.has(source as (typeof pointEntrySources)[number])
    ? (source as PointEntryFilters["entrySource"])
    : undefined;
}

export function parseTaskDateRange(searchParams: RouteSearchParams): TasksDateRangeFilter | undefined {
  const dueAfter = normalizeParam(getFirstParam(searchParams, "due_after") ?? getFirstParam(searchParams, "from"));
  const dueBefore = normalizeParam(getFirstParam(searchParams, "due_before") ?? getFirstParam(searchParams, "to"));

  if (!dueAfter && !dueBefore) {
    return undefined;
  }

  return {
    ...(dueAfter ? { dueAfter } : {}),
    ...(dueBefore ? { dueBefore } : {}),
  };
}

export function parseTaskSort(searchParams: RouteSearchParams): TaskSortValue {
  const sort = normalizeParam(getFirstParam(searchParams, "sort"));
  if (sort && taskSortSet.has(sort as TaskSortValue)) {
    return sort as TaskSortValue;
  }

  const sortBy = normalizeParam(getFirstParam(searchParams, "sortBy") ?? getFirstParam(searchParams, "sortField"));
  const sortOrder = normalizeParam(getFirstParam(searchParams, "sortOrder") ?? getFirstParam(searchParams, "sortDirection"));
  const composed = `${sortBy ?? "updated_at"}:${sortOrder === "asc" ? "asc" : "desc"}` as TaskSortValue;

  return taskSortSet.has(composed) ? composed : "updated_at:desc";
}

export function parseTasksWindow(searchParams: RouteSearchParams): TasksWindow | undefined {
  const window = normalizeParam(getFirstParam(searchParams, "window"));
  return window && tasksWindowSet.has(window as TasksWindow) ? (window as TasksWindow) : undefined;
}

export function parseTaskStatus(searchParams: RouteSearchParams): TaskFilters["taskStatus"] | undefined {
  const status = normalizeParam(getFirstParam(searchParams, "task_status") ?? getFirstParam(searchParams, "status"))?.toLowerCase();
  return status && taskStatusSet.has(status as (typeof taskStatuses)[number])
    ? (status as TaskFilters["taskStatus"])
    : undefined;
}

export function parseTaskType(searchParams: RouteSearchParams): TaskFilters["taskType"] | undefined {
  const type = normalizeParam(getFirstParam(searchParams, "task_type") ?? getFirstParam(searchParams, "type"))?.toLowerCase();
  return type && taskTypeSet.has(type as (typeof taskTypes)[number])
    ? (type as TaskFilters["taskType"])
    : undefined;
}

export function parseTaskProgressState(searchParams: RouteSearchParams): TaskFilters["progressState"] | undefined {
  const progressState = normalizeParam(getFirstParam(searchParams, "progress_state"))?.toLowerCase();
  return progressState && taskProgressStateSet.has(progressState as (typeof taskProgressStates)[number])
    ? (progressState as TaskFilters["progressState"])
    : undefined;
}
