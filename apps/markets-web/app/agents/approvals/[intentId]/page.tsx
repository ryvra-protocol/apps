import { Card, InlineStatusIndicators, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../../components/mode-badge";
import { ApprovalDecisionFormClient } from "../../../components/approval-decision-form-client";
import { ErrorState, UnauthorizedState } from "../../../components/page-states";
import { createAgentGatewayClient } from "../../../lib/agent-gateway-client";
import { mapReasonCodeToPresentation } from "../../../lib/finance-control";
import { parseWorkspaceId, type RouteSearchParams } from "../../../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../../../lib/runtime";

interface ApprovalDetailPageProps {
  params: Promise<{ intentId: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function ApprovalDetailPage({ params, searchParams }: ApprovalDetailPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:approval-detail");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Approval detail" description="Intent approval and escalation decisioning.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const { intentId } = await params;
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams) ?? "workspace-core-1";
    const query = new URLSearchParams({ account_id: runtime.defaultAccountId ?? "acct-core-1", workspace_id: workspaceId }).toString();
    const gateway = createAgentGatewayClient(runtime);
    const intent = await gateway.getApprovalIntent(intentId);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title={`Approval intent: ${intent.id}`} description="Operator decisions are submitted to backend authority for final policy/risk enforcement.">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <ModeBadge mode={runtime.config.mode} />
            <a href={`/agents?${query}`}>Back to queue</a>
          </div>

          <InlineStatusIndicators
            ariaLabel="Intent detail indicators"
            items={[
              { id: "state", label: "State", value: intent.state, tone: intent.state === "REVIEW" ? "warning" : "neutral" },
              { id: "risk", label: "Risk", value: intent.riskAssessmentId, tone: "danger" },
              { id: "authority", label: "Authority", value: "Backend only", tone: "warning" },
            ]}
          />

          <Card title="Intent payload">
            <p style={{ marginTop: 0 }}>action: <strong>{intent.action}</strong></p>
            <p style={{ marginTop: 0 }}>amount/asset: <strong>{intent.amount} {intent.asset}</strong></p>
            <p style={{ marginTop: 0 }}>recipient/venue: <strong>{intent.recipientOrVenue}</strong></p>
            <p style={{ marginTop: 0 }}>purpose: {intent.purpose}</p>
            <p style={{ marginTop: 0 }}>mandateId: {intent.mandateId}</p>
            <p style={{ marginTop: 0 }}>policyVersion: {intent.policyVersion}</p>
            <p style={{ marginTop: 0 }}>riskAssessmentId: {intent.riskAssessmentId}</p>
            <p style={{ marginTop: 0 }}>authorizationId: {intent.authorizationId ?? "n/a"}</p>
            <p style={{ marginTop: 0 }}>correlationId: {intent.correlationId}</p>
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.sm }}>idempotencyKey: {intent.idempotencyKey}</p>
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.sm }}>Risk summary: {intent.riskSummary}</p>
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.sm }}>
              Reason: {mapReasonCodeToPresentation(intent.reasonCodes[0] ?? "").message}
            </p>
            <p style={{ margin: 0 }}>Provenance refs: {intent.provenanceRefs.join(", ") || "n/a"}</p>
          </Card>

          <ApprovalDecisionFormClient intentId={intent.id} initialState={intent.state} />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/agents/approvals/[intentId]", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Approval detail" description="Intent approval and escalation decisioning.">
          <ErrorState
            title="Unable to load approval intent"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/agents", label: "Back to queue" }}
          />
        </Section>
      </section>
    );
  }
}
