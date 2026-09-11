import { canAccessWorkspaceCapability } from "@ryvra/auth";
import { NextResponse, type NextRequest } from "next/server";
import { createAgentGatewayClient } from "../../../../lib/agent-gateway-client";
import {
  emergencyOperations,
  isHighTrustEmergencyOperation,
  type EmergencyOperation,
} from "../../../../lib/finance-control";
import { createMarketsRuntimeContext } from "../../../../lib/runtime";

interface EmergencyRequestBody {
  operation?: unknown;
  reason?: unknown;
  capability?: unknown;
  confirmationText?: unknown;
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

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const runtime = createMarketsRuntimeContext("markets-web:emergency-controls-api");
  const requestId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id")?.trim() || requestId;

  if (!runtime.authDecision.allowed) {
    return jsonError(403, "unauthorized", "You do not have permission to execute emergency controls.", requestId, correlationId);
  }

  if (!canAccessWorkspaceCapability(runtime.workspaceRole, "operate")) {
    return jsonError(403, "forbidden", "Emergency controls require operator or admin workspace access.", requestId, correlationId);
  }

  const { id: agentId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as EmergencyRequestBody;
  const operation = typeof body.operation === "string" ? body.operation : "";

  if (!emergencyOperations.includes(operation as EmergencyOperation)) {
    return jsonError(400, "invalid_operation", "Operation is not supported.", requestId, correlationId);
  }

  const typedOperation = operation as EmergencyOperation;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const capability = typeof body.capability === "string" ? body.capability.trim() : undefined;
  const confirmationText = typeof body.confirmationText === "string" ? body.confirmationText.trim() : "";
  const requiredConfirmation = `CONFIRM ${typedOperation}`;

  if (reason.length < 8) {
    return jsonError(422, "reason_required", "Emergency controls require a clear operator reason.", requestId, correlationId);
  }

  if (confirmationText !== requiredConfirmation) {
    return jsonError(422, "confirmation_required", `Confirmation text must match '${requiredConfirmation}'.`, requestId, correlationId);
  }

  if (typedOperation === "revoke_capability" && !capability) {
    return jsonError(422, "capability_required", "Capability value is required for revoke_capability.", requestId, correlationId);
  }

  if (isHighTrustEmergencyOperation(typedOperation) && !canAccessWorkspaceCapability(runtime.workspaceRole, "admin")) {
    return jsonError(403, "high_trust_required", "Deactivating kill switch requires admin high-trust flow.", requestId, correlationId);
  }

  try {
    const gateway = createAgentGatewayClient(runtime);
    const result = await gateway.executeEmergencyOperation(agentId, {
      operation: typedOperation,
      reason,
      ...(capability ? { capability } : {}),
      confirmationText,
    });

    runtime.logger.info("Submitted emergency control operation", {
      operation: typedOperation,
      agentId,
      requestId,
      correlationId,
      auditReference: result.auditReference,
    });

    return NextResponse.json({
      ok: true,
      data: {
        operation: typedOperation,
        agentId,
        auditReference: result.auditReference,
        result: result.result,
        requestId,
        correlationId,
      },
    });
  } catch (error) {
    runtime.logger.error("Failed emergency control operation", {
      operation: typedOperation,
      agentId,
      requestId,
      correlationId,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError(502, "emergency_action_failed", "Unable to execute emergency control against backend.", requestId, correlationId);
  }
}
