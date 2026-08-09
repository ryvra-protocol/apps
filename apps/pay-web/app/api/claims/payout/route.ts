import { NextResponse, type NextRequest } from "next/server";
import {
  buildClaimIntent,
  buildClaimRequestContext,
  createClaimIdempotencyKey,
  createClientGeneratedId,
  normalizeClaimErrorEnvelope,
  type ClaimErrorEnvelope,
  type ClaimPayoutCandidate,
} from "../../../lib/claim-ux";
import { createPayRuntimeContext } from "../../../lib/runtime";

interface ClaimRequestBody {
  payout?: unknown;
  idempotencyKey?: unknown;
}

function isClaimPayoutCandidate(value: unknown): value is ClaimPayoutCandidate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ClaimPayoutCandidate>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.amountMinor === "number" &&
    Number.isFinite(candidate.amountMinor) &&
    typeof candidate.currency === "string" &&
    typeof candidate.destinationLabel === "string" &&
    typeof candidate.status === "string"
  );
}

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function jsonError(status: number, error: ClaimErrorEnvelope) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const runtime = createPayRuntimeContext("pay-web:claim-api");

  const requestId = request.headers.get("x-request-id")?.trim() || createClientGeneratedId("req");
  const correlationId = request.headers.get("x-correlation-id")?.trim() || requestId;

  if (!runtime.authDecision.allowed) {
    return jsonError(403, {
      code: "unauthorized",
      message: "You do not have permission to submit claims.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const payload = (await request.json().catch(() => ({}))) as ClaimRequestBody;
  if (!isClaimPayoutCandidate(payload.payout)) {
    return jsonError(400, {
      code: "invalid_request",
      message: "Claim request requires payout id, amount, currency, destination label, and status.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const endpointAvailable = runtime.config.mode === "mock" || runtime.config.mode === "http";
  if (!endpointAvailable) {
    return jsonError(503, {
      code: "claim_endpoint_unavailable",
      message: "Claim endpoint is unavailable in this runtime mode.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  if (runtime.config.mode === "http" && !getOptionalEnv("RYVRA_PAY_AUTH_TOKEN")) {
    return jsonError(412, {
      code: "pay_claim_auth_missing",
      message: "RYVRA_PAY_AUTH_TOKEN is required in HTTP mode to submit claims.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const idempotencyKeyCandidate = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey.trim() : "";
  const idempotencyKey = idempotencyKeyCandidate.length > 0 ? idempotencyKeyCandidate : createClaimIdempotencyKey(payload.payout.id);
  const requestContext = buildClaimRequestContext(idempotencyKey, requestId, correlationId);

  try {
    const intent = buildClaimIntent(payload.payout, requestContext);
    const response = await runtime.payClient.createPaymentIntent(intent, requestContext);

    runtime.logger.info("Submitted claim payment intent", {
      payoutId: payload.payout.id,
      intentId: response.intent_id,
      requestId,
      correlationId,
      idempotencyKey,
    });

    return NextResponse.json({
      ok: true,
      data: {
        intentId: response.intent_id,
        state: response.state,
        idempotencyKey,
        requestId,
        correlationId,
      },
    });
  } catch (error) {
    const envelope = normalizeClaimErrorEnvelope(error, requestId, correlationId);

    runtime.logger.error("Failed to submit claim payment intent", {
      payoutId: payload.payout.id,
      code: envelope.code,
      message: envelope.message,
      retryable: envelope.retryable,
      source: envelope.source,
      requestId,
      correlationId,
    });

    return jsonError(envelope.status ?? 500, envelope);
  }
}
