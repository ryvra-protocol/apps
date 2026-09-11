import { Section, themeTokens } from "@ryvra/ui";
import { canAccessWorkspaceCapability, describeWorkspaceCapabilityRequirement } from "@ryvra/auth";
import { ErrorState, UnauthorizedState } from "./components/page-states";
import { PointsTasksOverviewContent } from "./components/points-tasks-overview-content";
import {
  parseAccountId,
  parsePointsWindow,
  parseTasksWindow,
  parseUserId,
  parseWorkspaceId,
  type RouteSearchParams,
} from "./lib/search-params";
import { capturePointsTasksPageError, createPointsTasksRuntimeContext } from "./lib/runtime";
import { buildDailyClaimViewModel } from "./lib/daily-claim";
import { getCommunityTopMetrics, getFingerprintClaimStatus } from "./lib/fingerprint-claim";

interface PointsTasksDashboardPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function resolveAccountId(searchParams: RouteSearchParams, defaultAccountId: string | undefined): string {
  return parseAccountId(searchParams) ?? defaultAccountId ?? "";
}

export default async function PointsTasksDashboardPage({ searchParams }: PointsTasksDashboardPageProps) {
  const runtime = createPointsTasksRuntimeContext("points-tasks-web:dashboard");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Ryvra Community Hub dashboard" description="Your points and tasks summary with access-aware data.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const accountId = resolveAccountId(searchParams, runtime.defaultAccountId);
  if (!accountId) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Ryvra Community Hub dashboard" description="Track progress, points, and task momentum in one place.">
          <ErrorState
            title="Choose an account to continue"
            message="Add account_id to the URL or set RYVRA_POINTS_TASKS_ACCOUNT_ID before loading dashboard data."
            source="runtime"
            retryable={false}
            retryLink={{ href: "/", label: "Try again" }}
          />
        </Section>
      </section>
    );
  }

  try {
    const userId = parseUserId(searchParams);
    const workspaceId = parseWorkspaceId(searchParams);
    const pointsWindow = parsePointsWindow(searchParams);
    const tasksWindow = parseTasksWindow(searchParams);
    const canOperate = canAccessWorkspaceCapability(runtime.workspaceRole, "operate");
    const operateDeniedReason = describeWorkspaceCapabilityRequirement("operate", runtime.workspaceRole, "Claim actions");

    const [pointsOverview, tasksOverview, dailyClaim, communityMetrics] = await Promise.all([
      runtime.pointsTasksClient.getPointsOverview({
        accountId,
        ...(userId ? { userId } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        ...(pointsWindow ? { window: pointsWindow } : {}),
      }),
      runtime.pointsTasksClient.getTasksOverview({
        accountId,
        ...(userId ? { userId } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        ...(tasksWindow ? { window: tasksWindow } : {}),
      }),
      Promise.resolve(
        getFingerprintClaimStatus({
          accountId,
          ...(userId ? { userId } : {}),
          ...(workspaceId ? { workspaceId } : {}),
        }),
      ).then((claimState) =>
        buildDailyClaimViewModel({
          claimState,
          nowIso: new Date().toISOString(),
          claimStatusEndpointAvailable: true,
          expectedAccountId: accountId,
        }),
      ),
      Promise.resolve(
        getCommunityTopMetrics({
          accountId,
          ...(userId ? { userId } : {}),
          ...(workspaceId ? { workspaceId } : {}),
        }),
      ),
    ]);
    const claimHrefParams = new URLSearchParams({
      account_id: accountId,
      ...(userId ? { user_id: userId } : {}),
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
    });
    const claimHrefQuery = claimHrefParams.toString();

    runtime.logger.info("Loaded points/tasks dashboard overview", {
      mode: runtime.config.mode,
      accountId,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      currentBalance: pointsOverview.currentBalance,
      tasksCreated: tasksOverview.tasksCreated,
    });

    return (
      <PointsTasksOverviewContent
        title="Ryvra Community Hub dashboard"
        description="Track points, task completion, and daily momentum with clear next actions."
        route="/"
        mode={runtime.config.mode}
        baseUrl={runtime.config.apiBaseUrl}
        accountId={accountId}
        {...(workspaceId ? { workspaceId } : {})}
        {...(userId ? { userId } : {})}
        roleLabel={runtime.workspaceRole.label}
        pointsOverview={pointsOverview}
        tasksOverview={tasksOverview}
        communityMetrics={communityMetrics}
        claimCta={{
          label: dailyClaim.cta.label,
          href: claimHrefQuery ? `/points?${claimHrefQuery}` : "/points",
          enabled: canOperate && dailyClaim.cta.enabled,
          ...(canOperate
            ? dailyClaim.cta.reason
              ? { reason: dailyClaim.cta.reason }
              : {}
            : { reason: operateDeniedReason }),
        }}
      />
    );
  } catch (error) {
    const uiError = capturePointsTasksPageError(runtime.logger, "/", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Ryvra Community Hub dashboard" description="Track progress, points, and task momentum in one place.">
          <ErrorState
            title="We couldn't load your Community Hub dashboard"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/", label: "Try again" }}
          />
        </Section>
      </section>
    );
  }
}
