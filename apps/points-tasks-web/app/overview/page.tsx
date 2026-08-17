import { Section, themeTokens } from "@ryvra/ui";
import { canAccessWorkspaceCapability, describeWorkspaceCapabilityRequirement } from "@ryvra/auth";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { PointsTasksOverviewContent } from "../components/points-tasks-overview-content";
import {
  parseAccountId,
  parsePointsWindow,
  parseTasksWindow,
  parseUserId,
  parseWorkspaceId,
  type RouteSearchParams,
} from "../lib/search-params";
import { capturePointsTasksPageError, createPointsTasksRuntimeContext } from "../lib/runtime";
import { buildDailyClaimViewModel } from "../lib/daily-claim";

interface PointsTasksOverviewPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function resolveAccountId(searchParams: RouteSearchParams, defaultAccountId: string | undefined): string {
  return parseAccountId(searchParams) ?? defaultAccountId ?? "";
}

export default async function PointsOverviewPage({ searchParams }: PointsTasksOverviewPageProps) {
  const runtime = createPointsTasksRuntimeContext("points-tasks-web:overview");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Ryvra Community Hub Overview" description="Access-controlled community summary route.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const accountId = resolveAccountId(searchParams, runtime.defaultAccountId);
  if (!accountId) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Ryvra Community Hub Overview" description="Typed community metrics and recent activity feed.">
          <ErrorState
            title="Account scope is required"
            message="Set account_id in the URL or configure RYVRA_POINTS_TASKS_ACCOUNT_ID before requesting overview data."
            source="runtime"
            retryable={false}
            retryLink={{ href: "/overview", label: "Retry overview" }}
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

    const [pointsOverview, tasksOverview, dailyClaim] = await Promise.all([
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
      runtime.pointsTasksClient
        .getDailyClaimStatus({
          accountId,
          ...(userId ? { userId } : {}),
          ...(workspaceId ? { workspaceId } : {}),
        })
        .then((claimState) =>
          buildDailyClaimViewModel({
            claimState,
            nowIso: new Date().toISOString(),
            claimStatusEndpointAvailable: true,
            expectedAccountId: accountId,
          }),
        )
        .catch((error) => {
          const uiError = capturePointsTasksPageError(runtime.logger, "/overview/daily-claim", error);
          return buildDailyClaimViewModel({
            nowIso: new Date().toISOString(),
            claimStatusEndpointAvailable: false,
            expectedAccountId: accountId,
            endpointErrorMessage: uiError.message,
            endpointRetryable: uiError.retryable,
            retryHref: "/overview",
          });
        }),
    ]);
    const claimHrefParams = new URLSearchParams({
      account_id: accountId,
      ...(userId ? { user_id: userId } : {}),
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
    });
    const claimHrefQuery = claimHrefParams.toString();

    runtime.logger.info("Loaded points/tasks overview route", {
      mode: runtime.config.mode,
      accountId,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      currentBalance: pointsOverview.currentBalance,
      tasksCreated: tasksOverview.tasksCreated,
    });

    return (
      <PointsTasksOverviewContent
        title="Ryvra Community Hub Overview"
        description="Summary-focused community view with points/task aggregates and high-utility actions."
        route="/overview"
        mode={runtime.config.mode}
        baseUrl={runtime.config.apiBaseUrl}
        accountId={accountId}
        {...(workspaceId ? { workspaceId } : {})}
        {...(userId ? { userId } : {})}
        roleLabel={runtime.workspaceRole.label}
        pointsOverview={pointsOverview}
        tasksOverview={tasksOverview}
        claimCta={{
          label: dailyClaim.cta.label,
          href: claimHrefQuery ? `/points?${claimHrefQuery}` : "/points",
          enabled: canOperate && dailyClaim.cta.enabled,
          reason: canOperate ? dailyClaim.cta.reason : operateDeniedReason,
        }}
      />
    );
  } catch (error) {
    const uiError = capturePointsTasksPageError(runtime.logger, "/overview", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Ryvra Community Hub Overview" description="Summary-focused community view.">
          <ErrorState
            title="Unable to load overview"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/overview", label: "Retry overview" }}
          />
        </Section>
      </section>
    );
  }
}
