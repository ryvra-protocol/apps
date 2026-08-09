import type { TaskDto } from "@ryvra/domain-tasks";
import { formatNotificationReferenceSnippet, type NotificationDraft } from "@ryvra/ui";

export type DailyClaimLifecycleStage = "submitted" | "processing" | "completed" | "failed";

export interface DailyClaimLifecycleNotificationInput {
  stage: DailyClaimLifecycleStage;
  accountId: string;
  intentId?: string;
  requestId?: string;
  correlationId?: string;
  retryable?: boolean;
}

function getTaskReference(taskId: string): string {
  return formatNotificationReferenceSnippet(taskId) ?? taskId;
}

function getClaimReference(input: DailyClaimLifecycleNotificationInput): {
  label: string;
  value?: string;
} {
  if (input.intentId) {
    const value = formatNotificationReferenceSnippet(input.intentId);
    return {
      label: "Intent ID",
      ...(value ? { value } : {}),
    };
  }

  if (input.requestId) {
    const value = formatNotificationReferenceSnippet(input.requestId);
    return {
      label: "Request ID",
      ...(value ? { value } : {}),
    };
  }

  if (input.correlationId) {
    const value = formatNotificationReferenceSnippet(input.correlationId);
    return {
      label: "Correlation ID",
      ...(value ? { value } : {}),
    };
  }

  const value = formatNotificationReferenceSnippet(input.accountId);
  return {
    label: "Account",
    ...(value ? { value } : {}),
  };
}

export function resolveDailyClaimLifecycleStageFromIntentState(state: string | undefined): DailyClaimLifecycleStage {
  const normalized = state?.trim().toLowerCase() ?? "";

  if (normalized === "settled" || normalized === "completed" || normalized === "success") {
    return "completed";
  }

  if (normalized === "failed") {
    return "failed";
  }

  if (normalized === "authorized" || normalized === "executing") {
    return "processing";
  }

  return "processing";
}

export function buildDailyClaimLifecycleNotification(input: DailyClaimLifecycleNotificationInput): NotificationDraft {
  const preferredReference = getClaimReference(input);
  const accountReference = formatNotificationReferenceSnippet(input.accountId) ?? input.accountId;
  const href = `/points?account_id=${encodeURIComponent(input.accountId)}`;

  if (input.stage === "submitted") {
    return {
      category: "claims",
      severity: "info",
      message: `Daily claim submitted for account ${accountReference}.`,
      href,
      referenceLabel: preferredReference.label,
      ...(preferredReference.value ? { referenceValue: preferredReference.value } : {}),
      dedupeKey: `daily-claim:submitted:${input.requestId ?? input.accountId}`,
    };
  }

  if (input.stage === "processing") {
    return {
      category: "claims",
      severity: "info",
      message: `Daily claim is processing for account ${accountReference}.`,
      href,
      referenceLabel: preferredReference.label,
      ...(preferredReference.value ? { referenceValue: preferredReference.value } : {}),
      dedupeKey: `daily-claim:processing:${input.intentId ?? input.requestId ?? input.accountId}`,
    };
  }

  if (input.stage === "completed") {
    return {
      category: "claims",
      severity: "success",
      message: `Daily claim completed for account ${accountReference}.`,
      href,
      referenceLabel: preferredReference.label,
      ...(preferredReference.value ? { referenceValue: preferredReference.value } : {}),
      dedupeKey: `daily-claim:completed:${input.intentId ?? input.requestId ?? input.accountId}`,
    };
  }

  return {
    category: "claims",
    severity: input.retryable ? "warn" : "error",
    message: input.retryable
      ? `Daily claim failed for account ${accountReference}. Retry is available.`
      : `Daily claim failed for account ${accountReference}. Review before retrying.`,
    href,
    referenceLabel: preferredReference.label,
    ...(preferredReference.value ? { referenceValue: preferredReference.value } : {}),
    dedupeKey: `daily-claim:failed:${input.requestId ?? input.correlationId ?? input.accountId}`,
  };
}

export function buildTaskStatusNotification(
  task: Pick<TaskDto, "taskId" | "taskStatus" | "progressState" | "pointsReward">,
): NotificationDraft {
  const taskReference = getTaskReference(task.taskId);
  const taskStatusLabel = String(task.taskStatus).replace(/_/g, " ");
  const href = `/tasks?ref=task&entity=task&id=${encodeURIComponent(task.taskId)}`;
  const base = {
    category: "tasks" as const,
    href,
    referenceLabel: "Task ID",
    referenceValue: task.taskId,
    dedupeKey: `task:${task.taskId}:${task.taskStatus}:${task.progressState}`,
  };

  if (task.taskStatus === "eligible" || task.taskStatus === "not_started") {
    return {
      ...base,
      severity: "info",
      message: `Task ${taskReference} is assigned and eligible.`,
    };
  }

  if (task.taskStatus === "in_progress" || task.progressState === "active" || task.progressState === "under_review") {
    return {
      ...base,
      severity: "info",
      message: `Task ${taskReference} is in progress.`,
    };
  }

  if (task.progressState === "blocked") {
    return {
      ...base,
      severity: "warn",
      message: `Task ${taskReference} is blocked and needs attention.`,
    };
  }

  if (task.taskStatus === "completed" || task.progressState === "done") {
    return {
      ...base,
      severity: "success",
      message: `Task ${taskReference} completed. Reward (${task.pointsReward} points) is ready.`,
    };
  }

  if (task.taskStatus === "failed" || task.taskStatus === "expired" || task.taskStatus === "canceled") {
    return {
      ...base,
      severity: "warn",
      message: `Task ${taskReference} closed with status ${taskStatusLabel}.`,
    };
  }

  return {
    ...base,
    severity: "info",
    message: `Task ${taskReference} status update: ${taskStatusLabel}.`,
  };
}
