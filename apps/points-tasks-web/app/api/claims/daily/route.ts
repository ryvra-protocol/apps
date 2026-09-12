import { NextResponse, type NextRequest } from "next/server";
import {
  claimExecutionSyncTargets,
  createClientGeneratedId,
  createDailyClaimIdempotencyKey,
  normalizeClaimExecutionErrorEnvelope,
  type ClaimExecutionAttempt,
  type ClaimExecutionErrorEnvelope,
  type DailyClaimScope,
} from "../../../lib/claim-execution";
import { getFingerprintClaimStatus, submitFingerprintClaim } from "../../../lib/fingerprint-claim";
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

  const intentId = getOptionalString(payload.intentId);

  const attempt: ClaimExecutionAttempt = {
    idempotencyKey: getOptionalString(payload.idempotencyKey) ?? createDailyClaimIdempotencyKey(scope.accountId),
    requestId,
    correlationId,
    ...(intentId ? { intentId } : {}),
  };

  try {
    const result = submitFingerprintClaim({
      scope,
      nowIso: new Date().toISOString(),
      idempotencyKey: attempt.idempotencyKey,
      requestId,
      correlationId,
    });

    if (!result.ok) {
      return jsonError(result.error.status, result.error, {
        idempotencyKey: attempt.idempotencyKey,
        requestId,
        correlationId,
        state: result.status.status,
      });
    }

    runtime.logger.info("Executed fingerprint daily claim", {
      accountId: scope.accountId,
      awardedPoints: result.awardedPoints,
      claimDateKey: result.claimDateKey,
      requestId,
      correlationId,
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...(intentId ? { intentId } : {}),
        state: "settled",
        idempotencyKey: attempt.idempotencyKey,
        requestId,
        correlationId,
        syncTargets: claimExecutionSyncTargets,
        awardedPoints: result.awardedPoints,
        scanTimestamp: result.scanTimestamp,
        claimDateKey: result.claimDateKey,
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

export async function GET(request: NextRequest) {
  const runtime = createPointsTasksRuntimeContext("points-tasks-web:daily-claim-status-api");
  const requestId = request.headers.get("x-request-id")?.trim() || createClientGeneratedId("req");
  const correlationId = request.headers.get("x-correlation-id")?.trim() || requestId;

  if (!runtime.authDecision.allowed) {
    return jsonError(403, {
      code: "unauthorized",
      message: "You do not have permission to read daily claim status.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const scope = toScope({
    accountId: request.nextUrl.searchParams.get("accountId"),
    userId: request.nextUrl.searchParams.get("userId"),
    workspaceId: request.nextUrl.searchParams.get("workspaceId"),
  });

  if (!scope) {
    return jsonError(400, {
      code: "invalid_request",
      message: "Daily claim status requires accountId.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const status = getFingerprintClaimStatus(scope);
  return NextResponse.json({
    ok: true,
    data: status,
  });
}
