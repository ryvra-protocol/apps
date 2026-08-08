import {
  pointEntrySources,
  pointEntryStatuses,
  pointEntryTypes,
  type PointEntryFilters,
  type PointsDateRangeFilter,
  type PointsSortDirection,
} from "@ryvra/domain-points";
import { taskStatuses, taskTypes, type TaskFilters } from "@ryvra/domain-tasks";

export type RouteSearchParams = Record<string, string | string[] | undefined> | undefined;

const pointEntryStatusSet = new Set(pointEntryStatuses);
const pointEntryTypeSet = new Set(pointEntryTypes);
const pointEntrySourceSet = new Set(pointEntrySources);
const taskStatusSet = new Set(taskStatuses);
const taskTypeSet = new Set(taskTypes);

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

export function parseDateRange(searchParams: RouteSearchParams): PointsDateRangeFilter | undefined {
  const from = normalizeParam(getFirstParam(searchParams, "from"));
  const to = normalizeParam(getFirstParam(searchParams, "to"));

  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function parseSortDirection(searchParams: RouteSearchParams): PointsSortDirection {
  return getFirstParam(searchParams, "sortOrder") === "asc" || getFirstParam(searchParams, "sortDirection") === "asc"
    ? "asc"
    : "desc";
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
  const limitValue = Number.parseInt(
    getFirstParam(searchParams, "limit") ?? getFirstParam(searchParams, "pageSize") ?? String(fallback),
    10,
  );
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

export function parsePointEntryType(searchParams: RouteSearchParams): PointEntryFilters["type"] | undefined {
  const type = normalizeParam(getFirstParam(searchParams, "type") ?? getFirstParam(searchParams, "entryType"))?.toLowerCase();
  return type && pointEntryTypeSet.has(type as (typeof pointEntryTypes)[number]) ? (type as PointEntryFilters["type"]) : undefined;
}

export function parsePointEntryStatus(searchParams: RouteSearchParams): PointEntryFilters["status"] | undefined {
  const status = normalizeParam(getFirstParam(searchParams, "status"))?.toLowerCase();
  return status && pointEntryStatusSet.has(status as (typeof pointEntryStatuses)[number])
    ? (status as PointEntryFilters["status"])
    : undefined;
}

export function parsePointEntrySource(searchParams: RouteSearchParams): PointEntryFilters["source"] | undefined {
  const source = normalizeParam(getFirstParam(searchParams, "source"))?.toLowerCase();
  return source && pointEntrySourceSet.has(source as (typeof pointEntrySources)[number])
    ? (source as PointEntryFilters["source"])
    : undefined;
}

export function parseTaskStatus(searchParams: RouteSearchParams): TaskFilters["status"] | undefined {
  const status = normalizeParam(getFirstParam(searchParams, "status"))?.toLowerCase();
  return status && taskStatusSet.has(status as (typeof taskStatuses)[number]) ? (status as TaskFilters["status"]) : undefined;
}

export function parseTaskType(searchParams: RouteSearchParams): TaskFilters["type"] | undefined {
  const type = normalizeParam(getFirstParam(searchParams, "type"))?.toLowerCase();
  return type && taskTypeSet.has(type as (typeof taskTypes)[number]) ? (type as TaskFilters["type"]) : undefined;
}

export function parseTaskOwner(searchParams: RouteSearchParams): string | undefined {
  return normalizeParam(getFirstParam(searchParams, "ownerId") ?? getFirstParam(searchParams, "owner"));
}
