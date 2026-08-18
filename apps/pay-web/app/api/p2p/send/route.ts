import { canAccessWorkspaceCapability } from "@ryvra/auth";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildP2pSendIntent,
  createP2pClientGeneratedId,
  createP2pIdempotencyKey,
  normalizeP2pErrorEnvelope,
  resolveP2pNotificationStageFromIntentState,
  validateP2pSendDraft,
  type P2pErrorEnvelope,
} from "../../../lib/p2p";
import { createPayRuntimeContext } from "../../../lib/runtime";

interface P2pSendRequestBody {
  recipientHandle?: unknown;
  amountMinor?: unknown;
  currency?: unknown;
  memo?: unknown;
  idempotencyKey?: unknown;
}

function jsonError(status: number, error: P2pErrorEnvelope) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status },
  );
}

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function toAmountInput(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export async function POST(request: NextRequest) {
  const runtime = createPayRuntimeContext("pay-web:p2p-send-api");

  const requestId = request.headers.get("x-request-id")?.trim() || createP2pClientGeneratedId("req");
  const correlationId = request.headers.get("x-correlation-id")?.trim() || requestId;

  if (!runtime.authDecision.allowed) {
    return jsonError(403, {
      code: "unauthorized",
      message: "You do not have permission to send P2P transfers.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  if (!canAccessWorkspaceCapability(runtime.workspaceRole, "operate")) {
    return jsonError(403, {
      code: "forbidden",
      message: "P2P send requires Operator or Admin workspace access.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const payload = (await request.json().catch(() => ({}))) as P2pSendRequestBody;
  const recipientHandle = typeof payload.recipientHandle === "string" ? payload.recipientHandle : "";
  const amountMinor = typeof payload.amountMinor === "number" && Number.isFinite(payload.amountMinor)
    ? Math.round(payload.amountMinor)
    : Number.NaN;
  const currency = typeof payload.currency === "string" ? payload.currency : "USD";
  const memo = typeof payload.memo === "string" ? payload.memo : undefined;

  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    return jsonError(400, {
      code: "invalid_request",
      message: "P2P send requires a positive amount in minor units.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const validation = validateP2pSendDraft({
    recipientHandle,
    amountInput: toAmountInput(amountMinor),
    currency,
    ...(memo ? { memo } : {}),
  });

  if (!validation.valid || !validation.value) {
    return jsonError(400, {
      code: "invalid_request",
      message: "Recipient handle, amount, or memo is invalid for P2P send.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  if (runtime.config.mode === "http" && !getOptionalEnv("RYVRA_PAY_AUTH_TOKEN")) {
    return jsonError(412, {
      code: "pay_auth_missing",
      message: "RYVRA_PAY_AUTH_TOKEN is required in HTTP mode to send P2P transfers.",
      retryable: false,
      source: "runtime",
      requestId,
      correlationId,
    });
  }

  const senderAccountId = runtime.marketsAccountId ?? "acct-core-1";
  const idempotencyKeyCandidate = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey.trim() : "";
  const idempotencyKey =
    idempotencyKeyCandidate.length > 0
      ? idempotencyKeyCandidate
      : createP2pIdempotencyKey(senderAccountId, validation.value.recipientHandle);

  const requestContext = {
    idempotencyKey,
    requestId,
    correlationId,
  };

  try {
    const intent = buildP2pSendIntent(validation.value, senderAccountId, requestContext);
    let finalIntent = await runtime.payClient.createPaymentIntent(intent, requestContext);

    if (runtime.config.mode === "mock") {
      finalIntent = await runtime.payClient.transitionPaymentIntent(finalIntent.intent_id, "authorized", requestContext);
      finalIntent = await runtime.payClient.transitionPaymentIntent(finalIntent.intent_id, "executing", requestContext);
      finalIntent = await runtime.payClient.transitionPaymentIntent(finalIntent.intent_id, "settled", requestContext);
    } else {
      try {
        finalIntent = await runtime.payClient.transitionPaymentIntent(finalIntent.intent_id, "executing", requestContext);
      } catch (transitionError) {
        const transitionEnvelope = normalizeP2pErrorEnvelope(transitionError, requestId, correlationId);
        runtime.logger.info("P2P transition deferred after intent creation", {
          intentId: finalIntent.intent_id,
          code: transitionEnvelope.code,
          source: transitionEnvelope.source,
          retryable: transitionEnvelope.retryable,
        });
      }
    }

    const stage = resolveP2pNotificationStageFromIntentState(finalIntent.state);

    runtime.logger.info("Submitted P2P payment intent", {
      intentId: finalIntent.intent_id,
      state: finalIntent.state,
      stage,
      requestId,
      correlationId,
      idempotencyKey,
    });

    return NextResponse.json({
      ok: true,
      data: {
        intentId: finalIntent.intent_id,
        state: finalIntent.state,
        stage,
        idempotencyKey,
        requestId,
        correlationId,
      },
    });
  } catch (error) {
    const envelope = normalizeP2pErrorEnvelope(error, requestId, correlationId);

    runtime.logger.error("Failed to submit P2P transfer", {
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
