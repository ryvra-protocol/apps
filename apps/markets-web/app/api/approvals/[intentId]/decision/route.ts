import { canAccessWorkspaceCapability } from "@ryvra/auth";
import { NextResponse, type NextRequest } from "next/server";
import { createAgentGatewayClient } from "../../../../lib/agent-gateway-client";
import { normalizeDecisionState, requiresOperatorReason } from "../../../../lib/finance-control";
import { createMarketsRuntimeContext } from "../../../../lib/runtime";

interface ApprovalDecisionBody {
  decision?: unknown;
  reason?: unknown;
  comment?: unknown;
}

function jsonError(status: number, code: string, message: string, requestId: string, correlationId: string) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        retryable: status >= 500,
        source: "runtime",
        requestId,
        correlationId,
      },
    },
    { status },
  );
}

export async function POST(request: NextRequest, context: { params: Promise<{ intentId: string }> }) {
  const runtime = createMarketsRuntimeContext("markets-web:approval-decision-api");
  const requestId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id")?.trim() || requestId;

  if (!runtime.authDecision.allowed) {
    return jsonError(403, "unauthorized", "You do not have permission to submit approval decisions.", requestId, correlationId);
  }

  if (!canAccessWorkspaceCapability(runtime.workspaceRole, "operate")) {
    return jsonError(403, "forbidden", "Approval decisions require operator or admin workspace access.", requestId, correlationId);
  }

  const { intentId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as ApprovalDecisionBody;
  const decision = normalizeDecisionState(typeof body.decision === "string" ? body.decision : undefined);
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (requiresOperatorReason(decision) && reason.length === 0) {
    return jsonError(422, "reason_required", "A reason code is required for deny/challenge/quarantine decisions.", requestId, correlationId);
  }

  try {
    const gateway = createAgentGatewayClient(runtime);
    const result = await gateway.submitApprovalDecision(intentId, {
      decision,
      ...(reason ? { reason } : {}),
      ...(comment ? { comment } : {}),
    });

    runtime.logger.info("Submitted approval decision", {
      intentId,
      decision,
      requestId,
      correlationId,
      auditReference: result.auditReference,
    });

    return NextResponse.json({
      ok: true,
      data: {
        intentId,
        state: result.state,
        auditReference: result.auditReference,
        requestId,
        correlationId,
      },
    });
  } catch (error) {
    runtime.logger.error("Failed to submit approval decision", {
      intentId,
      requestId,
      correlationId,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError(502, "approval_action_failed", "Unable to submit approval decision to backend.", requestId, correlationId);
  }
}
