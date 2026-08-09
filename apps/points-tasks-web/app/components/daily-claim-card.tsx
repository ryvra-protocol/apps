"use client";

import { Button, Card, mapClaimLifecycleNotification, themeTokens, useNotificationCenter } from "@ryvra/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  createClaimExecutionAttempt,
  createClaimSubmissionLock,
  type ClaimExecutionAttempt,
  type ClaimExecutionErrorEnvelope,
  type DailyClaimScope,
} from "../lib/claim-execution";
import { executeDailyClaimAttempt } from "../lib/claim-execution-client";
import type { DailyClaimViewModel } from "../lib/daily-claim";
import { StatusBadge } from "./status-badge";

interface DailyClaimCardProps {
  model: DailyClaimViewModel;
  scope: DailyClaimScope;
}

export function DailyClaimCard({ model, scope }: DailyClaimCardProps) {
  const router = useRouter();
  const { addNotification } = useNotificationCenter();
  const lockRef = useRef(createClaimSubmissionLock());
  const [attempt, setAttempt] = useState<ClaimExecutionAttempt | null>(null);
  const [writeError, setWriteError] = useState<ClaimExecutionErrorEnvelope | null>(null);
  const [writeGuidance, setWriteGuidance] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  const submitClaim = async (mode: "new" | "retry") => {
    if (!model.cta.enabled || isSubmitting || isRefreshing) {
      return;
    }

    if (!lockRef.current.acquire()) {
      return;
    }

    const nextAttempt = mode === "retry" && attempt ? attempt : createClaimExecutionAttempt(scope);

    setIsSubmitting(true);
    setWriteError(null);
    setWriteGuidance(null);
    const startedAt = new Date().toISOString();
    addNotification(
      mapClaimLifecycleNotification({
        stage: "submitted",
        eventKey: `daily-claim:${nextAttempt.idempotencyKey}:submitted`,
        timestamp: startedAt,
        routeHref: `/points?account_id=${encodeURIComponent(scope.accountId)}&ref=notification&entity=claim`,
        references: [
          { label: "Account", value: scope.accountId },
          { label: "Idempotency key", value: nextAttempt.idempotencyKey },
        ],
      }),
    );
    addNotification(
      mapClaimLifecycleNotification({
        stage: "processing",
        eventKey: `daily-claim:${nextAttempt.idempotencyKey}:processing`,
        timestamp: startedAt,
        routeHref: `/points?account_id=${encodeURIComponent(scope.accountId)}&ref=notification&entity=claim`,
        references: [{ label: "Account", value: scope.accountId }],
      }),
    );

    try {
      const result = await executeDailyClaimAttempt({
        scope,
        attempt: nextAttempt,
      });

      setAttempt(result.attempt);

      if (!result.ok) {
        addNotification(
          mapClaimLifecycleNotification({
            stage: "failed",
            retryable: result.error.retryable,
            eventKey: `daily-claim:${nextAttempt.idempotencyKey}:failed:${result.error.code}`,
            timestamp: new Date().toISOString(),
            routeHref: `/points?account_id=${encodeURIComponent(scope.accountId)}&ref=notification&entity=claim`,
            references: [
              { label: "Request ID", value: result.error.requestId },
              { label: "Correlation ID", value: result.error.correlationId },
            ],
          }),
        );
        setDidSucceed(false);
        setWriteError(result.error);
        setWriteGuidance(result.retry.guidance);
        return;
      }

      setDidSucceed(true);
      setWriteError(null);
      setWriteGuidance("Claim submitted. Refreshing claim status and points balances.");
      addNotification(
        mapClaimLifecycleNotification({
          stage: "completed",
          eventKey: `daily-claim:${result.attempt.idempotencyKey}:completed:${result.attempt.intentId ?? "intent-unavailable"}`,
          timestamp: new Date().toISOString(),
          routeHref: `/points?account_id=${encodeURIComponent(scope.accountId)}&ref=notification&entity=claim`,
          references: [
            { label: "Intent ID", value: result.attempt.intentId },
            { label: "Request ID", value: result.attempt.requestId },
            { label: "Correlation ID", value: result.attempt.correlationId },
          ],
        }),
      );
      startRefresh(() => {
        router.refresh();
      });
    } finally {
      setIsSubmitting(false);
      lockRef.current.release();
    }
  };

  const status = didSucceed ? "already_claimed" : model.status;
  const statusLabel = didSucceed ? "Already claimed" : model.statusLabel;
  const ctaEnabled = model.cta.enabled && !didSucceed;
  const ctaLabel = isSubmitting ? "Submitting claim..." : isRefreshing ? "Refreshing claim..." : didSucceed ? "Claim submitted" : model.cta.label;

  return (
    <Card title="Daily claim">
      <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
          <span style={{ color: themeTokens.color.textMuted }}>Status:</span>
          <StatusBadge status={status} />
          <span>{statusLabel}</span>
        </div>

        {model.nextEligibleLabel ? (
          <p style={{ margin: 0, color: themeTokens.color.textMuted }} aria-live="polite">
            Next eligible: {model.nextEligibleLabel}
          </p>
        ) : null}

        <div style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <Button
            type="button"
            disabled={!ctaEnabled || isSubmitting || isRefreshing}
            onClick={() => {
              void submitClaim("new");
            }}
            aria-label={ctaEnabled ? "Claim daily points" : `Claim disabled: ${model.cta.reason ?? "Unavailable"}`}
          >
            {ctaLabel}
          </Button>
          {!ctaEnabled && model.cta.reason ? (
            <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{model.cta.reason}</p>
          ) : null}
        </div>

        {model.errorMessage ? (
          <p role="alert" style={{ margin: 0, color: themeTokens.color.danger }}>
            {model.errorMessage}
          </p>
        ) : null}

        {writeError ? (
          <div role="alert" style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <p style={{ margin: 0, color: themeTokens.color.danger }}>{writeError.message}</p>
            {writeGuidance ? (
              <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{writeGuidance}</p>
            ) : null}
            <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
              Request: {writeError.requestId} • Correlation: {writeError.correlationId}
            </p>
            {writeError.retryable ? (
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting || isRefreshing}
                onClick={() => {
                  void submitClaim("retry");
                }}
              >
                Retry claim
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting || isRefreshing || !model.cta.enabled}
                onClick={() => {
                  void submitClaim("new");
                }}
              >
                Start new attempt
              </Button>
            )}
          </div>
        ) : null}

        {didSucceed && writeGuidance ? (
          <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.success }}>
            {writeGuidance}
          </p>
        ) : null}

        {model.retryable && model.retryHref ? (
          <a
            href={model.retryHref}
            style={{
              display: "inline-flex",
              width: "fit-content",
              borderRadius: themeTokens.radius.md,
              border: `1px solid ${themeTokens.color.primary}`,
              padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.lg}`,
              color: themeTokens.color.primary,
              textDecoration: "none",
              fontWeight: themeTokens.typography.weight.medium,
            }}
          >
            Retry claim status
          </a>
        ) : null}
      </div>
    </Card>
  );
}
