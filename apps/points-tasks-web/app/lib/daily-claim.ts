export type DailyClaimUiStatus = "available" | "already_claimed" | "cooldown" | "unavailable";

interface DailyClaimStateDto {
  accountId: string;
  eligible: boolean;
  status?: "available" | "already_claimed" | "cooldown";
  reasonCode?: string;
  nextEligibleAt?: string | null;
  invokeEndpointAvailable: boolean;
}

export interface DailyClaimViewModel {
  status: DailyClaimUiStatus;
  statusLabel: string;
  nextEligibleAt?: string;
  nextEligibleLabel?: string;
  cta: {
    label: string;
    enabled: boolean;
    reason?: string;
  };
  retryable: boolean;
  retryHref?: string;
  errorMessage?: string;
}

function isIsoTimestamp(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

function inferStatusFromReason(reasonCode: string | undefined): DailyClaimUiStatus {
  if (!reasonCode) {
    return "unavailable";
  }

  const normalized = reasonCode.toLowerCase();
  if (normalized.includes("cooldown")) {
    return "cooldown";
  }

  if (normalized.includes("claimed")) {
    return "already_claimed";
  }

  if (normalized.includes("available")) {
    return "available";
  }

  return "unavailable";
}

function toStatusLabel(status: DailyClaimUiStatus): string {
  if (status === "already_claimed") {
    return "Already claimed";
  }

  if (status === "cooldown") {
    return "Cooldown";
  }

  if (status === "available") {
    return "Available";
  }

  return "Unavailable";
}

function formatUtcDateTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(isoTimestamp));
}

export function formatDailyClaimCooldown(nextEligibleAt: string, nowIso: string): string {
  const now = Date.parse(nowIso);
  const nextEligible = Date.parse(nextEligibleAt);
  if (!Number.isFinite(now) || !Number.isFinite(nextEligible) || nextEligible <= now) {
    return `Next eligible now (${formatUtcDateTime(nextEligibleAt)})`;
  }

  const totalMinutes = Math.ceil((nextEligible - now) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const remaining = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return `${remaining} remaining (${formatUtcDateTime(nextEligibleAt)})`;
}

export function buildDailyClaimViewModel(input: {
  claimState?: DailyClaimStateDto;
  nowIso: string;
  claimStatusEndpointAvailable: boolean;
  endpointErrorMessage?: string;
  endpointRetryable?: boolean;
  retryHref?: string;
  expectedAccountId: string;
}): DailyClaimViewModel {
  if (!input.claimStatusEndpointAvailable || !input.claimState) {
    return {
      status: "unavailable",
      statusLabel: toStatusLabel("unavailable"),
      cta: {
        label: "Claim daily points",
        enabled: false,
        reason: "Daily claim status endpoint is unavailable. Retry when the endpoint is restored.",
      },
      retryable: Boolean(input.endpointRetryable),
      ...(input.retryHref && input.endpointRetryable ? { retryHref: input.retryHref } : {}),
      ...(input.endpointErrorMessage ? { errorMessage: input.endpointErrorMessage } : {}),
    };
  }

  if (input.claimState.accountId !== input.expectedAccountId) {
    return {
      status: "unavailable",
      statusLabel: toStatusLabel("unavailable"),
      cta: {
        label: "Claim daily points",
        enabled: false,
        reason: `Scope mismatch: expected ${input.expectedAccountId}, received ${input.claimState.accountId}.`,
      },
      retryable: false,
    };
  }

  const status = input.claimState.status ?? (input.claimState.eligible ? "available" : inferStatusFromReason(input.claimState.reasonCode));
  const nextEligibleAt = isIsoTimestamp(input.claimState.nextEligibleAt) ? input.claimState.nextEligibleAt : undefined;
  const invokeEndpointAvailable = input.claimState.invokeEndpointAvailable;

  if (status === "available") {
    return {
      status,
      statusLabel: toStatusLabel(status),
      cta: {
        label: "Claim daily points",
        enabled: invokeEndpointAvailable,
        ...(invokeEndpointAvailable ? {} : { reason: "Claim execution is deferred to Phase 12.5B pay intent wiring." }),
      },
      retryable: false,
    };
  }

  if (status === "cooldown") {
    return {
      status,
      statusLabel: toStatusLabel(status),
      ...(nextEligibleAt ? { nextEligibleAt, nextEligibleLabel: formatDailyClaimCooldown(nextEligibleAt, input.nowIso) } : {}),
      cta: {
        label: "Claim daily points",
        enabled: false,
        reason: nextEligibleAt
          ? `Cooldown active until ${formatUtcDateTime(nextEligibleAt)}.`
          : "Cooldown is active. Next eligibility time was not provided by the backend.",
      },
      retryable: false,
    };
  }

  if (status === "already_claimed") {
    return {
      status,
      statusLabel: toStatusLabel(status),
      ...(nextEligibleAt ? { nextEligibleAt, nextEligibleLabel: formatDailyClaimCooldown(nextEligibleAt, input.nowIso) } : {}),
      cta: {
        label: "Claim daily points",
        enabled: false,
        reason: "Daily claim already completed for the current cycle.",
      },
      retryable: false,
    };
  }

  return {
    status: "unavailable",
    statusLabel: toStatusLabel("unavailable"),
    cta: {
      label: "Claim daily points",
      enabled: false,
      reason: "Daily claim status is unavailable.",
    },
    retryable: false,
  };
}
