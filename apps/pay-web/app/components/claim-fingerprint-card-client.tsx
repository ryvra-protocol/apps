"use client";

import type { RuntimeMode } from "@ryvra/config";
import {
  Button,
  Card,
  ComplianceEvidencePanel,
  ConfirmationReceiptCard,
  ErrorTransparencySummary,
  OperationTimelineCard,
  themeTokens,
} from "@ryvra/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createClaimIdempotencyKey,
  createClaimSubmissionLock,
  createClientGeneratedId,
  formatClaimErrorMeta,
  getFingerprintAriaLabel,
  resolveClaimConfirmationDelay,
  transitionClaimUiState,
  type ClaimAvailability,
  type ClaimErrorEnvelope,
  type ClaimPayoutCandidate,
  type ClaimUiState,
} from "../lib/claim-ux";
import { executeClaimSubmission } from "../lib/claim-submission-client";
import { formatCurrencyMinor } from "../lib/format";
import { StatusBadge } from "./status-badge";

interface ClaimResponseData {
  intentId?: string;
  state?: string;
  idempotencyKey?: string;
  requestId?: string;
  correlationId?: string;
}

interface ClaimTimelineTimestamps {
  confirmationStartedAt?: string;
  submittedAt?: string;
  resolvedAt?: string;
}

interface ClaimFingerprintCardClientProps {
  mode: RuntimeMode;
  payout: ClaimPayoutCandidate | null;
  availability: ClaimAvailability;
}

function createReference(label: string, value?: string | null) {
  return value && value.trim().length > 0 ? { label, value } : { label };
}

export function ClaimFingerprintCardClient({ mode, payout, availability }: ClaimFingerprintCardClientProps) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [uiState, setUiState] = useState<ClaimUiState>("idle");
  const [idempotencyKey, setIdempotencyKey] = useState(() => (payout ? createClaimIdempotencyKey(payout.id) : ""));
  const [error, setError] = useState<ClaimErrorEnvelope | null>(null);
  const [successData, setSuccessData] = useState<ClaimResponseData | null>(null);
  const [submissionGuidance, setSubmissionGuidance] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [timelineTimestamps, setTimelineTimestamps] = useState<ClaimTimelineTimestamps>({});
  const [isRefreshing, startRefresh] = useTransition();

  const lockRef = useRef(createClaimSubmissionLock());
  const confirmationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMotionPreference);
      return () => mediaQuery.removeEventListener("change", updateMotionPreference);
    }

    mediaQuery.addListener(updateMotionPreference);
    return () => mediaQuery.removeListener(updateMotionPreference);
  }, []);

  useEffect(() => {
    return () => {
      if (confirmationTimerRef.current) {
        clearTimeout(confirmationTimerRef.current);
      }
    };
  }, []);

  const disabled = !availability.enabled || !payout;

  const confirmationHint = useMemo(
    () =>
      prefersReducedMotion
        ? "Reduced motion is enabled, so confirmation submits immediately after tap."
        : "Tap the fingerprint control to confirm before submit.",
    [prefersReducedMotion],
  );

  const resetFlow = (closePanel = false) => {
    if (confirmationTimerRef.current) {
      clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = null;
    }

    lockRef.current.release();
    setUiState("idle");
    setError(null);
    setSuccessData(null);
    setSubmissionGuidance(null);
    setTimelineTimestamps({});

    if (closePanel) {
      setPanelOpen(false);
    }
  };

  const openPanel = () => {
    if (disabled || !payout) {
      return;
    }

    resetFlow(false);
    setPanelOpen(true);
    setIdempotencyKey(createClaimIdempotencyKey(payout.id));
  };

  const submitClaim = async () => {
    if (!payout || disabled || isRefreshing) {
      return;
    }

    if (!lockRef.current.acquire()) {
      return;
    }

    setTimelineTimestamps((current) => ({
      ...current,
      submittedAt: current.submittedAt ?? new Date().toISOString(),
    }));
    setUiState((current) => transitionClaimUiState(current, "SUBMIT"));
    setSubmissionGuidance(null);

    const requestId = createClientGeneratedId("req");
    const correlationId = createClientGeneratedId("corr");

    try {
      const result = await executeClaimSubmission({
        payout,
        idempotencyKey,
        requestId,
        correlationId,
      });

      if (!result.ok) {
        setError(result.error);
        setSubmissionGuidance(result.retry.guidance);
        setTimelineTimestamps((current) => ({ ...current, resolvedAt: new Date().toISOString() }));
        setUiState((current) => transitionClaimUiState(current, "FAILURE"));
        return;
      }

      setSuccessData({
        ...result.data,
        requestId: result.data.requestId ?? requestId,
        correlationId: result.data.correlationId ?? correlationId,
        idempotencyKey: result.data.idempotencyKey ?? idempotencyKey,
      });
      setTimelineTimestamps((current) => ({ ...current, resolvedAt: new Date().toISOString() }));
      setUiState((current) => transitionClaimUiState(current, "SUCCESS"));
      setError(null);
      setSubmissionGuidance("Claim submitted. Refreshing payout and status data.");

      if (result.shouldRefresh) {
        startRefresh(() => {
          router.refresh();
        });
      }
    } finally {
      lockRef.current.release();
    }
  };

  const beginConfirmation = () => {
    if (disabled || !payout || uiState === "submitting" || isRefreshing) {
      return;
    }

    if (confirmationTimerRef.current) {
      clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = null;
    }

    setTimelineTimestamps((current) => ({
      ...current,
      confirmationStartedAt: current.confirmationStartedAt ?? new Date().toISOString(),
    }));
    setUiState((current) => transitionClaimUiState(current, "START_CONFIRM"));
    setError(null);

    const delay = resolveClaimConfirmationDelay(prefersReducedMotion);
    if (delay === 0) {
      void submitClaim();
      return;
    }

    confirmationTimerRef.current = setTimeout(() => {
      void submitClaim();
    }, delay);
  };

  const stateMessage =
    uiState === "confirming"
      ? "Confirming claim"
      : uiState === "submitting"
        ? "Submitting claim"
        : uiState === "success"
          ? isRefreshing
            ? "Claim submitted, refreshing data"
            : "Claim submitted"
          : uiState === "failure"
            ? "Claim failed"
            : "Awaiting confirmation";

  const claimTimelineStages = useMemo(
    () => [
      {
        id: "confirm",
        label: "Confirmation",
        status: uiState === "idle" || uiState === "confirming" ? "current" : "completed",
        ...(timelineTimestamps.confirmationStartedAt ? { timestamp: timelineTimestamps.confirmationStartedAt } : {}),
        current: uiState === "idle" || uiState === "confirming",
        references: [{ label: "Idempotency key", value: idempotencyKey }],
      },
      {
        id: "submit",
        label: "Submission",
        status: uiState === "submitting" ? "current" : uiState === "success" || uiState === "failure" ? "completed" : "pending",
        ...(timelineTimestamps.submittedAt ? { timestamp: timelineTimestamps.submittedAt } : {}),
        current: uiState === "submitting",
      },
      {
        id: "complete",
        label: "Completed",
        status: uiState === "success" ? "current" : "pending",
        ...(uiState === "success" && timelineTimestamps.resolvedAt ? { timestamp: timelineTimestamps.resolvedAt } : {}),
        current: uiState === "success",
        references: [createReference("Intent ID", successData?.intentId)],
      },
      {
        id: "failed",
        label: "Closed with issue",
        status: uiState === "failure" ? "current" : "pending",
        ...(uiState === "failure" && timelineTimestamps.resolvedAt ? { timestamp: timelineTimestamps.resolvedAt } : {}),
        current: uiState === "failure",
        ...(error?.code ? { note: error.code } : {}),
      },
    ],
    [error?.code, idempotencyKey, successData?.intentId, timelineTimestamps.confirmationStartedAt, timelineTimestamps.resolvedAt, timelineTimestamps.submittedAt, uiState],
  );

  return (
    <Card title="Claim">
      <style>{`
        .pay-claim-shell {
          display: grid;
          gap: ${themeTokens.spacing.md};
        }

        .pay-claim-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: ${themeTokens.spacing.sm};
        }

        .pay-claim-cta {
          align-self: flex-start;
        }

        .pay-claim-disabled-note {
          margin: 0;
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.sm};
        }

        .pay-claim-panel {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.md};
          background: ${themeTokens.color.surfaceMuted};
          display: grid;
          gap: ${themeTokens.spacing.md};
        }

        .pay-claim-fingerprint {
          border: 1px solid ${themeTokens.color.borderStrong};
          background: ${themeTokens.color.surface};
          border-radius: 9999px;
          min-height: 3.2rem;
          min-width: 3.2rem;
          padding: ${themeTokens.spacing.md};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: ${themeTokens.typography.size.sm};
          font-weight: ${themeTokens.typography.weight.semibold};
          cursor: pointer;
          color: ${themeTokens.color.text};
          transition: transform ${themeTokens.motion.fast} ease, border-color ${themeTokens.motion.standard} ease, background-color ${themeTokens.motion.standard} ease;
        }

        .pay-claim-fingerprint:hover {
          border-color: ${themeTokens.color.primary};
          background: ${themeTokens.color.surfaceStrong};
        }

        .pay-claim-fingerprint:active {
          transform: translateY(1px);
        }

        .pay-claim-fingerprint:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }

        .pay-claim-fingerprint[aria-busy='true'] {
          cursor: progress;
        }

        .pay-claim-meta {
          margin: 0;
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.sm};
        }
      `}</style>
      <div className="pay-claim-shell">
        <div className="pay-claim-row">
          <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>Mode: {mode.toUpperCase()}</p>
          {payout ? <StatusBadge status={payout.status} /> : null}
        </div>

        {payout ? (
          <p style={{ margin: 0 }}>
            Claim candidate: <strong>{payout.id}</strong> • {formatCurrencyMinor(payout.amountMinor, payout.currency)} • {payout.destinationLabel}
          </p>
        ) : (
          <p style={{ margin: 0 }}>No payout currently qualifies for claim submission.</p>
        )}

        <div className="pay-claim-cta">
          <Button
            type="button"
            onClick={openPanel}
            disabled={disabled || isRefreshing}
            aria-describedby={disabled ? "pay-claim-disabled-reason" : undefined}
          >
            Claim
          </Button>
        </div>

        {disabled && availability.reason ? (
          <p id="pay-claim-disabled-reason" className="pay-claim-disabled-note">
            {availability.reason}
          </p>
        ) : null}

        {panelOpen ? (
          <section className="pay-claim-panel" aria-label="Claim confirmation panel">
            <h4 style={{ margin: 0, fontSize: themeTokens.typography.size.md }}>Fingerprint-style confirmation</h4>
            <p id="pay-claim-legal-copy" style={{ margin: 0, fontSize: themeTokens.typography.size.sm }}>
              Fingerprint-style confirmation is a UI interaction, not biometric verification.
            </p>
            <p id="pay-claim-hint" className="pay-claim-meta">
              {confirmationHint}
            </p>
            <p className="pay-claim-meta">
              Retry only when the operation is marked retryable. Processing can continue after you close this panel.
            </p>

            <div className="pay-claim-row">
              <button
                type="button"
                className="pay-claim-fingerprint"
                onClick={beginConfirmation}
                disabled={uiState === "submitting" || isRefreshing}
                aria-label={getFingerprintAriaLabel(uiState)}
                aria-describedby="pay-claim-legal-copy pay-claim-hint pay-claim-state"
                aria-busy={uiState === "submitting" ? "true" : "false"}
              >
                Tap fingerprint
              </button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => resetFlow(true)}
                disabled={uiState === "submitting" || isRefreshing}
              >
                Cancel
              </Button>
            </div>

            <p id="pay-claim-state" role="status" aria-live="polite" className="pay-claim-meta">
              {stateMessage}
            </p>

            <OperationTimelineCard
              title="Claim submission timeline"
              state="success"
              stages={claimTimelineStages}
              emptyMessage="Claim timeline is not available."
            />

            <ComplianceEvidencePanel
              title="Claim compliance evidence"
              summaryLabel="Details"
              sourceSystem={error?.source ?? "pay"}
              retryable={error ? error.retryable : uiState === "success" ? false : null}
              references={[
                createReference("Intent ID", successData?.intentId),
                createReference("Request ID", successData?.requestId ?? error?.requestId),
                createReference("Correlation ID", successData?.correlationId ?? error?.correlationId),
                createReference("Idempotency key", successData?.idempotencyKey ?? idempotencyKey),
              ]}
              lastUpdated={timelineTimestamps.resolvedAt ?? timelineTimestamps.submittedAt}
            />

            {uiState === "success" ? (
              <div role="status" aria-live="polite" style={{ display: "grid", gap: themeTokens.spacing.xs }}>
                <ConfirmationReceiptCard
                  operationLabel="Claim submitted"
                  status={successData?.state ?? "success"}
                  confirmedAt={timelineTimestamps.resolvedAt}
                  references={[
                    createReference("Intent ID", successData?.intentId),
                    createReference("Request ID", successData?.requestId),
                    createReference("Correlation ID", successData?.correlationId),
                  ]}
                />
                {submissionGuidance ? <p style={{ margin: 0, color: themeTokens.color.textMuted }}>{submissionGuidance}</p> : null}
                <Button type="button" variant="secondary" onClick={() => resetFlow(true)} disabled={isRefreshing}>
                  Close
                </Button>
              </div>
            ) : null}

            {uiState === "failure" && error ? (
              <div role="alert" aria-live="assertive" style={{ display: "grid", gap: themeTokens.spacing.xs }}>
                <ErrorTransparencySummary
                  message={`${error.message} (${formatClaimErrorMeta(error)})`}
                  source={error.source}
                  retryable={error.retryable}
                  retryActionLabel="Retry claim"
                />
                {submissionGuidance ? (
                  <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
                    {submissionGuidance}
                  </p>
                ) : null}
                {error.retryable ? (
                  <Button type="button" variant="secondary" disabled={isRefreshing} onClick={() => void submitClaim()}>
                    Retry claim
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </Card>
  );
}
