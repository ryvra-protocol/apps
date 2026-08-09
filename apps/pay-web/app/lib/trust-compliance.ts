import type { PayoutDto, PayoutStatus } from "@ryvra/domain-payments";
import type { OperationTimelineStage, TrustReference } from "@ryvra/ui";

const payoutStageSequence = ["SCHEDULED", "PROCESSING", "COMPLETED"] as const;

function resolvePayoutCurrentStage(status: PayoutStatus): number {
  if (status === "SCHEDULED") {
    return 0;
  }

  if (status === "PROCESSING") {
    return 1;
  }

  if (status === "COMPLETED") {
    return 2;
  }

  return 3;
}

export function buildPayoutTimelineStages(payout: PayoutDto | null): OperationTimelineStage[] {
  if (!payout) {
    return [];
  }

  const currentStage = resolvePayoutCurrentStage(payout.status);

  return [
    {
      id: "scheduled",
      label: "Scheduled",
      status: currentStage > 0 ? "completed" : "current",
      timestamp: payout.scheduledFor ?? payout.createdAt,
      current: currentStage === 0,
      references: [{ label: "Payout ID", value: payout.id }],
    },
    {
      id: "processing",
      label: "Processing",
      status: currentStage > 1 ? "completed" : currentStage === 1 ? "current" : "pending",
      ...(currentStage >= 1 ? { timestamp: payout.createdAt } : {}),
      current: currentStage === 1,
    },
    {
      id: "completed",
      label: "Completed",
      status: currentStage === 2 ? "current" : currentStage > 2 ? "pending" : "pending",
      ...(payout.completedAt ? { timestamp: payout.completedAt } : {}),
      current: currentStage === 2,
      ...(payout.status === "COMPLETED" ? { note: "Payout confirmation was received from Pay." } : {}),
    },
    {
      id: "failed",
      label: "Closed with issue",
      status: currentStage === 3 ? "current" : "pending",
      ...(payout.status === "FAILED" && payout.completedAt ? { timestamp: payout.completedAt } : {}),
      current: currentStage === 3,
      ...(payout.failureReason ? { note: payout.failureReason } : {}),
    },
  ];
}

export function buildPayoutEvidenceReferences(payout: PayoutDto | null): TrustReference[] {
  if (!payout) {
    return [{ label: "Payout ID" }];
  }

  return [
    { label: "Payout ID", value: payout.id },
    { label: "Destination", value: payout.destinationLabel },
    { label: "Currency", value: payout.currency },
  ];
}

export function resolvePayoutRetryable(payout: PayoutDto | null): boolean | null {
  if (!payout) {
    return null;
  }

  if (payout.status === "FAILED") {
    return true;
  }

  if (payout.status === "COMPLETED") {
    return false;
  }

  return true;
}

export function listKnownPayoutStatuses(): readonly PayoutStatus[] {
  return payoutStageSequence;
}
