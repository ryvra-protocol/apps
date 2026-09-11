import { Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../../components/mode-badge";
import { AgentDetailNav } from "../../../components/agent-detail-nav";
import { AuditTraceExplorerClient } from "../../../components/audit-trace-explorer-client";
import { ErrorState, UnauthorizedState } from "../../../components/page-states";
import { createAgentGatewayClient } from "../../../lib/agent-gateway-client";
import { parseWorkspaceId, type RouteSearchParams } from "../../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../../lib/runtime";

interface AgentAuditPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function AgentAuditPage({ params, searchParams }: AgentAuditPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:agents:audit");
  if (!runtime.authDecision.allowed) {
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Agent audit" description="Audit trail and provenance tracing."><UnauthorizedState /></Section></section>;
  }

  try {
    const { id } = await params;
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: runtime.defaultAccountId ?? "acct-core-1", workspace_id: workspaceId }).toString();
    const gateway = createAgentGatewayClient(runtime);
    const events = await gateway.listAuditTrace({ agentId: id });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent audit" description="Trace explorer for actor → mandate → policy → risk → intent → authorization → execution → ledger → settlement.">
          <div style={{ display: "flex", justifyContent: "space-between" }}><ModeBadge mode={runtime.config.mode} /><a href={`/agents/${id}?${query}`}>Back to summary</a></div>
          <AgentDetailNav agentId={id} query={query} />
          <AuditTraceExplorerClient events={events} defaultFilters={{ agentId: id }} />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/agents/[id]/audit", error);
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Agent audit" description="Audit trail and provenance tracing."><ErrorState title="Unable to load audit view" message={uiError.message} source={uiError.source} retryable={uiError.retryable} retryLink={{ href: "/agents", label: "Retry" }} /></Section></section>;
  }
}
