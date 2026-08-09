import type { PointsSummaryRequest } from "@ryvra/domain-points";

export function buildPointsSummaryRequest(input: {
  accountId: string;
  userId?: string;
  workspaceId?: string;
  window?: PointsSummaryRequest["window"];
  dateRange?: PointsSummaryRequest["dateRange"];
}): PointsSummaryRequest {
  return {
    accountId: input.accountId,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    ...(input.window ? { window: input.window } : {}),
    ...(input.dateRange ? { dateRange: input.dateRange } : {}),
  };
}

export function resolvePointsBalance(pointsSummary: { availablePoints: number; totalPoints: number }): number {
  return Number.isFinite(pointsSummary.availablePoints) ? pointsSummary.availablePoints : pointsSummary.totalPoints;
}
