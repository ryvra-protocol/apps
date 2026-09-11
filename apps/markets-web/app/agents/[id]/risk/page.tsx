import { Card, InlineStatusIndicators, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../../components/mode-badge";
import { AgentDetailNav } from "../../../components/agent-detail-nav";
import { ErrorState, UnauthorizedState } from "../../../components/page-states";
import { createAgentGatewayClient } from "../../../lib/agent-gateway-client";
import { resolveRiskTone } from "../../../lib/finance-control";
import { parseWorkspaceId, type RouteSearchParams } from "../../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../../lib/runtime";

interface AgentRiskPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function AgentRiskPage({ params, searchParams }: AgentRiskPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:agents:risk");
  if (!runtime.authDecision.allowed) {
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Agent risk" description="Risk and exposure controls."><UnauthorizedState /></Section></section>;
  }

  try {
    const { id } = await params;
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: runtime.defaultAccountId ?? "acct-core-1", workspace_id: workspaceId }).toString();
    const gateway = createAgentGatewayClient(runtime);
    const risk = await gateway.getAgentRisk(id);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent risk" description="Policy/risk visibility including spend and exposure guardrails.">
          <div style={{ display: "flex", justifyContent: "space-between" }}><ModeBadge mode={runtime.config.mode} /><a href={`/agents/${id}?${query}`}>Back to summary</a></div>
          <AgentDetailNav agentId={id} query={query} />
          <InlineStatusIndicators
            ariaLabel="Risk indicators"
            items={[
              { id: "risk-score", label: "Risk score", value: String(risk.score), tone: resolveRiskTone(risk.score) },
              { id: "risk-severity", label: "Severity", value: risk.severity.toUpperCase(), tone: resolveRiskTone(risk.score) },
              { id: "authority", label: "Decision authority", value: "Backend policy-risk", tone: "warning" },
            ]}
          />
          <Card title="Guardrails">
            <p style={{ marginTop: 0 }}>Spend rate: ${risk.spendRateUsdPerHour.toLocaleString()} / hour</p>
            <p style={{ marginTop: 0 }}>Spend limit: ${risk.spendLimitUsdPerHour.toLocaleString()} / hour</p>
            <p style={{ marginTop: 0 }}>Exposure: ${risk.exposureUsd.toLocaleString()}</p>
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.sm }}>Exposure limit: ${risk.exposureLimitUsd.toLocaleString()}</p>
            <p style={{ margin: 0 }}>Flags: {risk.flags.length > 0 ? risk.flags.join(", ") : "none"}</p>
          </Card>
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/agents/[id]/risk", error);
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Agent risk" description="Risk and exposure controls."><ErrorState title="Unable to load risk view" message={uiError.message} source={uiError.source} retryable={uiError.retryable} retryLink={{ href: "/agents", label: "Retry" }} /></Section></section>;
  }
}
