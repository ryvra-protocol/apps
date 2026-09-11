import { ApiClientError } from "@ryvra/api-client";
import type { MarketsRuntimeContext } from "./runtime";
import {
  filterApprovalsQueue,
  filterAuditTraceEvents,
  normalizeDecisionState,
  type AgentIntent,
  type AgentSummary,
  type AuditTraceEvent,
  type AuditTraceFilters,
  type DecisionState,
  type EmergencyOperation,
} from "./finance-control";

interface AgentHealthSnapshot {
  activeSessions: number;
  queuedTasks: number;
  failedTasks24h: number;
  lastTaskAt?: string;
}

interface AgentCapability {
  capability: string;
  allowed: boolean;
  source: string;
}

interface AgentRiskSnapshot {
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  spendRateUsdPerHour: number;
  spendLimitUsdPerHour: number;
  exposureUsd: number;
  exposureLimitUsd: number;
  flags: string[];
}

interface AgentMandateSnapshot {
  mandateId: string;
  version: string;
  policyVersion: string;
  capabilities: AgentCapability[];
  updatedAt: string;
}

interface AgentActivityEvent {
  id: string;
  kind: "intent" | "execution" | "approval" | "risk";
  summary: string;
  state: string;
  timestamp: string;
  correlationId: string;
}

interface PerpsPrivateSummary {
  accountId: string;
  marginMode: string;
  totalCollateralUsd: number;
  maintenanceMarginUsd: number;
  unrealizedPnlUsd: number;
  updatedAt: string;
}

interface PerpsPositionRow {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: string;
  entryPrice: string;
  markPrice: string;
  leverage: string;
  liquidationPrice: string;
  pnlUsd: string;
  updatedAt: string;
}

interface PerpsHistoryRow {
  id: string;
  action: string;
  symbol: string;
  size: string;
  price: string;
  feeUsd: string;
  state: string;
  timestamp: string;
  correlationId: string;
}

interface ApprovalDecisionRequest {
  decision: DecisionState;
  reason?: string;
  comment?: string;
}

interface EmergencyControlRequest {
  operation: EmergencyOperation;
  reason: string;
  capability?: string;
  confirmationText?: string;
}

interface GatewayResponse<T> {
  ok: true;
  data: T;
}

const mockAgents: AgentSummary[] = [
  {
    id: "agent-btc-maker",
    displayName: "BTC Market Maker",
    status: "ACTIVE",
    autonomyLevel: "A3",
    mandateId: "mdt-mm-core",
    mandateVersion: "12",
    spendTodayUsd: 24300,
    spendLimitUsd: 50000,
    exposureUsd: 381200,
    exposureLimitUsd: 450000,
    healthy: true,
    lastHeartbeatAt: "2026-09-11T18:31:00.000Z",
  },
  {
    id: "agent-usdc-treasury",
    displayName: "USDC Treasury Router",
    status: "SUSPENDED",
    autonomyLevel: "A1",
    mandateId: "mdt-treasury-safe",
    mandateVersion: "6",
    spendTodayUsd: 500,
    spendLimitUsd: 15000,
    exposureUsd: 25000,
    exposureLimitUsd: 90000,
    healthy: false,
    lastHeartbeatAt: "2026-09-11T18:00:00.000Z",
  },
];

const mockHealthByAgent: Record<string, AgentHealthSnapshot> = {
  "agent-btc-maker": {
    activeSessions: 3,
    queuedTasks: 2,
    failedTasks24h: 0,
    lastTaskAt: "2026-09-11T18:27:00.000Z",
  },
  "agent-usdc-treasury": {
    activeSessions: 0,
    queuedTasks: 4,
    failedTasks24h: 2,
    lastTaskAt: "2026-09-11T17:58:00.000Z",
  },
};

const mockMandateByAgent: Record<string, AgentMandateSnapshot> = {
  "agent-btc-maker": {
    mandateId: "mdt-mm-core",
    version: "12",
    policyVersion: "policy-2026.09.09",
    capabilities: [
      { capability: "place_spot_orders", allowed: true, source: "mandate" },
      { capability: "place_perps_orders", allowed: true, source: "mandate" },
      { capability: "withdraw_funds", allowed: false, source: "policy" },
    ],
    updatedAt: "2026-09-09T08:00:00.000Z",
  },
  "agent-usdc-treasury": {
    mandateId: "mdt-treasury-safe",
    version: "6",
    policyVersion: "policy-2026.08.30",
    capabilities: [
      { capability: "rebalance_stablecoin", allowed: true, source: "mandate" },
      { capability: "revoke_credentials", allowed: false, source: "policy" },
    ],
    updatedAt: "2026-08-30T11:02:00.000Z",
  },
};

const mockRiskByAgent: Record<string, AgentRiskSnapshot> = {
  "agent-btc-maker": {
    score: 47,
    severity: "medium",
    spendRateUsdPerHour: 8400,
    spendLimitUsdPerHour: 12500,
    exposureUsd: 381200,
    exposureLimitUsd: 450000,
    flags: ["size_limit_near"],
  },
  "agent-usdc-treasury": {
    score: 84,
    severity: "high",
    spendRateUsdPerHour: 1200,
    spendLimitUsdPerHour: 1800,
    exposureUsd: 25000,
    exposureLimitUsd: 90000,
    flags: ["manual_review_required", "sanctions_screening_pending"],
  },
};

const mockActivitiesByAgent: Record<string, AgentActivityEvent[]> = {
  "agent-btc-maker": [
    {
      id: "act-1",
      kind: "intent",
      summary: "Opened BTC-PERP hedge",
      state: "APPROVED",
      timestamp: "2026-09-11T18:20:00.000Z",
      correlationId: "corr-hedge-001",
    },
    {
      id: "act-2",
      kind: "execution",
      summary: "Settled maker rebate",
      state: "COMPLETED",
      timestamp: "2026-09-11T17:40:00.000Z",
      correlationId: "corr-rebate-002",
    },
  ],
  "agent-usdc-treasury": [
    {
      id: "act-3",
      kind: "approval",
      summary: "Delayed outbound treasury transfer",
      state: "DELAY",
      timestamp: "2026-09-11T17:12:00.000Z",
      correlationId: "corr-delay-901",
    },
  ],
};

const mockApprovals: AgentIntent[] = [
  {
    id: "intent-risk-1",
    agentId: "agent-usdc-treasury",
    action: "Transfer",
    amount: "250000",
    asset: "USDC",
    recipientOrVenue: "Venue-X",
    purpose: "Treasury rebalance",
    state: "REVIEW",
    mandateId: "mdt-treasury-safe",
    policyVersion: "policy-2026.08.30",
    riskAssessmentId: "risk-991",
    authorizationId: "authz-880",
    reasonCodes: ["policy_threshold_exceeded", "sanctions_screening_pending"],
    riskSummary: "Large outbound transfer with incomplete screening.",
    correlationId: "corr-treasury-991",
    idempotencyKey: "idem-treasury-991",
    provenanceRefs: ["prov:policy:risk-991", "prov:ledger:intent-risk-1"],
    createdAt: "2026-09-11T16:50:00.000Z",
    updatedAt: "2026-09-11T17:00:00.000Z",
  },
  {
    id: "intent-risk-2",
    agentId: "agent-btc-maker",
    action: "Increase leverage",
    amount: "12",
    asset: "BTC-PERP",
    recipientOrVenue: "Derivatives-V1",
    purpose: "Inventory neutrality",
    state: "CHALLENGE",
    mandateId: "mdt-mm-core",
    policyVersion: "policy-2026.09.09",
    riskAssessmentId: "risk-224",
    reasonCodes: ["risk_high_volatility"],
    riskSummary: "Volatility model moved to elevated threshold.",
    correlationId: "corr-vol-224",
    idempotencyKey: "idem-vol-224",
    provenanceRefs: ["prov:risk:risk-224"],
    createdAt: "2026-09-11T15:45:00.000Z",
    updatedAt: "2026-09-11T15:50:00.000Z",
  },
];

const mockAuditEvents: AuditTraceEvent[] = [
  {
    id: "trace-1",
    agentId: "agent-usdc-treasury",
    intentId: "intent-risk-1",
    correlationId: "corr-treasury-991",
    mandateId: "mdt-treasury-safe",
    decisionState: "REVIEW",
    stage: "actor",
    reference: "user:ops-7",
    timestamp: "2026-09-11T16:49:50.000Z",
    hashChainVerified: true,
  },
  {
    id: "trace-2",
    agentId: "agent-usdc-treasury",
    intentId: "intent-risk-1",
    correlationId: "corr-treasury-991",
    mandateId: "mdt-treasury-safe",
    decisionState: "REVIEW",
    stage: "risk",
    reference: "risk:risk-991",
    timestamp: "2026-09-11T16:49:56.000Z",
    hashChainVerified: true,
  },
  {
    id: "trace-3",
    agentId: "agent-btc-maker",
    intentId: "intent-risk-2",
    correlationId: "corr-vol-224",
    mandateId: "mdt-mm-core",
    decisionState: "CHALLENGE",
    stage: "intent",
    reference: "intent:intent-risk-2",
    timestamp: "2026-09-11T15:45:02.000Z",
    hashChainVerified: false,
  },
];

const mockPerpsPrivateSummary: PerpsPrivateSummary = {
  accountId: "acct-core-1",
  marginMode: "cross",
  totalCollateralUsd: 190230.18,
  maintenanceMarginUsd: 34120.81,
  unrealizedPnlUsd: 5320.02,
  updatedAt: "2026-09-11T18:32:00.000Z",
};

const mockPerpsPositions: PerpsPositionRow[] = [
  {
    id: "pp-1",
    symbol: "BTC-PERP",
    side: "LONG",
    size: "2.3000",
    entryPrice: "60321.10",
    markPrice: "60788.00",
    leverage: "3.2x",
    liquidationPrice: "55210.22",
    pnlUsd: "+1073.87",
    updatedAt: "2026-09-11T18:31:00.000Z",
  },
  {
    id: "pp-2",
    symbol: "ETH-PERP",
    side: "SHORT",
    size: "15.0000",
    entryPrice: "3311.40",
    markPrice: "3290.20",
    leverage: "2.1x",
    liquidationPrice: "3730.90",
    pnlUsd: "+318.00",
    updatedAt: "2026-09-11T18:29:00.000Z",
  },
];

const mockPerpsHistory: PerpsHistoryRow[] = [
  {
    id: "ph-1",
    action: "OPEN",
    symbol: "BTC-PERP",
    size: "1.5",
    price: "60402.00",
    feeUsd: "14.22",
    state: "SETTLED",
    timestamp: "2026-09-11T14:10:00.000Z",
    correlationId: "corr-open-11",
  },
  {
    id: "ph-2",
    action: "REDUCE",
    symbol: "SOL-PERP",
    size: "100",
    price: "192.84",
    feeUsd: "3.09",
    state: "SETTLED",
    timestamp: "2026-09-11T11:31:00.000Z",
    correlationId: "corr-reduce-17",
  },
];

function parseErrorPayload(payload: unknown): { code: string; message: string; retryable: boolean; source: string } {
  if (typeof payload !== "object" || payload === null) {
    return {
      code: "unknown_error",
      message: "Unknown backend error",
      retryable: true,
      source: "agent-gateway",
    };
  }

  const candidate = payload as Record<string, unknown>;
  const fallback = {
    code: "unknown_error",
    message: "Unknown backend error",
    retryable: true,
    source: "agent-gateway",
  };

  if (typeof candidate.error === "object" && candidate.error !== null) {
    const nested = candidate.error as Record<string, unknown>;
    return {
      code: typeof nested.code === "string" ? nested.code : fallback.code,
      message: typeof nested.message === "string" ? nested.message : fallback.message,
      retryable: typeof nested.retryable === "boolean" ? nested.retryable : fallback.retryable,
      source: typeof nested.source === "string" ? nested.source : fallback.source,
    };
  }

  return {
    code: typeof candidate.code === "string" ? candidate.code : fallback.code,
    message: typeof candidate.message === "string" ? candidate.message : fallback.message,
    retryable: typeof candidate.retryable === "boolean" ? candidate.retryable : fallback.retryable,
    source: typeof candidate.source === "string" ? candidate.source : fallback.source,
  };
}

function normalizeBasePath(): string {
  const configured = process.env.RYVRA_AGENT_GATEWAY_PATH?.trim() || "/agent-gateway";
  return configured.startsWith("/") ? configured : `/${configured}`;
}

function buildHeaders(runtime: MarketsRuntimeContext): HeadersInit {
  const requestId = crypto.randomUUID();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-request-id": requestId,
  };
  headers["x-correlation-id"] = requestId;

  const rawToken = process.env.RYVRA_MARKETS_AUTH_TOKEN?.trim();
  if (rawToken && runtime.config.mode === "http") {
    const scheme = process.env.RYVRA_MARKETS_AUTH_SCHEME?.trim() || "Bearer";
    headers.authorization = rawToken.includes(" ") ? rawToken : `${scheme} ${rawToken}`;
  }

  return headers;
}

async function requestGateway<T>(runtime: MarketsRuntimeContext, path: string, init?: RequestInit): Promise<T> {
  const endpoint = `${runtime.config.apiBaseUrl}${normalizeBasePath()}${path}`;
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      ...buildHeaders(runtime),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const parsedError = parseErrorPayload(payload);
    throw new ApiClientError({
      code: parsedError.code,
      message: parsedError.message,
      retryable: parsedError.retryable,
      source: "markets-api",
      status: response.status,
      details: {
        endpoint,
        payload,
      },
    });
  }

  const payload = (await response.json()) as GatewayResponse<T> | T;
  if (
    typeof payload === "object" &&
    payload !== null &&
    "ok" in payload &&
    (payload as unknown as Record<string, unknown>).ok === true
  ) {
    return (payload as GatewayResponse<T>).data;
  }

  return payload as T;
}

function mustFindAgent(agentId: string): AgentSummary {
  const found = mockAgents.find((agent) => agent.id === agentId);
  if (!found) {
    throw new ApiClientError({
      code: "not_found",
      message: `Agent ${agentId} was not found.`,
      retryable: false,
      source: "mock",
      status: 404,
    });
  }

  return found;
}

export function createAgentGatewayClient(runtime: MarketsRuntimeContext) {
  return {
    async listAgents(): Promise<AgentSummary[]> {
      if (runtime.config.mode === "mock") {
        return mockAgents;
      }

      return requestGateway<AgentSummary[]>(runtime, "/agents");
    },
    async getAgent(agentId: string): Promise<AgentSummary> {
      if (runtime.config.mode === "mock") {
        return mustFindAgent(agentId);
      }

      return requestGateway<AgentSummary>(runtime, `/agents/${agentId}`);
    },
    async getAgentHealth(agentId: string): Promise<AgentHealthSnapshot> {
      if (runtime.config.mode === "mock") {
        mustFindAgent(agentId);
        return mockHealthByAgent[agentId] ?? {
          activeSessions: 0,
          queuedTasks: 0,
          failedTasks24h: 0,
        };
      }

      return requestGateway<AgentHealthSnapshot>(runtime, `/agents/${agentId}/health`);
    },
    async getAgentActivity(agentId: string): Promise<AgentActivityEvent[]> {
      if (runtime.config.mode === "mock") {
        mustFindAgent(agentId);
        return mockActivitiesByAgent[agentId] ?? [];
      }

      return requestGateway<AgentActivityEvent[]>(runtime, `/agents/${agentId}/activity`);
    },
    async getAgentMandate(agentId: string): Promise<AgentMandateSnapshot> {
      if (runtime.config.mode === "mock") {
        mustFindAgent(agentId);
        return mockMandateByAgent[agentId] ?? {
          mandateId: "unknown",
          version: "0",
          policyVersion: "unknown",
          capabilities: [],
          updatedAt: new Date().toISOString(),
        };
      }

      return requestGateway<AgentMandateSnapshot>(runtime, `/agents/${agentId}/mandate`);
    },
    async getAgentRisk(agentId: string): Promise<AgentRiskSnapshot> {
      if (runtime.config.mode === "mock") {
        mustFindAgent(agentId);
        return mockRiskByAgent[agentId] ?? {
          score: 0,
          severity: "low",
          spendRateUsdPerHour: 0,
          spendLimitUsdPerHour: 0,
          exposureUsd: 0,
          exposureLimitUsd: 0,
          flags: [],
        };
      }

      return requestGateway<AgentRiskSnapshot>(runtime, `/agents/${agentId}/risk`);
    },
    async getApprovalsQueue(state?: string): Promise<AgentIntent[]> {
      if (runtime.config.mode === "mock") {
        return filterApprovalsQueue(mockApprovals, state ? normalizeDecisionState(state) : undefined);
      }

      const query = state ? `?state=${encodeURIComponent(state)}` : "";
      return requestGateway<AgentIntent[]>(runtime, `/approvals${query}`);
    },
    async getApprovalIntent(intentId: string): Promise<AgentIntent> {
      if (runtime.config.mode === "mock") {
        const found = mockApprovals.find((item) => item.id === intentId);
        if (!found) {
          throw new ApiClientError({
            code: "not_found",
            message: `Approval intent ${intentId} was not found.`,
            retryable: false,
            source: "mock",
            status: 404,
          });
        }
        return found;
      }

      return requestGateway<AgentIntent>(runtime, `/approvals/${intentId}`);
    },
    async submitApprovalDecision(intentId: string, payload: ApprovalDecisionRequest): Promise<{ auditReference: string; state: DecisionState }> {
      if (runtime.config.mode === "mock") {
        const found = mockApprovals.find((item) => item.id === intentId);
        if (!found) {
          throw new ApiClientError({
            code: "not_found",
            message: `Approval intent ${intentId} was not found.`,
            retryable: false,
            source: "mock",
            status: 404,
          });
        }

        found.state = payload.decision;
        found.updatedAt = new Date().toISOString();

        return {
          auditReference: `audit:${intentId}:${Date.now()}`,
          state: payload.decision,
        };
      }

      return requestGateway<{ auditReference: string; state: DecisionState }>(runtime, `/approvals/${intentId}/decision`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async executeEmergencyOperation(agentId: string, payload: EmergencyControlRequest): Promise<{ auditReference: string; result: string }> {
      if (runtime.config.mode === "mock") {
        const agent = mustFindAgent(agentId);

        if (payload.operation === "suspend_agent") {
          agent.status = "SUSPENDED";
        }
        if (payload.operation === "activate_kill_switch") {
          agent.status = "SUSPENDED";
        }
        if (payload.operation === "deactivate_kill_switch" && agent.status === "SUSPENDED") {
          agent.status = "ACTIVE";
        }
        if (payload.operation === "revoke_credentials") {
          agent.status = "REVOKED";
        }

        return {
          auditReference: `audit:emergency:${agentId}:${Date.now()}`,
          result: "accepted",
        };
      }

      return requestGateway<{ auditReference: string; result: string }>(runtime, `/agents/${agentId}/controls`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async listAuditTrace(filters: AuditTraceFilters): Promise<AuditTraceEvent[]> {
      if (runtime.config.mode === "mock") {
        return filterAuditTraceEvents(mockAuditEvents, filters);
      }

      const query = new URLSearchParams();
      if (filters.intentId) query.set("intentId", filters.intentId);
      if (filters.correlationId) query.set("correlationId", filters.correlationId);
      if (filters.agentId) query.set("agentId", filters.agentId);
      if (filters.mandateId) query.set("mandateId", filters.mandateId);
      if (filters.decisionState) query.set("decisionState", filters.decisionState);
      if (filters.from) query.set("from", filters.from);
      if (filters.to) query.set("to", filters.to);

      const suffix = query.toString();
      return requestGateway<AuditTraceEvent[]>(runtime, `/audit/trace${suffix ? `?${suffix}` : ""}`);
    },
    async getPerpsPrivateSummary(accountId: string): Promise<PerpsPrivateSummary> {
      if (runtime.config.mode === "mock") {
        return {
          ...mockPerpsPrivateSummary,
          accountId,
        };
      }

      return requestGateway<PerpsPrivateSummary>(runtime, `/perps/private?account_id=${encodeURIComponent(accountId)}`);
    },
    async listPerpsPositions(accountId: string): Promise<PerpsPositionRow[]> {
      if (runtime.config.mode === "mock") {
        return mockPerpsPositions;
      }

      return requestGateway<PerpsPositionRow[]>(runtime, `/perps/positions?account_id=${encodeURIComponent(accountId)}`);
    },
    async listPerpsHistory(accountId: string): Promise<PerpsHistoryRow[]> {
      if (runtime.config.mode === "mock") {
        return mockPerpsHistory;
      }

      return requestGateway<PerpsHistoryRow[]>(runtime, `/perps/history?account_id=${encodeURIComponent(accountId)}`);
    },
  };
}

export type {
  AgentActivityEvent,
  AgentCapability,
  AgentHealthSnapshot,
  AgentMandateSnapshot,
  AgentRiskSnapshot,
  ApprovalDecisionRequest,
  EmergencyControlRequest,
  PerpsHistoryRow,
  PerpsPositionRow,
  PerpsPrivateSummary,
};
