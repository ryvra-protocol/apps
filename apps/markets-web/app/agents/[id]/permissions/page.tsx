import { Card, DataTable, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../../components/mode-badge";
import { AgentDetailNav } from "../../../components/agent-detail-nav";
import { ErrorState, UnauthorizedState } from "../../../components/page-states";
import { createAgentGatewayClient, type AgentCapability } from "../../../lib/agent-gateway-client";
import { parseWorkspaceId, type RouteSearchParams } from "../../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../../lib/runtime";

interface AgentPermissionsPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function AgentPermissionsPage({ params, searchParams }: AgentPermissionsPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:agents:permissions");
  if (!runtime.authDecision.allowed) {
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Agent permissions" description="Effective permissions and grants."><UnauthorizedState /></Section></section>;
  }

  try {
    const { id } = await params;
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: runtime.defaultAccountId ?? "acct-core-1", workspace_id: workspaceId }).toString();
    const gateway = createAgentGatewayClient(runtime);
    const mandate = await gateway.getAgentMandate(id);
    const capabilities = mandate.capabilities.map((item) => ({
      ...item,
      source: item.allowed ? item.source : `${item.source} (restricted)`,
    }));

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent permissions" description="Effective capability permissions from backend policy and mandate resolution.">
          <div style={{ display: "flex", justifyContent: "space-between" }}><ModeBadge mode={runtime.config.mode} /><a href={`/agents/${id}?${query}`}>Back to summary</a></div>
          <AgentDetailNav agentId={id} query={query} />
          <Card title="Security boundary note" tone="highlight">
            <p style={{ margin: 0 }}>Frontend displays effective permissions but cannot grant permissions or bypass backend checks.</p>
          </Card>
          <DataTable<AgentCapability>
            caption="Permission matrix"
            rows={capabilities}
            getRowKey={(row) => row.capability}
            emptyMessage="No permissions returned by backend."
            columns={[
              { key: "capability", header: "Capability" },
              { key: "allowed", header: "Granted", render: (value) => (value ? "GRANTED" : "DENIED") },
              { key: "source", header: "Policy source" },
            ]}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/agents/[id]/permissions", error);
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Agent permissions" description="Effective permissions and grants."><ErrorState title="Unable to load permissions" message={uiError.message} source={uiError.source} retryable={uiError.retryable} retryLink={{ href: "/agents", label: "Retry" }} /></Section></section>;
  }
}
