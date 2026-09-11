import { canAccessWorkspaceCapability } from "@ryvra/auth";
import { Card, InlineStatusIndicators, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../components/mode-badge";
import { AgentDetailNav } from "../../components/agent-detail-nav";
import { EmergencyControlsClient } from "../../components/emergency-controls-client";
import { ErrorState, UnauthorizedState } from "../../components/page-states";
import { createAgentGatewayClient } from "../../lib/agent-gateway-client";
import { mapReasonCodeToPresentation } from "../../lib/finance-control";
import { parseWorkspaceId, type RouteSearchParams } from "../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../lib/runtime";

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({ params, searchParams }: AgentDetailPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:agents:detail");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent details" description="Agent control and governance details.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const { id } = await params;
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({
      account_id: runtime.defaultAccountId ?? "acct-core-1",
      workspace_id: workspaceId,
    }).toString();
    const gateway = createAgentGatewayClient(runtime);

    const [agent, health, risk, mandate, activity, approvals] = await Promise.all([
      gateway.getAgent(id),
      gateway.getAgentHealth(id),
      gateway.getAgentRisk(id),
      gateway.getAgentMandate(id),
      gateway.getAgentActivity(id),
      gateway.getApprovalsQueue(),
    ]);

    const latestApproval = approvals.find((item) => item.agentId === id);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title={`Agent: ${agent.displayName}`} description="Autonomous finance operator controls. Frontend is not authority.">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: themeTokens.spacing.sm }}>
            <ModeBadge mode={runtime.config.mode} />
            <a href={`/agents?${query}`} style={{ color: themeTokens.color.primary }}>
              Back to agent console
            </a>
          </div>

          <AgentDetailNav agentId={id} query={query} />

          <InlineStatusIndicators
            ariaLabel="Agent status indicators"
            items={[
              { id: "status", label: "Status", value: agent.status, tone: agent.status === "ACTIVE" ? "success" : "danger" },
              { id: "autonomy", label: "Autonomy", value: agent.autonomyLevel, tone: "brand" },
              { id: "health", label: "Session health", value: health.failedTasks24h > 0 ? "degraded" : "healthy", tone: health.failedTasks24h > 0 ? "warning" : "success" },
            ]}
          />

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <Card title="Mandate">
              <p style={{ margin: 0 }}>{mandate.mandateId}</p>
              <p style={{ margin: 0 }}>Version {mandate.version}</p>
              <p style={{ margin: 0 }}>Policy {mandate.policyVersion}</p>
            </Card>
            <Card title="Spend and exposure">
              <p style={{ margin: 0 }}>Spend/hour: ${risk.spendRateUsdPerHour.toLocaleString()}</p>
              <p style={{ margin: 0 }}>Limit/hour: ${risk.spendLimitUsdPerHour.toLocaleString()}</p>
              <p style={{ margin: 0 }}>Exposure: ${risk.exposureUsd.toLocaleString()}</p>
              <p style={{ margin: 0 }}>Exposure limit: ${risk.exposureLimitUsd.toLocaleString()}</p>
            </Card>
            <Card title="Session/task health">
              <p style={{ margin: 0 }}>Active sessions: {health.activeSessions}</p>
              <p style={{ margin: 0 }}>Queued tasks: {health.queuedTasks}</p>
              <p style={{ margin: 0 }}>Failed (24h): {health.failedTasks24h}</p>
            </Card>
          </div>

          <Card title="Recent activity">
            {activity.length === 0 ? <p style={{ margin: 0 }}>No recent events.</p> : (
              <ul style={{ margin: 0, paddingLeft: themeTokens.spacing.lg }}>
                {activity.map((event) => (
                  <li key={event.id}>{event.timestamp} — {event.kind}: {event.summary} ({event.state})</li>
                ))}
              </ul>
            )}
          </Card>

          {latestApproval ? (
            <Card title="Latest intent requiring operator decision">
              <p style={{ marginTop: 0 }}>{latestApproval.action} {latestApproval.amount} {latestApproval.asset} to {latestApproval.recipientOrVenue}</p>
              <p style={{ marginTop: 0 }}>Risk: {latestApproval.riskSummary}</p>
              <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>
                Reason: {mapReasonCodeToPresentation(latestApproval.reasonCodes[0] ?? "").message}
              </p>
              <a href={`/agents/approvals/${latestApproval.id}?${query}`} style={{ color: themeTokens.color.primary }}>
                Open approval detail
              </a>
            </Card>
          ) : null}

          <EmergencyControlsClient agentId={id} canRunHighTrust={canAccessWorkspaceCapability(runtime.workspaceRole, "admin")} />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/agents/[id]", error);
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent details" description="Agent control and governance details.">
          <ErrorState
            title="Unable to load agent details"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/agents", label: "Back to agent console" }}
          />
        </Section>
      </section>
    );
  }
}
