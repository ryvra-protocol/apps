import { NextResponse, type NextRequest } from "next/server";
import {
  createClientGeneratedId,
  createDailyClaimIdempotencyKey,
  normalizeClaimExecutionErrorEnvelope,
  type ClaimExecutionAttempt,
  type ClaimExecutionErrorEnvelope,
  type DailyClaimScope,
} from "../../../lib/claim-execution";
import { executeDailyClaimWorkflow, validateDailyClaimExecutionRuntime } from "../../../lib/claim-execution-server";
import { createPointsTasksRuntimeContext } from "../../../lib/runtime";

interface DailyClaimExecutionRequestBody {
  accountId?: unknown;
  userId?: unknown;
  workspaceId?: unknown;
  idempotencyKey?: unknown;
  intentId?: unknown;
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toScope(payload: DailyClaimExecutionRequestBody): DailyClaimScope | null {
  const accountId = getOptionalString(payload.accountId);
  if (!accountId) {
    return null;
  }

  const userId = getOptionalString(payload.userId);
  const workspaceId = getOptionalString(payload.workspaceId);

  return {
    accountId,
    ...(userId ? { userId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
  };
}

function jsonError(status: number, error: ClaimExecutionErrorEnvelope, data?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(data ? { data } : {}),
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const runtime = createPointsTasksRuntimeContext("points-tasks-web:daily-claim-api");

  const requestId = request.headers.get("x-request-id")?.trim() || createClientGeneratedId("req");
  const correlationId = request.headers.get("x-correlation-id")?.trim() || requestId;

  if (!runtime.authDecision.allowed) {
    return jsonError(403, {
      code: "unauthorized",
      message: "You do not have permission to execute daily claims.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const payload = (await request.json().catch(() => ({}))) as DailyClaimExecutionRequestBody;
  const scope = toScope(payload);

  if (!scope) {
    return jsonError(400, {
      code: "invalid_request",
      message: "Daily claim execution requires accountId.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const runtimeGuardError = validateDailyClaimExecutionRuntime(
    {
      mode: runtime.config.mode,
      hasPayAuthToken: runtime.payAuthTokenConfigured,
    },
    requestId,
    correlationId,
  );

  if (runtimeGuardError) {
    return jsonError(runtimeGuardError.status, runtimeGuardError.error);
  }

  const intentId = getOptionalString(payload.intentId);

  const attempt: ClaimExecutionAttempt = {
    idempotencyKey: getOptionalString(payload.idempotencyKey) ?? createDailyClaimIdempotencyKey(scope.accountId),
    requestId,
    correlationId,
    ...(intentId ? { intentId } : {}),
  };

  try {
    const result = await executeDailyClaimWorkflow({
      payClient: runtime.payClient,
      scope,
      attempt,
    });

    if (!result.ok) {
      const status = typeof result.error.status === "number" ? result.error.status : result.error.retryable ? 503 : 422;
      return jsonError(status, result.error, {
        idempotencyKey: result.idempotencyKey,
        requestId: result.requestId,
        correlationId: result.correlationId,
        ...(result.intentId ? { intentId: result.intentId } : {}),
        ...(result.lastKnownState ? { state: result.lastKnownState } : {}),
        ...(result.failedTransition ? { failedTransition: result.failedTransition } : {}),
      });
    }

    runtime.logger.info("Executed daily claim via pay intent workflow", {
      accountId: scope.accountId,
      intentId: result.intentId,
      requestId,
      correlationId,
      transitionsApplied: result.transitionsApplied,
    });

    return NextResponse.json({
      ok: true,
      data: {
        intentId: result.intentId,
        state: result.state,
        idempotencyKey: result.idempotencyKey,
        requestId: result.requestId,
        correlationId: result.correlationId,
        transitionsApplied: result.transitionsApplied,
        syncTargets: result.syncTargets,
      },
    });
  } catch (error) {
    const envelope = normalizeClaimExecutionErrorEnvelope(error, requestId, correlationId);
    return jsonError(envelope.status ?? 500, envelope, {
      idempotencyKey: attempt.idempotencyKey,
      requestId,
      correlationId,
      ...(attempt.intentId ? { intentId: attempt.intentId } : {}),
    });
  }
}
