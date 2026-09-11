import { Card, InlineStatusIndicators, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ApprovalsQueueClient } from "../components/approvals-queue-client";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { createAgentGatewayClient } from "../lib/agent-gateway-client";
import { parseWorkspaceId, type RouteSearchParams } from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";
import { formatDateTime } from "../lib/format";

interface AgentsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:agents");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent Console" description="Operator console for autonomous finance agents.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const scope = new URLSearchParams({
      account_id: runtime.defaultAccountId ?? "acct-core-1",
      workspace_id: workspaceId,
    });
    const query = scope.toString();
    const withScope = (path: string) => `${path}?${query}`;

    const gateway = createAgentGatewayClient(runtime);
    const [agents, approvals] = await Promise.all([gateway.listAgents(), gateway.getApprovalsQueue()]);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section
          title="Agent Console"
          description="Lifecycle controls, approvals, risk visibility, and audit/provenance workflows. Frontend is not authority."
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: themeTokens.spacing.sm }}>
            <ModeBadge mode={runtime.config.mode} />
            <a href={withScope("/perps/private")} style={{ color: themeTokens.color.primary }}>
              Open private perps views
            </a>
          </div>

          <InlineStatusIndicators
            ariaLabel="Agent console indicators"
            items={[
              { id: "agent-count", label: "Agents", value: String(agents.length), tone: "neutral" },
              { id: "approval-count", label: "Pending approvals", value: String(approvals.length), tone: approvals.length > 0 ? "warning" : "success" },
              { id: "boundary", label: "Authority", value: "Backend policy/risk", tone: "warning" },
            ]}
          />

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {agents.map((agent) => (
              <Card key={agent.id} title={agent.displayName} tone="muted">
                <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>Status: <strong>{agent.status}</strong></p>
                <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>Autonomy: <strong>{agent.autonomyLevel}</strong></p>
                <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>Mandate: {agent.mandateId} v{agent.mandateVersion}</p>
                <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>
                  Spend: ${agent.spendTodayUsd.toLocaleString()} / ${agent.spendLimitUsd.toLocaleString()}
                </p>
                <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.sm }}>
                  Exposure: ${agent.exposureUsd.toLocaleString()} / ${agent.exposureLimitUsd.toLocaleString()}
                </p>
                <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.md, color: themeTokens.color.textMuted }}>
                  Last heartbeat: {formatDateTime(agent.lastHeartbeatAt)}
                </p>
                <a href={withScope(`/agents/${agent.id}`)} style={{ color: themeTokens.color.primary }}>
                  Open control center
                </a>
              </Card>
            ))}
          </div>

          <ApprovalsQueueClient intents={approvals} basePath="/agents" query={query} />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/agents", error);
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent Console" description="Operator console for autonomous finance agents.">
          <ErrorState
            title="Unable to load agent console"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/agents", label: "Retry agent console" }}
          />
        </Section>
      </section>
    );
  }
}
