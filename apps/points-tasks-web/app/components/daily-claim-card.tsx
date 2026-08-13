"use client";

import {
  Button,
  Card,
  ClaimExperimentStatus,
  buildClaimVariantPresentation,
  createClaimConversionEventTracker,
  createClaimExperimentInstrumentation,
  resolveClaimActionEnabled,
  resolveClaimExperimentAssignment,
  resolveClaimExperimentOverride,
  useNotificationCenter,
  themeTokens,
  translateRuntime,
} from "@ryvra/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createClaimExecutionAttempt,
  createClaimSubmissionLock,
  type ClaimExecutionAttempt,
  type ClaimExecutionErrorEnvelope,
  type DailyClaimScope,
} from "../lib/claim-execution";
import { executeDailyClaimAttempt } from "../lib/claim-execution-client";
import type { DailyClaimViewModel } from "../lib/daily-claim";
import {
  buildDailyClaimLifecycleNotification,
  resolveDailyClaimLifecycleStageFromIntentState,
} from "../lib/notification-comms";
import { StatusBadge } from "./status-badge";

interface DailyClaimCardProps {
  surface: "points" | "tasks";
  model: DailyClaimViewModel;
  scope: DailyClaimScope;
  canOperate: boolean;
  operateDeniedReason?: string;
}

export function DailyClaimCard({ surface, model, scope, canOperate, operateDeniedReason }: DailyClaimCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addNotification } = useNotificationCenter();
  const lockRef = useRef(createClaimSubmissionLock());
  const [attempt, setAttempt] = useState<ClaimExecutionAttempt | null>(null);
  const [writeError, setWriteError] = useState<ClaimExecutionErrorEnvelope | null>(null);
  const [writeGuidance, setWriteGuidance] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const serializedSearchParams = searchParams.toString();

  const instrumentation = useMemo(
    () =>
      createClaimExperimentInstrumentation({
        appId: "points-tasks-web",
        route: surface === "tasks" ? "/tasks" : "/points",
        scope,
      }),
    [scope.accountId, scope.userId, scope.workspaceId, surface],
  );

  const assignment = useMemo(
    () => {
      const overrideVariant = resolveClaimExperimentOverride(serializedSearchParams);
      return resolveClaimExperimentAssignment({
        scopeHash: instrumentation.scopeHash,
        ...(overrideVariant ? { overrideVariant } : {}),
      });
    },
    [instrumentation.scopeHash, serializedSearchParams],
  );

  const experimentPresentation = useMemo(
    () =>
      buildClaimVariantPresentation(assignment.variant, {
        defaultCtaLabel: model.cta.label,
        trustBoostCtaLabel: "Claim now with guided checks",
      }),
    [assignment.variant, model.cta.label],
  );

  const conversionTracker = useMemo(
    () =>
      createClaimConversionEventTracker({
        instrumentation,
        assignment,
        actionType: "claim",
      }),
    [assignment, instrumentation],
  );

  useEffect(() => {
    conversionTracker.trackExposure();
  }, [conversionTracker]);

  useEffect(() => {
    return () => {
      conversionTracker.trackAbandoned();
    };
  }, [conversionTracker]);

  const submitClaim = async (mode: "new" | "retry") => {
    const claimActionEnabled = resolveClaimActionEnabled(canOperate, model.cta.enabled);
    if (!claimActionEnabled || isSubmitting || isRefreshing) {
      return;
    }

    if (!lockRef.current.acquire()) {
      return;
    }

    const nextAttempt = mode === "retry" && attempt ? attempt : createClaimExecutionAttempt(scope);
    conversionTracker.trackCtaClick();

    setIsSubmitting(true);
    setWriteError(null);
    setWriteGuidance(null);
    addNotification(
      buildDailyClaimLifecycleNotification({
        stage: "submitted",
        accountId: scope.accountId,
        requestId: nextAttempt.requestId,
        correlationId: nextAttempt.correlationId,
      }),
    );
    addNotification(
      buildDailyClaimLifecycleNotification({
        stage: "processing",
        accountId: scope.accountId,
        requestId: nextAttempt.requestId,
        correlationId: nextAttempt.correlationId,
      }),
    );

    try {
      const result = await executeDailyClaimAttempt({
        scope,
        attempt: nextAttempt,
      });

      setAttempt(result.attempt);

      if (!result.ok) {
        setDidSucceed(false);
        setWriteError(result.error);
        setWriteGuidance(result.retry.guidance);
        conversionTracker.trackFailure();
        addNotification(
          buildDailyClaimLifecycleNotification({
            stage: "failed",
            accountId: scope.accountId,
            requestId: result.error.requestId,
            correlationId: result.error.correlationId,
            retryable: result.error.retryable,
          }),
        );
        return;
      }

      setDidSucceed(true);
      setWriteError(null);
      setWriteGuidance("Claim submitted. Refreshing claim status and points balances.");
      conversionTracker.trackSuccess();
      addNotification(
        buildDailyClaimLifecycleNotification({
          stage: resolveDailyClaimLifecycleStageFromIntentState(result.state),
          accountId: scope.accountId,
          ...(result.attempt.intentId ? { intentId: result.attempt.intentId } : {}),
          requestId: result.attempt.requestId,
          correlationId: result.attempt.correlationId,
        }),
      );
      addNotification(
        buildDailyClaimLifecycleNotification({
          stage: "completed",
          accountId: scope.accountId,
          ...(result.attempt.intentId ? { intentId: result.attempt.intentId } : {}),
          requestId: result.attempt.requestId,
          correlationId: result.attempt.correlationId,
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
  const localizedStatusLabel = translateRuntime(`status.${status.toLowerCase()}`, statusLabel);
  const ctaEnabled = resolveClaimActionEnabled(canOperate, model.cta.enabled) && !didSucceed;
  const ctaDisabledReason = !canOperate ? operateDeniedReason ?? "Operator workspace access is required." : model.cta.reason;
  const ctaLabel =
    isSubmitting
      ? "Submitting claim..."
      : isRefreshing
        ? "Refreshing claim..."
        : didSucceed
          ? "Claim submitted"
          : experimentPresentation.ctaLabel;

  return (
    <Card title={translateRuntime("claim.dailyTitle", "Daily claim")}>
      <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
          <span style={{ color: themeTokens.color.textMuted }}>{translateRuntime("claim.status", "Status:")}</span>
          <StatusBadge status={status} />
          <span>{localizedStatusLabel}</span>
        </div>

        {model.nextEligibleLabel ? (
          <p style={{ margin: 0, color: themeTokens.color.textMuted }} aria-live="polite">
            {translateRuntime("claim.nextEligible", "Next eligible:")} {model.nextEligibleLabel}
          </p>
        ) : null}

        <ClaimExperimentStatus
          experimentId={assignment.experimentId}
          variant={assignment.variant}
          overrideActive={assignment.source === "qa_override"}
        />
        <p
          style={{
            margin: 0,
            color: experimentPresentation.emphasizeTrust ? themeTokens.color.text : themeTokens.color.textMuted,
            fontSize: themeTokens.typography.size.sm,
          }}
        >
          {experimentPresentation.trustHeadline}
        </p>
        <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
          {experimentPresentation.trustDetail}
        </p>

        <div style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <Button
            type="button"
            disabled={!ctaEnabled || isSubmitting || isRefreshing}
            onClick={() => {
              void submitClaim("new");
            }}
            aria-label={
              ctaEnabled
                ? experimentPresentation.ctaLabel
                : `Claim disabled: ${ctaDisabledReason ?? translateRuntime("claim.unavailableReason", "Unavailable")}`
            }
          >
            {ctaLabel}
          </Button>
          {!ctaEnabled && ctaDisabledReason ? (
            <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{ctaDisabledReason}</p>
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
                {translateRuntime("claim.retryClaim", "Retry claim")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting || isRefreshing || !model.cta.enabled || !canOperate}
                onClick={() => {
                  void submitClaim("new");
                }}
              >
                {translateRuntime("claim.startNewAttempt", "Start new attempt")}
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
            {translateRuntime("claim.retryStatus", "Retry claim status")}
          </a>
        ) : null}
      </div>
    </Card>
  );
}
