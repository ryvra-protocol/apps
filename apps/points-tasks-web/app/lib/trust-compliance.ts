import type { TaskDto, TaskStatus } from "@ryvra/domain-tasks";
import type { OperationTimelineStage, TrustReference } from "@ryvra/ui";
import type { DailyClaimViewModel } from "./daily-claim";

const closedWithIssueStatuses = new Set<TaskStatus>(["failed", "expired", "canceled"]);

function resolveTaskCurrentStage(task: TaskDto): number {
  if (task.taskStatus === "completed") {
    return 3;
  }

  if (closedWithIssueStatuses.has(task.taskStatus)) {
    return 4;
  }

  if (task.startedAt || task.taskStatus === "in_progress" || task.progressState !== "queued") {
    return 2;
  }

  return 0;
}

export function buildTaskTimelineStages(task: TaskDto | null): OperationTimelineStage[] {
  if (!task) {
    return [];
  }

  const currentStage = resolveTaskCurrentStage(task);

  return [
    {
      id: "created",
      label: "Created",
      status: currentStage > 0 ? "completed" : "current",
      timestamp: task.createdAt,
      current: currentStage === 0,
      references: [{ label: "Task ID", value: task.taskId }],
    },
    {
      id: "started",
      label: "Started",
      status: currentStage > 1 ? "completed" : currentStage === 1 ? "current" : "pending",
      ...(task.startedAt ? { timestamp: task.startedAt } : {}),
      current: currentStage === 1,
    },
    {
      id: "progress",
      label: "Progress",
      status: currentStage > 2 ? "completed" : currentStage === 2 ? "current" : "pending",
      ...(currentStage >= 2 ? { timestamp: task.updatedAt } : {}),
      current: currentStage === 2,
      note: `Progress state: ${task.progressState.replace(/_/g, " ")}`,
    },
    {
      id: "completed",
      label: "Completed",
      status: currentStage === 3 ? "current" : "pending",
      ...(task.completedAt ? { timestamp: task.completedAt } : {}),
      current: currentStage === 3,
    },
    {
      id: "closed-with-issue",
      label: "Closed with issue",
      status: currentStage === 4 ? "current" : "pending",
      ...(closedWithIssueStatuses.has(task.taskStatus) ? { timestamp: task.updatedAt } : {}),
      current: currentStage === 4,
      ...(closedWithIssueStatuses.has(task.taskStatus)
        ? { note: `Task closed with status ${task.taskStatus.replace(/_/g, " ")}.` }
        : {}),
    },
  ];
}

export function buildTaskEvidenceReferences(task: TaskDto | null): TrustReference[] {
  if (!task) {
    return [{ label: "Task ID" }];
  }

  return [
    { label: "Task ID", value: task.taskId },
    { label: "Account ID", value: task.accountId },
    { label: "Workspace ID", ...(task.workspaceId ? { value: task.workspaceId } : {}) },
  ];
}

export function resolveTaskRetryable(task: TaskDto | null): boolean | null {
  if (!task) {
    return null;
  }

  if (task.taskStatus === "completed") {
    return false;
  }

  if (closedWithIssueStatuses.has(task.taskStatus)) {
    return true;
  }

  return true;
}

export function buildDailyClaimTimelineStages(model: DailyClaimViewModel, observedAtIso: string): OperationTimelineStage[] {
  if (model.status === "already_claimed") {
    return [
      {
        id: "eligibility-checked",
        label: "Eligibility checked",
        status: "completed",
        timestamp: observedAtIso,
      },
      {
        id: "claim-window",
        label: "Claim window",
        status: "completed",
        ...(model.nextEligibleAt ? { timestamp: model.nextEligibleAt } : {}),
      },
      {
        id: "claim-complete",
        label: "Claim complete",
        status: "current",
        ...(model.nextEligibleAt ? { timestamp: model.nextEligibleAt } : {}),
        current: true,
      },
    ];
  }

  if (model.status === "available") {
    return [
      {
        id: "eligibility-checked",
        label: "Eligibility checked",
        status: "completed",
        timestamp: observedAtIso,
      },
      {
        id: "claim-window",
        label: "Claim window",
        status: "current",
        timestamp: observedAtIso,
        current: true,
      },
      {
        id: "claim-complete",
        label: "Claim complete",
        status: "pending",
      },
    ];
  }

  if (model.status === "cooldown") {
    return [
      {
        id: "eligibility-checked",
        label: "Eligibility checked",
        status: "completed",
        timestamp: observedAtIso,
      },
      {
        id: "claim-window",
        label: "Claim window",
        status: "current",
        ...(model.nextEligibleAt ? { timestamp: model.nextEligibleAt } : {}),
        current: true,
        ...(model.nextEligibleLabel ? { note: model.nextEligibleLabel } : {}),
      },
      {
        id: "claim-complete",
        label: "Claim complete",
        status: "pending",
      },
    ];
  }

  return [
    {
      id: "eligibility-checked",
      label: "Eligibility checked",
      status: "completed",
      timestamp: observedAtIso,
    },
    {
      id: "claim-window",
      label: "Claim window",
      status: "pending",
    },
    {
      id: "claim-complete",
      label: "Claim complete",
      status: "pending",
    },
    {
      id: "claim-unavailable",
      label: "Unavailable in current environment",
      status: "current",
      timestamp: observedAtIso,
      current: true,
      note: model.errorMessage ?? "Claim execution references are not available in this environment.",
    },
  ];
}

export function buildDailyClaimEvidenceReferences(accountId: string): TrustReference[] {
  return [
    { label: "Account ID", value: accountId },
    { label: "Claim request ID" },
    { label: "Claim correlation ID" },
  ];
}
