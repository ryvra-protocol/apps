import type { PayoutDto } from "@ryvra/domain-payments";
import { formatNotificationReferenceSnippet, type NotificationDraft } from "@ryvra/ui";
import { redactIdentifier } from "./privacy";

export type ClaimLifecycleNotificationStage = "submitted" | "processing" | "completed" | "failed";
export type P2pLifecycleNotificationStage = "initiated" | "processing" | "completed" | "failed";

export interface ClaimLifecycleNotificationInput {
  stage: ClaimLifecycleNotificationStage;
  payoutId?: string;
  intentId?: string;
  requestId?: string;
  correlationId?: string;
  retryable?: boolean;
}

export interface P2pLifecycleNotificationInput {
  stage: P2pLifecycleNotificationStage;
  recipientHandle?: string;
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

  const value = formatNotificationReferenceSnippet(input.payoutId);
  return {
    label: "Payout",
    ...(value ? { value } : {}),
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
      ...(preferredReference.value ? { referenceValue: preferredReference.value } : {}),
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
      ...(preferredReference.value ? { referenceValue: preferredReference.value } : {}),
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
      ...(preferredReference.value ? { referenceValue: preferredReference.value } : {}),
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
    ...(preferredReference.value ? { referenceValue: preferredReference.value } : {}),
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

export function buildP2pLifecycleNotification(input: P2pLifecycleNotificationInput): NotificationDraft {
  const recipient =
    input.recipientHandle && input.recipientHandle.trim().length > 0
      ? redactIdentifier(input.recipientHandle.trim().toLowerCase(), 2, 2)
      : "recipient";
  const preferredReference =
    formatNotificationReferenceSnippet(input.intentId) ??
    formatNotificationReferenceSnippet(input.requestId) ??
    formatNotificationReferenceSnippet(input.correlationId) ??
    "p2p";
  const href = "/p2p/history";

  if (input.stage === "initiated") {
    return {
      category: "payouts",
      severity: "info",
      message: `P2P send initiated for ${recipient}.`,
      href,
      referenceLabel: "Reference",
      referenceValue: preferredReference,
      dedupeKey: `p2p:initiated:${preferredReference}`,
    };
  }

  if (input.stage === "processing") {
    return {
      category: "payouts",
      severity: "info",
      message: `P2P send to ${recipient} is processing.`,
      href,
      referenceLabel: "Reference",
      referenceValue: preferredReference,
      dedupeKey: `p2p:processing:${preferredReference}`,
    };
  }

  if (input.stage === "completed") {
    return {
      category: "payouts",
      severity: "success",
      message: `P2P send to ${recipient} completed.`,
      href,
      referenceLabel: "Reference",
      referenceValue: preferredReference,
      dedupeKey: `p2p:completed:${preferredReference}`,
    };
  }

  return {
    category: "payouts",
    severity: input.retryable ? "warn" : "error",
    message: input.retryable
      ? `P2P send to ${recipient} failed. Retry is available.`
      : `P2P send to ${recipient} failed. Review details before retrying.`,
    href,
    referenceLabel: "Reference",
    referenceValue: preferredReference,
    dedupeKey: `p2p:failed:${preferredReference}`,
  };
}
