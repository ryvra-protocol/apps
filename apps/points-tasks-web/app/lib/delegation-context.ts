import type { PointEntryDto } from "@ryvra/domain-points";
import type { TaskDto } from "@ryvra/domain-tasks";
import type { DelegatedOperationContext } from "@ryvra/ui";

const unavailableReason = "Not available in current environment";

const initiatedByKeys = ["initiated_by", "initiatedBy", "actor_id", "actorId", "submitted_by", "reviewer"] as const;
const actingForKeys = ["acting_for", "actingFor", "subject_user_id", "subjectUserId", "user_id", "userId"] as const;

function readMetadataValue(metadata: Record<string, unknown> | null | undefined, keys: readonly string[]): string | undefined {
  if (!metadata) {
    return undefined;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value !== "string") {
      continue;
    }

    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
}

export function buildPointEntryDelegationContext(entry: PointEntryDto): DelegatedOperationContext {
  const initiatedBy = readMetadataValue(entry.metadata as Record<string, unknown> | null | undefined, initiatedByKeys);
  const actingFor = readMetadataValue(entry.metadata as Record<string, unknown> | null | undefined, actingForKeys) ?? entry.userId ?? undefined;
  const available = Boolean(initiatedBy || actingFor);

  return {
    available,
    ...(initiatedBy ? { initiatedBy } : {}),
    ...(actingFor ? { actingFor } : {}),
    accountId: entry.accountId,
    ...(entry.workspaceId ? { workspaceId: entry.workspaceId } : {}),
    ...(available ? {} : { unavailableReason }),
  };
}

export function buildTaskDelegationContext(task: TaskDto): DelegatedOperationContext {
  const actingFor = task.userId ?? undefined;
  const available = Boolean(actingFor);

  return {
    available,
    ...(actingFor ? { actingFor } : {}),
    accountId: task.accountId,
    ...(task.workspaceId ? { workspaceId: task.workspaceId } : {}),
    ...(available ? {} : { unavailableReason }),
  };
}

export function supportsPointsDelegationVisibility(entries: readonly PointEntryDto[]): boolean {
  return entries.some((entry) => buildPointEntryDelegationContext(entry).available);
}

export function supportsTasksDelegationVisibility(tasks: readonly TaskDto[]): boolean {
  return tasks.some((task) => buildTaskDelegationContext(task).available);
}
