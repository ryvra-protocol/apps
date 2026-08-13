"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { type GrowthScope, createGrowthInstrumentation } from "./growth-instrumentation";
import {
  buildDefaultChecklistSteps,
  buildGettingStartedChecklistStorageKey,
  completeChecklistStep,
  createGettingStartedChecklistState,
  readChecklistState,
  resetChecklistState,
  resolveChecklistProgress,
  setChecklistDismissed,
  toggleChecklistMinimized,
  type GettingStartedStepId,
  writeChecklistState,
} from "./getting-started-checklist";
import type { StorageLike } from "./i18n-runtime";
import { themeTokens } from "./theme";

interface GettingStartedChecklistProps {
  appId: string;
  route: string;
  scope: GrowthScope;
  scopeHref: string;
  unifiedBalanceHref: string;
  firstActionHref: string;
  firstActionLabel: string;
  notificationsHref: string;
  storage?: StorageLike | null;
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function GettingStartedChecklist({
  appId,
  route,
  scope,
  scopeHref,
  unifiedBalanceHref,
  firstActionHref,
  firstActionLabel,
  notificationsHref,
  storage,
}: GettingStartedChecklistProps) {
  const resolvedStorage = resolveStorage(storage);
  const initialCompletedStepIds = useMemo<GettingStartedStepId[]>(() => {
    if (scope.accountId && scope.workspaceId) {
      return ["connect_select_scope"];
    }

    return [];
  }, [scope.accountId, scope.workspaceId]);

  const instrumentation = useMemo(
    () =>
      createGrowthInstrumentation({
        appId,
        route,
        scope,
        ...(typeof resolvedStorage === "undefined" ? {} : { storage: resolvedStorage }),
      }),
    [appId, resolvedStorage, route, scope.accountId, scope.userId, scope.workspaceId],
  );

  const steps = useMemo(
    () =>
      buildDefaultChecklistSteps({
        scopeHref,
        unifiedBalanceHref,
        firstActionHref,
        firstActionLabel,
        notificationsHref,
      }),
    [firstActionHref, firstActionLabel, notificationsHref, scopeHref, unifiedBalanceHref],
  );

  const storageKey = useMemo(
    () => buildGettingStartedChecklistStorageKey(appId, instrumentation.scopeHash),
    [appId, instrumentation.scopeHash],
  );

  const [state, setState] = useState(() => createGettingStartedChecklistState(initialCompletedStepIds));

  useEffect(() => {
    const persisted = readChecklistState(resolvedStorage, storageKey);
    setState(persisted ?? createGettingStartedChecklistState(initialCompletedStepIds));
  }, [initialCompletedStepIds, resolvedStorage, storageKey]);

  useEffect(() => {
    writeChecklistState(resolvedStorage, storageKey, state);
  }, [resolvedStorage, state, storageKey]);

  const progress = resolveChecklistProgress(state);

  if (state.dismissed) {
    return (
      <Card title="Getting started">
        <p style={{ margin: 0, color: themeTokens.color.textMuted }}>
          Checklist dismissed. {progress.completed} of {progress.total} steps remain saved for this scope.
        </p>
        <div style={{ display: "flex", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
          <Button
            type="button"
            variant="secondary"
            aria-label="Resume getting started checklist"
            onClick={() => {
              setState((current) => setChecklistDismissed(current, false));
            }}
          >
            Resume checklist
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setState((current) => resetChecklistState(current, initialCompletedStepIds));
            }}
          >
            Reset progress
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Getting started">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
          {progress.completed} of {progress.total} steps completed • {progress.remaining} remaining
        </p>
        <div style={{ display: "flex", gap: themeTokens.spacing.xs, flexWrap: "wrap" }}>
          <Button
            type="button"
            variant="secondary"
            aria-expanded={!state.minimized}
            aria-controls={`${storageKey}-steps`}
            onClick={() => {
              setState((current) => toggleChecklistMinimized(current));
            }}
          >
            {state.minimized ? "Expand" : "Minimize"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label="Dismiss getting started checklist"
            onClick={() => {
              setState((current) => setChecklistDismissed(current, true));
            }}
          >
            Dismiss
          </Button>
        </div>
      </div>

      {!state.minimized ? (
        <ol
          id={`${storageKey}-steps`}
          style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: themeTokens.spacing.sm }}
          aria-label="Getting started activation checklist"
        >
          {steps.map((step) => {
            const completed = state.completedStepIds.includes(step.id);

            return (
              <li key={step.id} style={{ display: "grid", gap: themeTokens.spacing.xs }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
                  <strong>{step.title}</strong>
                  <span
                    style={{
                      color: completed ? themeTokens.color.success : themeTokens.color.textMuted,
                      fontSize: themeTokens.typography.size.sm,
                    }}
                  >
                    {completed ? "Completed" : "Pending"}
                  </span>
                </div>
                <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{step.description}</p>
                <div style={{ display: "flex", gap: themeTokens.spacing.xs, flexWrap: "wrap" }}>
                  <a
                    href={step.href}
                    style={{
                      alignSelf: "center",
                      color: themeTokens.color.primary,
                      fontSize: themeTokens.typography.size.sm,
                      fontWeight: themeTokens.typography.weight.medium,
                      textDecoration: "none",
                    }}
                    onClick={() => {
                      instrumentation.emitEvent("cta_clicked", {
                        stepId: step.id,
                        metadata: {
                          source: "getting_started_checklist",
                        },
                      });
                    }}
                  >
                    {step.ctaLabel}
                  </a>
                  <Button
                    type="button"
                    variant={completed ? "secondary" : "primary"}
                    disabled={completed}
                    aria-label={completed ? `${step.title} completed` : `Mark ${step.title} complete`}
                    onClick={() => {
                      if (completed) {
                        return;
                      }

                      setState((current) => completeChecklistStep(current, step.id));
                      instrumentation.emitEvent("onboarding_step_completed", {
                        stepId: step.id,
                      });
                    }}
                  >
                    {completed ? "Completed" : "Mark complete"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setState((current) => resetChecklistState(current, initialCompletedStepIds));
        }}
      >
        Reset checklist
      </Button>
    </Card>
  );
}
