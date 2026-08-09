import type { PayClient } from "@ryvra/api-client";
import type { RuntimeMode } from "@ryvra/config";
import type { PaymentIntentState } from "@ryvra/domain-payments";
import {
  buildClaimTransitionIdempotencyKey,
  buildDailyClaimIntent,
  claimExecutionSyncTargets,
  claimExecutionTransitions,
  normalizeClaimExecutionErrorEnvelope,
  type ClaimExecutionAttempt,
  type ClaimExecutionErrorEnvelope,
  type DailyClaimScope,
} from "./claim-execution";

interface ClaimExecutionRuntimeValidationInput {
  mode: RuntimeMode;
  hasPayAuthToken: boolean;
}

export interface ClaimExecutionRuntimeValidationError {
  status: number;
  error: ClaimExecutionErrorEnvelope;
}

export interface ExecuteDailyClaimWorkflowInput {
  payClient: Pick<PayClient, "createPaymentIntent" | "transitionPaymentIntent">;
  scope: DailyClaimScope;
  attempt: ClaimExecutionAttempt;
}

export type ExecuteDailyClaimWorkflowResult =
  | {
      ok: true;
      intentId: string;
      state: PaymentIntentState;
      idempotencyKey: string;
      requestId: string;
      correlationId: string;
      transitionsApplied: PaymentIntentState[];
      syncTargets: readonly string[];
    }
  | {
      ok: false;
      error: ClaimExecutionErrorEnvelope;
      idempotencyKey: string;
      requestId: string;
      correlationId: string;
      intentId?: string;
      failedTransition?: PaymentIntentState;
      lastKnownState?: PaymentIntentState;
    };

const transitionProgression: PaymentIntentState[] = ["created", "authorized", "executing", "settled"];

function resolveTransitionsFromState(state: PaymentIntentState | undefined): PaymentIntentState[] {
  if (!state || state === "created") {
    return [...claimExecutionTransitions];
  }

  if (state === "authorized") {
    return ["executing", "settled"];
  }

  if (state === "executing") {
    return ["settled"];
  }

  if (state === "settled") {
    return [];
  }

  return [...claimExecutionTransitions];
}

function isTerminalFailureState(state: PaymentIntentState | undefined): state is "failed" | "reversed" {
  return state === "failed" || state === "reversed";
}

export function validateDailyClaimExecutionRuntime(
  input: ClaimExecutionRuntimeValidationInput,
  requestId: string,
  correlationId: string,
): ClaimExecutionRuntimeValidationError | null {
  if (input.mode === "http" && !input.hasPayAuthToken) {
    return {
      status: 412,
      error: {
        code: "pay_claim_auth_missing",
        message: "RYVRA_PAY_AUTH_TOKEN is required in HTTP mode to execute daily claims.",
        retryable: false,
        source: "runtime",
        requestId,
        correlationId,
      },
    };
  }

  return null;
}

/**
 * Provisional transition workflow used until pay publishes an explicit daily-claim transition contract:
 * created -> authorized -> executing -> settled.
 */
export async function executeDailyClaimWorkflow(input: ExecuteDailyClaimWorkflowInput): Promise<ExecuteDailyClaimWorkflowResult> {
  const { scope, payClient, attempt } = input;
  const requestOptions = {
    requestId: attempt.requestId,
    correlationId: attempt.correlationId,
  };

  let intentId = attempt.intentId;
  let lastKnownState: PaymentIntentState | undefined;

  if (!intentId) {
    try {
      const intent = await payClient.createPaymentIntent(buildDailyClaimIntent(scope, attempt), {
        ...requestOptions,
        idempotencyKey: attempt.idempotencyKey,
      });
      intentId = intent.intent_id;
      lastKnownState = intent.state;
    } catch (error) {
      return {
        ok: false,
        error: normalizeClaimExecutionErrorEnvelope(error, attempt.requestId, attempt.correlationId),
        idempotencyKey: attempt.idempotencyKey,
        requestId: attempt.requestId,
        correlationId: attempt.correlationId,
      };
    }
  }

  if (!intentId) {
    return {
      ok: false,
      error: {
        code: "intent_id_missing",
        message: "Claim intent creation did not return an intent id.",
        retryable: false,
        source: "runtime",
        requestId: attempt.requestId,
        correlationId: attempt.correlationId,
      },
      idempotencyKey: attempt.idempotencyKey,
      requestId: attempt.requestId,
      correlationId: attempt.correlationId,
    };
  }

  if (isTerminalFailureState(lastKnownState)) {
    return {
      ok: false,
      error: {
        code: "claim_intent_terminal_state",
        message: `Claim intent ${intentId} is already in terminal state ${lastKnownState}. Start a new attempt.`,
        retryable: false,
        source: "pay",
        requestId: attempt.requestId,
        correlationId: attempt.correlationId,
      },
      idempotencyKey: attempt.idempotencyKey,
      requestId: attempt.requestId,
      correlationId: attempt.correlationId,
      intentId,
      lastKnownState,
    };
  }

  const transitionsToApply = resolveTransitionsFromState(lastKnownState);
  const transitionsApplied: PaymentIntentState[] = [];

  for (const toState of transitionsToApply) {
    try {
      const transitioned = await payClient.transitionPaymentIntent(intentId, toState, {
        ...requestOptions,
        idempotencyKey: buildClaimTransitionIdempotencyKey(attempt.idempotencyKey, toState),
      });
      lastKnownState = transitioned.state;
      transitionsApplied.push(toState);
    } catch (error) {
      const normalized = normalizeClaimExecutionErrorEnvelope(error, attempt.requestId, attempt.correlationId);

      return {
        ok: false,
        error: normalized,
        idempotencyKey: attempt.idempotencyKey,
        requestId: attempt.requestId,
        correlationId: attempt.correlationId,
        intentId,
        failedTransition: toState,
        ...(lastKnownState ? { lastKnownState } : {}),
      };
    }
  }

  const stateAfterWorkflow = lastKnownState ?? transitionProgression[0]!;

  return {
    ok: true,
    intentId,
    state: stateAfterWorkflow,
    idempotencyKey: attempt.idempotencyKey,
    requestId: attempt.requestId,
    correlationId: attempt.correlationId,
    transitionsApplied,
    syncTargets: claimExecutionSyncTargets,
  };
}
