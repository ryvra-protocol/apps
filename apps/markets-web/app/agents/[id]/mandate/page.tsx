import { Card, DataTable, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../../components/mode-badge";
import { AgentDetailNav } from "../../../components/agent-detail-nav";
import { ErrorState, UnauthorizedState } from "../../../components/page-states";
import { createAgentGatewayClient, type AgentCapability } from "../../../lib/agent-gateway-client";
import { parseWorkspaceId, type RouteSearchParams } from "../../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../../lib/runtime";

interface AgentMandatePageProps {
  params: Promise<{ id: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function AgentMandatePage({ params, searchParams }: AgentMandatePageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:agents:mandate");
  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Agent mandate" description="Mandate and capability matrix."><UnauthorizedState /></Section></section>
    );
  }

  try {
    const { id } = await params;
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: runtime.defaultAccountId ?? "acct-core-1", workspace_id: workspaceId }).toString();
    const gateway = createAgentGatewayClient(runtime);
    const mandate = await gateway.getAgentMandate(id);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Agent mandate" description="Mandate revision and capability matrix for backend-authorized execution.">
          <div style={{ display: "flex", justifyContent: "space-between" }}><ModeBadge mode={runtime.config.mode} /><a href={`/agents/${id}?${query}`}>Back to summary</a></div>
          <AgentDetailNav agentId={id} query={query} />
          <Card title="Mandate references">
            <p style={{ marginTop: 0 }}>mandateId: <strong>{mandate.mandateId}</strong></p>
            <p style={{ marginTop: 0 }}>version: <strong>{mandate.version}</strong></p>
            <p style={{ marginTop: 0 }}>policyVersion: <strong>{mandate.policyVersion}</strong></p>
            <p style={{ margin: 0 }}>updatedAt: {mandate.updatedAt}</p>
          </Card>
          <DataTable<AgentCapability>
            caption="Capability matrix"
            rows={mandate.capabilities}
            getRowKey={(row) => row.capability}
            emptyMessage="No capabilities provided by backend."
            columns={[
              { key: "capability", header: "Capability" },
              { key: "allowed", header: "Allowed", render: (value) => (value ? "YES" : "NO") },
              { key: "source", header: "Source" },
            ]}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/agents/[id]/mandate", error);
    return <section style={{ display: "grid", gap: themeTokens.spacing.lg }}><Section title="Agent mandate" description="Mandate and capability matrix."><ErrorState title="Unable to load mandate" message={uiError.message} source={uiError.source} retryable={uiError.retryable} retryLink={{ href: "/agents", label: "Retry" }} /></Section></section>;
  }
}
