"use client";

import { useEffect, useMemo } from "react";
import type { StorageLike } from "./i18n-runtime";
import { createGrowthInstrumentation, type FunnelActionType, type GrowthScope } from "./growth-instrumentation";

interface ActivationFunnelTrackerProps {
  appId: string;
  route: string;
  scope: GrowthScope;
  firstActionType?: FunnelActionType;
  markCompletionOnMount?: boolean;
  storage?: StorageLike | null;
}

export function ActivationFunnelTracker({
  appId,
  route,
  scope,
  firstActionType,
  markCompletionOnMount = false,
  storage,
}: ActivationFunnelTrackerProps) {
  const instrumentation = useMemo(
    () =>
      createGrowthInstrumentation({
        appId,
        route,
        scope,
        ...(typeof storage === "undefined" ? {} : { storage }),
      }),
    [appId, route, scope.accountId, scope.userId, scope.workspaceId, storage],
  );

  useEffect(() => {
    instrumentation.emitFunnelStage("landing_first_session", "stage_entered", {
      metadata: { trigger: "route_mount" },
    });
    instrumentation.emitFunnelStage("landing_first_session", "stage_completed", {
      metadata: { trigger: "route_mount" },
    });

    instrumentation.emitFunnelStage("scope_selection", "stage_entered", {
      metadata: { trigger: "scope_resolved" },
    });
    instrumentation.emitFunnelStage("scope_selection", "stage_completed", {
      metadata: { trigger: "scope_resolved" },
    });

    if (firstActionType) {
      instrumentation.emitFunnelStage("first_key_action_initiation", "stage_entered", {
        actionType: firstActionType,
        metadata: { trigger: "route_mount" },
      });
      instrumentation.emitFunnelStage("first_key_action_initiation", "stage_completed", {
        actionType: firstActionType,
        metadata: { trigger: "route_mount" },
      });

      if (markCompletionOnMount) {
        instrumentation.emitFunnelStage("completion_success", "stage_entered", {
          actionType: firstActionType,
          metadata: { trigger: "route_mount" },
        });
        instrumentation.emitFunnelStage("completion_success", "stage_completed", {
          actionType: firstActionType,
          metadata: { trigger: "route_mount" },
        });
      }
    }
  }, [firstActionType, instrumentation, markCompletionOnMount]);

  return null;
}
