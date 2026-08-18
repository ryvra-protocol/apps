"use client";

import type { RuntimeMode } from "@ryvra/config";
import {
  ActionToolbar,
  Button,
  Card,
  ErrorTransparencySummary,
  StatusBadge,
  useNotificationCenter,
  themeTokens,
} from "@ryvra/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { executeP2pSendSubmission } from "../lib/p2p-submission-client";
import {
  createP2pClientGeneratedId,
  createP2pIdempotencyKey,
  resolveP2pNotificationStageFromIntentState,
  resolveP2pSendAvailability,
  transitionP2pSendStep,
  validateP2pSendDraft,
  type P2pErrorEnvelope,
  type P2pSendStep,
  type P2pSendValidated,
} from "../lib/p2p";
import { redactIdentifier } from "../lib/privacy";
import { buildP2pLifecycleNotification } from "../lib/notification-comms";

interface P2pSendFlowClientProps {
  mode: RuntimeMode;
  accountId: string;
  workspaceId?: string;
  canOperate: boolean;
  operateDeniedReason?: string;
  hasAuthToken: boolean;
}

interface P2pSendSuccessData {
  intentId?: string;
  state?: string;
  idempotencyKey: string;
  requestId: string;
  correlationId: string;
}

function resolveScopeQuery(accountId: string, workspaceId?: string): string {
  const params = new URLSearchParams({ account_id: accountId });
  if (workspaceId) {
    params.set("workspace_id", workspaceId);
  }

  return params.toString();
}

function formatAmount(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function P2pSendFlowClient({
  mode,
  accountId,
  workspaceId,
  canOperate,
  operateDeniedReason,
  hasAuthToken,
}: P2pSendFlowClientProps) {
  const router = useRouter();
  const { addNotification } = useNotificationCenter();
  const [step, setStep] = useState<P2pSendStep>("entry");
  const [recipientHandle, setRecipientHandle] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<{ recipientHandle?: string; amountInput?: string; memo?: string }>({});
  const [validatedTransfer, setValidatedTransfer] = useState<P2pSendValidated | null>(null);
  const [submissionError, setSubmissionError] = useState<P2pErrorEnvelope | null>(null);
  const [submissionGuidance, setSubmissionGuidance] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<P2pSendSuccessData | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const scopeQuery = useMemo(() => resolveScopeQuery(accountId, workspaceId), [accountId, workspaceId]);
  const withScope = (href: string): string => `${href}?${scopeQuery}`;

  const availability = resolveP2pSendAvailability({
    mode,
    hasAuthToken,
    canOperate,
    endpointAvailable: true,
  });

  const disabledReason = !canOperate
    ? operateDeniedReason ?? "P2P send requires Operator or Admin workspace access."
    : availability.reason;

  const flowDisabled = !availability.enabled;
  const isSubmitting = step === "submitting" || isRefreshing;

  const resetFlow = () => {
    setStep("entry");
    setErrors({});
    setValidatedTransfer(null);
    setSubmissionError(null);
    setSubmissionGuidance(null);
    setSuccessData(null);
  };

  const reviewTransfer = () => {
    const validation = validateP2pSendDraft({
      recipientHandle,
      amountInput,
      memo,
      currency: "USD",
    });

    if (!validation.valid || !validation.value) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setValidatedTransfer(validation.value);
    setSubmissionError(null);
    setSubmissionGuidance(null);
    setStep((current) => transitionP2pSendStep(current, "CONTINUE"));
  };

  const submitTransfer = async () => {
    if (!validatedTransfer || flowDisabled || isSubmitting) {
      return;
    }

    const idempotencyKey = createP2pIdempotencyKey(accountId, validatedTransfer.recipientHandle);
    const requestId = createP2pClientGeneratedId("req");
    const correlationId = createP2pClientGeneratedId("corr");

    setStep((current) => transitionP2pSendStep(current, "SUBMIT"));
    setSubmissionError(null);
    setSubmissionGuidance(null);

    addNotification(
      buildP2pLifecycleNotification({
        stage: "initiated",
        recipientHandle: validatedTransfer.recipientHandle,
        requestId,
        correlationId,
      }),
    );

    const result = await executeP2pSendSubmission({
      transfer: validatedTransfer,
      idempotencyKey,
      requestId,
      correlationId,
    });

    if (!result.ok) {
      setSubmissionError(result.error);
      setSubmissionGuidance(result.retry.guidance);
      setStep((current) => transitionP2pSendStep(current, "FAILURE"));

      addNotification(
        buildP2pLifecycleNotification({
          stage: "failed",
          recipientHandle: validatedTransfer.recipientHandle,
          requestId: result.error.requestId,
          correlationId: result.error.correlationId,
          retryable: result.error.retryable,
        }),
      );
      return;
    }

    const stage =
      result.data.stage === "completed" || result.data.stage === "failed" || result.data.stage === "initiated" || result.data.stage === "processing"
        ? result.data.stage
        : resolveP2pNotificationStageFromIntentState(result.data.state);

    if (stage === "processing") {
      addNotification(
        buildP2pLifecycleNotification({
          stage,
          recipientHandle: validatedTransfer.recipientHandle,
          requestId,
          correlationId,
          ...(result.data.intentId ? { intentId: result.data.intentId } : {}),
        }),
      );
    }

    if (stage === "completed") {
      addNotification(
        buildP2pLifecycleNotification({
          stage,
          recipientHandle: validatedTransfer.recipientHandle,
          requestId,
          correlationId,
          ...(result.data.intentId ? { intentId: result.data.intentId } : {}),
        }),
      );
    }

    setSuccessData({
      ...result.data,
      idempotencyKey: result.data.idempotencyKey ?? idempotencyKey,
      requestId: result.data.requestId ?? requestId,
      correlationId: result.data.correlationId ?? correlationId,
    });
    setStep((current) => transitionP2pSendStep(current, "SUCCESS"));

    if (result.shouldRefresh) {
      startRefresh(() => {
        router.refresh();
      });
    }
  };

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.md }} aria-labelledby="p2p-send-title">
      <style>{`
        .p2p-send-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
          font-size: ${themeTokens.typography.size.sm};
        }

        .p2p-send-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
          box-shadow: ${themeTokens.color.focusRingShadow};
        }
      `}</style>

      <ActionToolbar
        ariaLabel="P2P actions"
        items={[
          { id: "p2p-send", label: "Send", href: withScope("/p2p/send"), variant: "primary" },
          { id: "p2p-receive", label: "Receive", href: withScope("/p2p/receive") },
          { id: "p2p-request", label: "Request", href: withScope("/p2p/receive?action=request") },
          { id: "p2p-history", label: "View History", href: withScope("/p2p/history") },
        ]}
      />

      <Card title="Send money (P2P)">
        <div style={{ display: "grid", gap: themeTokens.spacing.md }}>
          <p id="p2p-send-title" style={{ margin: 0, color: themeTokens.color.textMuted }}>
            Review each transfer before confirm. References are privacy-safe and redacted in notifications.
          </p>

          {!flowDisabled ? null : (
            <p role="alert" style={{ margin: 0, color: themeTokens.color.danger }}>
              {disabledReason ?? "P2P send is unavailable."}
            </p>
          )}

          {step === "entry" ? (
            <form
              aria-label="P2P send form"
              onSubmit={(event) => {
                event.preventDefault();
                reviewTransfer();
              }}
              style={{ display: "grid", gap: themeTokens.spacing.md }}
            >
              <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
                <span>Recipient handle</span>
                <input
                  className="p2p-send-control"
                  type="text"
                  value={recipientHandle}
                  onChange={(event) => setRecipientHandle(event.currentTarget.value)}
                  placeholder="@recipient"
                  autoComplete="off"
                  aria-label="Recipient handle"
                  disabled={flowDisabled}
                />
                {errors.recipientHandle ? <span style={{ color: themeTokens.color.danger }}>{errors.recipientHandle}</span> : null}
              </label>

              <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
                <span>Amount (USD)</span>
                <input
                  className="p2p-send-control"
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.currentTarget.value)}
                  placeholder="0.00"
                  aria-label="Amount in USD"
                  disabled={flowDisabled}
                />
                {errors.amountInput ? <span style={{ color: themeTokens.color.danger }}>{errors.amountInput}</span> : null}
              </label>

              <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
                <span>Memo (optional)</span>
                <input
                  className="p2p-send-control"
                  type="text"
                  value={memo}
                  onChange={(event) => setMemo(event.currentTarget.value)}
                  placeholder="Reference"
                  aria-label="Transfer memo"
                  disabled={flowDisabled}
                />
                {errors.memo ? <span style={{ color: themeTokens.color.danger }}>{errors.memo}</span> : null}
              </label>

              <div style={{ display: "flex", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
                <Button type="submit" variant="primary" disabled={flowDisabled}>
                  Review transfer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setRecipientHandle("");
                    setAmountInput("");
                    setMemo("");
                    resetFlow();
                  }}
                  disabled={flowDisabled}
                >
                  Clear
                </Button>
              </div>
            </form>
          ) : null}

          {step === "review" && validatedTransfer ? (
            <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
              <p style={{ margin: 0 }}>
                Recipient: <strong>{redactIdentifier(validatedTransfer.recipientHandle, 2, 2)}</strong>
              </p>
              <p style={{ margin: 0 }}>
                Amount: <strong>{formatAmount(validatedTransfer.amountMinor, validatedTransfer.currency)}</strong>
              </p>
              <p style={{ margin: 0 }}>
                Memo: <strong>{validatedTransfer.memo ?? "Not provided"}</strong>
              </p>

              <div style={{ display: "flex", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep((current) => transitionP2pSendStep(current, "BACK"))}
                >
                  Edit
                </Button>
                <Button type="button" variant="primary" onClick={submitTransfer}>
                  Confirm and send
                </Button>
              </div>
            </div>
          ) : null}

          {step === "submitting" ? (
            <p role="status" aria-live="polite" style={{ margin: 0 }}>
              Submitting transfer…
            </p>
          ) : null}

          {step === "success" && successData ? (
            <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
              <StatusBadge status={successData.state ?? "created"} textTransform="capitalize" minWidth="8rem" />
              <p style={{ margin: 0 }}>
                Transfer accepted. Intent reference: <strong>{redactIdentifier(successData.intentId ?? "pending", 3, 3)}</strong>
              </p>
              <p style={{ margin: 0, color: themeTokens.color.textMuted }}>
                Request: {redactIdentifier(successData.requestId, 3, 3)} • Correlation: {redactIdentifier(successData.correlationId, 3, 3)}
              </p>
              <div style={{ display: "flex", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
                <Button type="button" onClick={resetFlow}>
                  Send another
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.push(withScope("/p2p/history"))}>
                  View history
                </Button>
              </div>
            </div>
          ) : null}

          {step === "failure" && submissionError ? (
            <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
              <ErrorTransparencySummary
                message={submissionError.message}
                source={submissionError.source}
                retryable={submissionError.retryable}
                retryActionLabel="Retry transfer"
              />
              {submissionGuidance ? <p style={{ margin: 0, color: themeTokens.color.textMuted }}>{submissionGuidance}</p> : null}
              <div style={{ display: "flex", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
                <Button
                  type="button"
                  onClick={submitTransfer}
                  disabled={!submissionError.retryable}
                  aria-label="Retry transfer with same idempotency key"
                >
                  Retry transfer
                </Button>
                <Button type="button" variant="secondary" onClick={resetFlow}>
                  Start new transfer
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
