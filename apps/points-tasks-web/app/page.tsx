import { Section, themeTokens } from "@ryvra/ui";
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
        <Section title="Points & Tasks Dashboard" description="Access-controlled points and tasks overview surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const accountId = resolveAccountId(searchParams, runtime.defaultAccountId);
  if (!accountId) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Points & Tasks Dashboard" description="Typed overview metrics and recent activity feed.">
          <ErrorState
            title="Account scope is required"
            message="Set account_id in the URL or configure RYVRA_POINTS_TASKS_ACCOUNT_ID before requesting dashboard data."
            source="runtime"
            retryable={false}
            retryLink={{ href: "/", label: "Retry dashboard" }}
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

    const [pointsOverview, tasksOverview] = await Promise.all([
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
    ]);

    runtime.logger.info("Loaded points/tasks dashboard overview", {
      mode: runtime.config.mode,
      accountId,
      currentBalance: pointsOverview.currentBalance,
      tasksCreated: tasksOverview.tasksCreated,
    });

    return (
      <PointsTasksOverviewContent
        title="Points & Tasks Dashboard"
        description="Aggregate points/task KPIs with recent activity and parity-aligned typed data wiring."
        mode={runtime.config.mode}
        baseUrl={runtime.config.apiBaseUrl}
        accountId={accountId}
        pointsOverview={pointsOverview}
        tasksOverview={tasksOverview}
      />
    );
  } catch (error) {
    const uiError = capturePointsTasksPageError(runtime.logger, "/", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Points & Tasks Dashboard" description="Aggregate points/task KPIs with recent activity.">
          <ErrorState
            title="Unable to load dashboard"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/", label: "Retry dashboard" }}
          />
        </Section>
      </section>
    );
  }
}
