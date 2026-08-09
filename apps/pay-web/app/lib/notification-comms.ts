import type { PayoutDto } from "@ryvra/domain-payments";
import { formatNotificationReferenceSnippet, type NotificationDraft } from "@ryvra/ui";

export type ClaimLifecycleNotificationStage = "submitted" | "processing" | "completed" | "failed";

export interface ClaimLifecycleNotificationInput {
  stage: ClaimLifecycleNotificationStage;
  payoutId?: string;
  intentId?: string;
  requestId?: string;
  correlationId?: string;
  retryable?: boolean;
}

const retryableFailureKeywords = ["retry", "timeout", "temporary", "unavailable"] as const;

function getPayoutReference(payoutId?: string): string {
  return formatNotificationReferenceSnippet(payoutId) ?? "payout";
}

function getPreferredClaimReference(input: ClaimLifecycleNotificationInput): {
  label: string;
  value?: string;
} {
  if (input.intentId) {
    return {
      label: "Intent ID",
      value: formatNotificationReferenceSnippet(input.intentId),
    };
  }

  if (input.requestId) {
    return {
      label: "Request ID",
      value: formatNotificationReferenceSnippet(input.requestId),
    };
  }

  if (input.correlationId) {
    return {
      label: "Correlation ID",
      value: formatNotificationReferenceSnippet(input.correlationId),
    };
  }

  return {
    label: "Payout",
    value: formatNotificationReferenceSnippet(input.payoutId),
  };
}

export function resolveClaimLifecycleStageFromIntentState(state: string | undefined): ClaimLifecycleNotificationStage {
  const normalized = state?.trim().toLowerCase() ?? "";

  if (normalized === "settled" || normalized === "completed" || normalized === "success") {
    return "completed";
  }

  if (normalized === "failed") {
    return "failed";
  }

  if (normalized === "executing" || normalized === "authorized") {
    return "processing";
  }

  return "processing";
}

export function buildClaimLifecycleNotification(input: ClaimLifecycleNotificationInput): NotificationDraft {
  const payoutReference = getPayoutReference(input.payoutId);
  const preferredReference = getPreferredClaimReference(input);

  if (input.stage === "submitted") {
    return {
      category: "claims",
      severity: "info",
      message: `Claim submitted for ${payoutReference}.`,
      href: input.payoutId
        ? `/payouts?ref=claim&entity=payout&id=${encodeURIComponent(input.payoutId)}`
        : "/payouts",
      referenceLabel: preferredReference.label,
      referenceValue: preferredReference.value,
      dedupeKey: `claim:submitted:${input.requestId ?? input.payoutId ?? "unknown"}`,
    };
  }

  if (input.stage === "processing") {
    return {
      category: "claims",
      severity: "info",
      message: `Claim for ${payoutReference} is processing.`,
      href: input.payoutId
        ? `/payouts?ref=claim&entity=payout&id=${encodeURIComponent(input.payoutId)}`
        : "/payouts",
      referenceLabel: preferredReference.label,
      referenceValue: preferredReference.value,
      dedupeKey: `claim:processing:${input.intentId ?? input.requestId ?? input.payoutId ?? "unknown"}`,
    };
  }

  if (input.stage === "completed") {
    return {
      category: "claims",
      severity: "success",
      message: `Claim completed for ${payoutReference}.`,
      href: input.payoutId
        ? `/payouts?ref=claim&entity=payout&id=${encodeURIComponent(input.payoutId)}`
        : "/payouts",
      referenceLabel: preferredReference.label,
      referenceValue: preferredReference.value,
      dedupeKey: `claim:completed:${input.intentId ?? input.requestId ?? input.payoutId ?? "unknown"}`,
    };
  }

  return {
    category: "claims",
    severity: input.retryable ? "warn" : "error",
    message: input.retryable
      ? `Claim failed for ${payoutReference}. Retry is available.`
      : `Claim failed for ${payoutReference}. Review before retrying.`,
    href: input.payoutId
      ? `/payouts?ref=claim&entity=payout&id=${encodeURIComponent(input.payoutId)}`
      : "/status",
    referenceLabel: preferredReference.label,
    referenceValue: preferredReference.value,
    dedupeKey: `claim:failed:${input.requestId ?? input.correlationId ?? input.payoutId ?? "unknown"}`,
  };
}

function isRetryablePayoutFailure(failureReason: string | undefined): boolean {
  const normalized = failureReason?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }

  return retryableFailureKeywords.some((keyword) => normalized.includes(keyword));
}

export function buildPayoutStatusNotification(payout: Pick<PayoutDto, "id" | "status" | "failureReason">): NotificationDraft {
  const payoutReference = formatNotificationReferenceSnippet(payout.id) ?? payout.id;
  const base = {
    category: "payouts" as const,
    href: `/payouts?ref=payout&entity=payout&id=${encodeURIComponent(payout.id)}`,
    referenceLabel: "Payout ID",
    referenceValue: payout.id,
    dedupeKey: `payout:${payout.id}:${payout.status}`,
  };

  if (payout.status === "SCHEDULED") {
    return {
      ...base,
      severity: "info",
      message: `Payout ${payoutReference} created and queued.`,
    };
  }

  if (payout.status === "PROCESSING") {
    return {
      ...base,
      severity: "info",
      message: `Payout ${payoutReference} is processing.`,
    };
  }

  if (payout.status === "COMPLETED") {
    return {
      ...base,
      severity: "success",
      message: `Payout ${payoutReference} completed.`,
    };
  }

  const retryable = isRetryablePayoutFailure(payout.failureReason);

  return {
    ...base,
    severity: retryable ? "warn" : "error",
    message: retryable
      ? `Payout ${payoutReference} failed and appears retryable.`
      : `Payout ${payoutReference} failed. Review diagnostics before retrying.`,
  };
}
