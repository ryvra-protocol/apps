import { DataTable, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../../components/mode-badge";
import { AgentDetailNav } from "../../../components/agent-detail-nav";
import { ErrorState, UnauthorizedState } from "../../../components/page-states";
import { createAgentGatewayClient, type AgentActivityEvent } from "../../../lib/agent-gateway-client";
import { formatDateTime } from "../../../lib/format";
import { parseWorkspaceId, type RouteSearchParams } from "../../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../../lib/runtime";

interface AgentActivityPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function AgentActivityPage({ params, searchParams }: AgentActivityPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:agents:activity");
  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent activity" description="Recent intents and execution activity.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const { id } = await params;
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: runtime.defaultAccountId ?? "acct-core-1", workspace_id: workspaceId }).toString();
    const gateway = createAgentGatewayClient(runtime);
    const activity = await gateway.getAgentActivity(id);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent activity" description="Intent/action history with correlation references.">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <ModeBadge mode={runtime.config.mode} />
            <a href={`/agents/${id}?${query}`}>Back to summary</a>
          </div>
          <AgentDetailNav agentId={id} query={query} />
          <DataTable<AgentActivityEvent>
            caption="Activity history"
            rows={activity}
            getRowKey={(row) => row.id}
            emptyMessage="No activity in this scope."
            columns={[
              { key: "timestamp", header: "Time", render: (value) => formatDateTime(String(value)) },
              { key: "kind", header: "Type" },
              { key: "summary", header: "Summary" },
              { key: "state", header: "State" },
              { key: "correlationId", header: "Correlation" },
            ]}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/agents/[id]/activity", error);
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent activity" description="Recent intents and execution activity.">
          <ErrorState
            title="Unable to load agent activity"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/agents", label: "Retry" }}
          />
        </Section>
      </section>
    );
  }
}
