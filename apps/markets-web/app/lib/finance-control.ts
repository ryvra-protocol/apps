export const agentStatuses = ["ACTIVE", "SUSPENDED", "REVOKED"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

export const autonomyLevels = ["A0", "A1", "A2", "A3"] as const;
export type AutonomyLevel = (typeof autonomyLevels)[number];

export const decisionStates = [
  "APPROVED",
  "DENIED",
  "REVIEW",
  "CHALLENGE",
  "DELAY",
  "QUARANTINE",
  "BLOCKED",
  "CANCELED",
] as const;
export type DecisionState = (typeof decisionStates)[number];

export const emergencyOperations = [
  "suspend_agent",
  "revoke_credentials",
  "revoke_capability",
  "activate_kill_switch",
  "deactivate_kill_switch",
] as const;
export type EmergencyOperation = (typeof emergencyOperations)[number];

export interface AgentSummary {
  id: string;
  displayName: string;
  status: AgentStatus;
  autonomyLevel: AutonomyLevel;
  mandateId: string;
  mandateVersion: string;
  spendTodayUsd: number;
  spendLimitUsd: number;
  exposureUsd: number;
  exposureLimitUsd: number;
  healthy: boolean;
  lastHeartbeatAt: string;
}

export interface AgentIntent {
  id: string;
  agentId: string;
  action: string;
  amount: string;
  asset: string;
  recipientOrVenue: string;
  purpose: string;
  state: DecisionState;
  mandateId: string;
  policyVersion: string;
  riskAssessmentId: string;
  authorizationId?: string;
  reasonCodes: string[];
  riskSummary: string;
  correlationId: string;
  idempotencyKey: string;
  provenanceRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditTraceEvent {
  id: string;
  agentId: string;
  intentId: string;
  correlationId: string;
  mandateId: string;
  decisionState: DecisionState;
  stage: "actor" | "mandate" | "policy" | "risk" | "intent" | "authorization" | "execution" | "ledger" | "settlement";
  reference: string;
  timestamp: string;
  hashChainVerified?: boolean;
}

export interface AuditTraceFilters {
  intentId?: string;
  correlationId?: string;
  agentId?: string;
  mandateId?: string;
  decisionState?: DecisionState;
  from?: string;
  to?: string;
}

export interface ReasonCodePresentation {
  title: string;
  message: string;
  severity: "info" | "warning" | "danger";
}

const reasonCodePresentationMap: Record<string, ReasonCodePresentation> = {
  policy_threshold_exceeded: {
    title: "Policy threshold exceeded",
    message: "This request exceeded a configured policy threshold and needs operator review.",
    severity: "warning",
  },
  risk_high_volatility: {
    title: "Risk guard: high volatility",
    message: "The risk service reported elevated market volatility for this action.",
    severity: "warning",
  },
  destination_unverified: {
    title: "Destination not verified",
    message: "Recipient/venue verification is missing for the requested operation.",
    severity: "danger",
  },
  sanctions_screening_pending: {
    title: "Screening pending",
    message: "Required sanctions screening has not completed yet.",
    severity: "warning",
  },
  kill_switch_active: {
    title: "Kill switch active",
    message: "Execution is blocked because the kill switch is active.",
    severity: "danger",
  },
  authz_pending: {
    title: "Authorization pending",
    message: "Backend authorization is still pending and must complete before execution.",
    severity: "info",
  },
  backend_unavailable: {
    title: "Backend unavailable",
    message: "The backend is temporarily unavailable. Retry when service health recovers.",
    severity: "warning",
  },
};

export function mapReasonCodeToPresentation(reasonCode: string): ReasonCodePresentation {
  const normalized = reasonCode.trim().toLowerCase();
  return (
    reasonCodePresentationMap[normalized] ?? {
      title: "Operational notice",
      message: `Backend returned reason code: ${normalized || "unknown"}.`,
      severity: "info",
    }
  );
}

export function normalizeDecisionState(value: string | undefined): DecisionState {
  const normalized = value?.trim().toUpperCase() ?? "REVIEW";
  return decisionStates.includes(normalized as DecisionState) ? (normalized as DecisionState) : "REVIEW";
}

export function requiresOperatorReason(decision: DecisionState): boolean {
  return decision === "DENIED" || decision === "CHALLENGE" || decision === "QUARANTINE";
}

export function isHighTrustEmergencyOperation(operation: EmergencyOperation): boolean {
  return operation === "deactivate_kill_switch";
}

export function filterAuditTraceEvents(events: AuditTraceEvent[], filters: AuditTraceFilters): AuditTraceEvent[] {
  const fromMs = filters.from ? Date.parse(filters.from) : Number.NEGATIVE_INFINITY;
  const toMs = filters.to ? Date.parse(filters.to) : Number.POSITIVE_INFINITY;

  return events.filter((event) => {
    const timestampMs = Date.parse(event.timestamp);
    if (!Number.isFinite(timestampMs)) {
      return false;
    }

    if (filters.intentId && event.intentId !== filters.intentId) {
      return false;
    }
    if (filters.correlationId && event.correlationId !== filters.correlationId) {
      return false;
    }
    if (filters.agentId && event.agentId !== filters.agentId) {
      return false;
    }
    if (filters.mandateId && event.mandateId !== filters.mandateId) {
      return false;
    }
    if (filters.decisionState && event.decisionState !== filters.decisionState) {
      return false;
    }
    if (timestampMs < fromMs || timestampMs > toMs) {
      return false;
    }

    return true;
  });
}

export function filterApprovalsQueue(items: AgentIntent[], state?: DecisionState): AgentIntent[] {
  if (!state) {
    return items;
  }

  return items.filter((item) => item.state === state);
}

export function resolveRiskTone(score: number): "success" | "warning" | "danger" {
  if (score >= 80) {
    return "danger";
  }
  if (score >= 50) {
    return "warning";
  }
  return "success";
}

export function buildAuditChainStatus(events: AuditTraceEvent[]): { verified: number; unverified: number } {
  return events.reduce(
    (acc, event) => {
      if (event.hashChainVerified === false) {
        acc.unverified += 1;
      } else {
        acc.verified += 1;
      }
      return acc;
    },
    { verified: 0, unverified: 0 },
  );
}
