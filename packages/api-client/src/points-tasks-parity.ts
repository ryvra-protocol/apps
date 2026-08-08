import type { PointEntryStatus, PointEntryType } from "@ryvra/domain-points";
import type { TaskStatus, TaskType } from "@ryvra/domain-tasks";

export const POINTS_TASKS_PROTOCOL_SOURCE = "ryvra-protocol/protocol-core" as const;
export const POINTS_TASKS_POLICY_SOURCE = "ryvra-protocol/policy-risk" as const;
export const POINTS_TASKS_PROTOCOL_DOC_PATH = "docs/tokenomics-proof-of-transaction.md" as const;
export const POINTS_TASKS_PROTOCOL_FAQ_PATH = "docs/tokenomics-faq.md" as const;
export const POINTS_TASKS_CONTRACTS_EVENTS_PATH = "contracts/src/events.ts" as const;
export const POINTS_TASKS_CONTRACTS_IDS_PATH = "contracts/src/ids.ts" as const;
export const POINTS_TASKS_POLICY_DOC_PATH = "docs/anti-abuse-policy.md" as const;
export const POINTS_TASKS_CONTRACT_SCHEMA_VERSION = "1.0.0" as const;
export const POINTS_TASKS_PROTOCOL_COMPATIBILITY_VERSION = "POT_CONTRACT_SCHEMA_VERSION=1.0.0" as const;
export const POINTS_TASKS_PARITY_CHECK_MARKER = "phase-10-2026-08-08T07:54:18.436Z" as const;
export const POINTS_TASKS_API_OPENAPI_AVAILABLE = false as const;
export const POINTS_TASKS_DEPRECATED_PAGE_REMOVAL_NOT_BEFORE = "2027-06-30" as const;
export const POINTS_TASKS_DEPRECATED_FIELD_REMOVAL_NOT_BEFORE = "2027-06-30" as const;

export const pointsCanonicalEntryTypes = ["award", "spend", "adjustment", "reversal"] as const;
export const pointsCanonicalEntryStatuses = ["posted", "pending", "reversed", "failed"] as const;
export const pointsCanonicalEntrySources = ["ledger", "task", "manual", "bonus"] as const;

export const tasksCanonicalTypes = ["verification", "review", "reward", "operations"] as const;
export const tasksCanonicalStatuses = ["open", "in_progress", "done", "failed", "blocked", "canceled"] as const;

export const pointsTasksCanonicalErrorCodes = [
  "invalid_request",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "service_unavailable",
  "internal_error",
] as const;

export const pointsTasksRouteMap = {
  listPointEntries: "/points-tasks/points/entries",
  getPointSummary: "/points-tasks/points/summary",
  getPointsOverview: "/points-tasks/points/overview",
  listTasks: "/points-tasks/tasks",
  getTaskSummary: "/points-tasks/tasks/summary",
  getTasksOverview: "/points-tasks/tasks/overview",
  status: "/points-tasks/status/health",
  getParityDiagnostics: "/points-tasks/status",
} as const;

export const pointsTasksAccountScopedRoutes = [
  pointsTasksRouteMap.listPointEntries,
  pointsTasksRouteMap.getPointSummary,
  pointsTasksRouteMap.getPointsOverview,
  pointsTasksRouteMap.listTasks,
  pointsTasksRouteMap.getTaskSummary,
  pointsTasksRouteMap.getTasksOverview,
] as const;

const pointEntryTypeSet = new Set<PointEntryType>(pointsCanonicalEntryTypes);
const pointEntryStatusSet = new Set<PointEntryStatus>(pointsCanonicalEntryStatuses);
const taskTypeSet = new Set<TaskType>(tasksCanonicalTypes);
const taskStatusSet = new Set<TaskStatus>(tasksCanonicalStatuses);

export function isPointEntryType(value: string): value is PointEntryType {
  return pointEntryTypeSet.has(value as PointEntryType);
}

export function isPointEntryStatus(value: string): value is PointEntryStatus {
  return pointEntryStatusSet.has(value as PointEntryStatus);
}

export function isTaskType(value: string): value is TaskType {
  return taskTypeSet.has(value as TaskType);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return taskStatusSet.has(value as TaskStatus);
}
