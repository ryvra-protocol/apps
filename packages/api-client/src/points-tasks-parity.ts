import type { PointEntrySource, PointEntryStatus, PointEntryType } from "@ryvra/domain-points";
import type { TaskProgressState, TaskStatus, TaskType } from "@ryvra/domain-tasks";

export const POINTS_TASKS_PROTOCOL_SOURCE = "ryvra-protocol/protocol-core" as const;
export const POINTS_TASKS_PROTOCOL_OPENAPI_PATH = "openapi/points-tasks.openapi.yaml" as const;
export const POINTS_TASKS_PROTOCOL_CHANGELOG_PATH = "docs/api-contract-changelog.md" as const;
export const POINTS_TASKS_PROTOCOL_OPENAPI_SHA = "89e790e859984892fcfbbe7e0b3e7dd2f159b2e7" as const;
export const POINTS_TASKS_PROTOCOL_OPENAPI_COMMIT = "b3abbc4fce3ee4024ba39049623a870747a521f7" as const;
export const POINTS_TASKS_CANONICAL_API_VERSION = "2026-08-08.v1" as const;
export const POINTS_TASKS_PROTOCOL_COMPATIBILITY_VERSION = "POINTS_TASKS_API_VERSION=2026-08-08.v1" as const;
export const POINTS_TASKS_PARITY_CHECK_MARKER = "phase-10-5-2026-08-08T10:33:44.341Z" as const;
export const POINTS_TASKS_API_OPENAPI_AVAILABLE = true as const;
export const POINTS_TASKS_DEPRECATED_PAGE_REMOVAL_NOT_BEFORE = "2027-02-04" as const;

export const pointsCanonicalEntryTypes = [
  "transaction_reward",
  "task_completion_bonus",
  "referral_bonus",
  "manual_adjustment",
  "penalty",
  "reversal",
] as const;
export const pointsCanonicalEntryStatuses = ["pending", "confirmed", "rejected", "reversed", "expired"] as const;
export const pointsCanonicalEntrySources = [
  "ledger_settlement",
  "policy_risk",
  "tasks_engine",
  "admin_console",
  "system_migration",
] as const;

export const tasksCanonicalTypes = ["onboarding", "transaction_volume", "referral", "governance", "security", "ecosystem", "custom"] as const;
export const tasksCanonicalStatuses = ["not_started", "eligible", "in_progress", "completed", "failed", "expired", "canceled"] as const;
export const tasksCanonicalProgressStates = ["queued", "active", "blocked", "under_review", "done"] as const;

export const pointsTasksCanonicalErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "upstream_unavailable",
  "internal_error",
] as const;

export const pointsTasksCanonicalErrorSources = [
  "points_tasks_api",
  "tasks_engine",
  "policy_risk",
  "ledger_settlement",
  "pay",
  "governance",
  "unknown",
] as const;

export const pointsTasksRouteMap = {
  listPointEntries: "/points-tasks/points/entries",
  getPointSummary: "/points-tasks/points/summary",
  getPointsOverview: "/points-tasks/points/overview",
  listTasks: "/points-tasks/tasks",
  getTaskSummary: "/points-tasks/tasks/summary",
  getTasksOverview: "/points-tasks/tasks/overview",
  status: "/points-tasks/status",
  health: "/points-tasks/status/health",
} as const;

export const pointsTasksAccountScopedRoutes = [
  pointsTasksRouteMap.listPointEntries,
  pointsTasksRouteMap.getPointSummary,
  pointsTasksRouteMap.getPointsOverview,
  pointsTasksRouteMap.listTasks,
  pointsTasksRouteMap.getTaskSummary,
  pointsTasksRouteMap.getTasksOverview,
] as const;

export const pointsTasksAuthOptionalRoutes = [pointsTasksRouteMap.health] as const;

const pointEntryTypeSet = new Set<PointEntryType>(pointsCanonicalEntryTypes);
const pointEntryStatusSet = new Set<PointEntryStatus>(pointsCanonicalEntryStatuses);
const pointEntrySourceSet = new Set<PointEntrySource>(pointsCanonicalEntrySources);
const taskTypeSet = new Set<TaskType>(tasksCanonicalTypes);
const taskStatusSet = new Set<TaskStatus>(tasksCanonicalStatuses);
const taskProgressStateSet = new Set<TaskProgressState>(tasksCanonicalProgressStates);

export function isPointEntryType(value: string): value is PointEntryType {
  return pointEntryTypeSet.has(value as PointEntryType);
}

export function isPointEntryStatus(value: string): value is PointEntryStatus {
  return pointEntryStatusSet.has(value as PointEntryStatus);
}

export function isPointEntrySource(value: string): value is PointEntrySource {
  return pointEntrySourceSet.has(value as PointEntrySource);
}

export function isTaskType(value: string): value is TaskType {
  return taskTypeSet.has(value as TaskType);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return taskStatusSet.has(value as TaskStatus);
}

export function isTaskProgressState(value: string): value is TaskProgressState {
  return taskProgressStateSet.has(value as TaskProgressState);
}
