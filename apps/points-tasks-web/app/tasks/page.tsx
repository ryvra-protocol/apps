import type { TaskFilters, TasksAccountScopedListRequest, TasksAccountScopedRequest } from "@ryvra/domain-tasks";
import type { PointsSummaryRequest } from "@ryvra/domain-points";
import { canAccessWorkspaceCapability, describeWorkspaceCapabilityRequirement } from "@ryvra/auth";
import { evaluateRoutePermission, resolveRoutePermissionMeta } from "@ryvra/config";
import {
  Card,
  ComplianceEvidencePanel,
  InlineStatusIndicators,
  type InsightWindowOption,
  OperationTimelineCard,
  PolicyLinksCard,
  Section,
  TrustDisclosureCard,
  themeTokens,
} from "@ryvra/ui";
import nextDynamic from "next/dynamic";
import { EmptyState, ErrorState, PermissionDeniedState, UnauthorizedState } from "../components/page-states";
import { PointsTasksPortfolioInsightsCard } from "../components/points-tasks-portfolio-insights-card";
import { PointsTasksTopPrioritySection } from "../components/points-tasks-top-priority-section";
import { TasksTableClient } from "../components/tasks-table-client";
import { ModeBadge } from "../components/mode-badge";
import { formatNumber } from "../lib/format";
import { buildDailyClaimViewModel } from "../lib/daily-claim";
import {
  buildPointsTasksPortfolioInsights,
  buildPointsTasksWindowLinks,
  resolvePointsTasksInsightWindow,
} from "../lib/portfolio-insights";
import { buildPointsSummaryRequest, resolvePointsBalance } from "../lib/points-balance";
import { buildTaskEvidenceReferences, buildTaskTimelineStages, resolveTaskRetryable } from "../lib/trust-compliance";
import {
  parseAccountId,
  parseCursor,
  parseLimit,
  parsePage,
  parseTaskDateRange,
  parseTaskProgressState,
  parseTaskSort,
  parseTaskStatus,
  parseTaskType,
  parseUserId,
  parseWorkspaceId,
  type RouteSearchParams,
} from "../lib/search-params";
import { capturePointsTasksPageError, createPointsTasksRuntimeContext } from "../lib/runtime";

interface TasksPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

const DailyClaimCard = nextDynamic(
  () => import("../components/daily-claim-card").then((module) => module.DailyClaimCard),
  {
    loading: () => (
      <Card title="Daily claim">
        <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs, color: themeTokens.color.textMuted }}>
          Loading daily claim module…
        </p>
        <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
          <div style={{ height: "1rem", width: "45%", borderRadius: themeTokens.radius.sm, background: themeTokens.color.surfaceMuted }} />
          <div style={{ height: "1rem", width: "60%", borderRadius: themeTokens.radius.sm, background: themeTokens.color.surfaceMuted }} />
        </div>
      </Card>
    ),
  },
);

function buildTaskRequest(
  searchParams: RouteSearchParams,
  defaultAccountId: string | undefined,
): TasksAccountScopedListRequest<TaskFilters> {
  const taskStatus = parseTaskStatus(searchParams);
  const taskType = parseTaskType(searchParams);
  const progressState = parseTaskProgressState(searchParams);
  const dateRange = parseTaskDateRange(searchParams);
  const cursor = parseCursor(searchParams);
  const deprecatedPage = parsePage(searchParams);
  const accountId = parseAccountId(searchParams) ?? defaultAccountId ?? "";
  const userId = parseUserId(searchParams);
  const workspaceId = parseWorkspaceId(searchParams);

  const filters: TaskFilters = {
    ...(taskStatus ? { taskStatus } : {}),
    ...(taskType ? { taskType } : {}),
    ...(progressState ? { progressState } : {}),
    ...(dateRange ? { dateRange } : {}),
  };

  return {
    accountId,
    ...(userId ? { userId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    pagination: {
      limit: parseLimit(searchParams, 50),
      ...(cursor ? { cursor } : {}),
      ...(typeof deprecatedPage === "number" ? { page: deprecatedPage } : {}),
    },
    sort: {
      value: parseTaskSort(searchParams),
    },
  };
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const runtime = createPointsTasksRuntimeContext("points-tasks-web:tasks");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Tasks" description="Canonical tasks view with scope and cursor pagination.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const routePermission = evaluateRoutePermission(resolveRoutePermissionMeta("points", "/tasks"), runtime.sessionRoleClaims);
  if (!routePermission.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Tasks" description="Canonical tasks view with scope and cursor pagination.">
          <PermissionDeniedState message={routePermission.reason ?? "You do not have permission to view tasks."} />
        </Section>
      </section>
    );
  }

  try {
    const request = buildTaskRequest(searchParams, runtime.defaultAccountId);

    if (!request.accountId) {
      return (
        <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
          <Section title="Tasks" description="Canonical tasks view with scope and cursor pagination.">
            <ErrorState
              title="Account scope is required"
              message="Set account_id in the URL or configure RYVRA_POINTS_TASKS_ACCOUNT_ID before requesting task data."
              source="runtime"
              retryable={false}
              retryLink={{ href: "/tasks", label: "Retry tasks" }}
            />
          </Section>
        </section>
      );
    }

    const summaryRequest: TasksAccountScopedRequest = {
      accountId: request.accountId,
      ...(request.userId ? { userId: request.userId } : {}),
      ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
    };
    const canOperate = canAccessWorkspaceCapability(runtime.workspaceRole, "operate");
    const operateDeniedReason = describeWorkspaceCapabilityRequirement("operate", runtime.workspaceRole, "Claim submission");
    const panelDeniedReason = describeWorkspaceCapabilityRequirement("operate", runtime.workspaceRole, "Operational evidence panels");
    const selectedInsightWindow = resolvePointsTasksInsightWindow(searchParams);
    const pointsSummaryRequest: PointsSummaryRequest = buildPointsSummaryRequest({
      accountId: request.accountId,
      ...(request.userId ? { userId: request.userId } : {}),
      ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
    });

    const [taskList, summary, pointsSummary, dailyClaim, pointsOverviewResult, tasksOverviewResult] = await Promise.all([
      runtime.pointsTasksClient.listTasks(request),
      runtime.pointsTasksClient.getTaskSummary(summaryRequest),
      runtime.pointsTasksClient.getPointSummary(pointsSummaryRequest),
      runtime.pointsTasksClient
        .getDailyClaimStatus(pointsSummaryRequest)
        .then((claimState) =>
          buildDailyClaimViewModel({
            claimState,
            nowIso: new Date().toISOString(),
            claimStatusEndpointAvailable: true,
            expectedAccountId: request.accountId,
          }),
        )
        .catch((error) => {
          const uiError = capturePointsTasksPageError(runtime.logger, "/tasks/daily-claim", error);
          return buildDailyClaimViewModel({
            nowIso: new Date().toISOString(),
            claimStatusEndpointAvailable: false,
            expectedAccountId: request.accountId,
            endpointErrorMessage: uiError.message,
            endpointRetryable: uiError.retryable,
            retryHref: `/tasks?account_id=${encodeURIComponent(request.accountId)}`,
          });
        }),
      runtime.pointsTasksClient
        .getPointsOverview({
          accountId: request.accountId,
          ...(request.userId ? { userId: request.userId } : {}),
          ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
          window: selectedInsightWindow,
        })
        .then((value) => ({
          ok: true as const,
          value,
        }))
        .catch((error: unknown) => ({
          ok: false as const,
          error,
        })),
      runtime.pointsTasksClient
        .getTasksOverview({
          accountId: request.accountId,
          ...(request.userId ? { userId: request.userId } : {}),
          ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
          window: selectedInsightWindow,
        })
        .then((value) => ({
          ok: true as const,
          value,
        }))
        .catch((error: unknown) => ({
          ok: false as const,
          error,
        })),
    ]);
    const pointsBalance = resolvePointsBalance(pointsSummary);
    const leadTask = taskList.items[0] ?? null;
    const taskTimelineStages = buildTaskTimelineStages(leadTask);
    const insightErrors: string[] = [];
    const pointsOverview = pointsOverviewResult.ok
      ? pointsOverviewResult.value
      : (() => {
          const uiError = capturePointsTasksPageError(runtime.logger, "/tasks/insights-points-overview", pointsOverviewResult.error);
          insightErrors.push(uiError.message);
          return undefined;
        })();
    const tasksOverview = tasksOverviewResult.ok
      ? tasksOverviewResult.value
      : (() => {
          const uiError = capturePointsTasksPageError(runtime.logger, "/tasks/insights-tasks-overview", tasksOverviewResult.error);
          insightErrors.push(uiError.message);
          return undefined;
        })();
    const insightsModel = buildPointsTasksPortfolioInsights({
      selectedWindow: selectedInsightWindow,
      ...(pointsOverview ? { pointsOverview } : {}),
      ...(tasksOverview ? { tasksOverview } : {}),
      ...(insightErrors.length > 0 ? { errorMessage: insightErrors.join(" ") } : {}),
    });
    const windowLinkSearchParams: Record<string, string | string[] | undefined> = {
      ...(searchParams ?? {}),
      account_id: request.accountId,
      ...(request.userId ? { user_id: request.userId } : {}),
      ...(request.workspaceId ? { workspace_id: request.workspaceId } : {}),
    };
    const windowOptions: InsightWindowOption[] = buildPointsTasksWindowLinks({
      route: "/tasks",
      searchParams: windowLinkSearchParams,
    }).map((link) => ({
      window: link.window,
      href: link.href,
      label: link.window,
    }));

    runtime.logger.info("Loaded tasks queue data", {
      mode: runtime.config.mode,
      accountId: request.accountId,
      workspaceId: request.workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      taskCount: taskList.items.length,
      totalTasks: summary.totalTasks,
      completedTasks: summary.completedTasks,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Tasks" description="Canonical tasks view with scope and cursor pagination.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <InlineStatusIndicators
            ariaLabel="Tasks route status indicators"
            items={[
              { id: "tasks-account-indicator", label: "Account", value: request.accountId, tone: "brand" },
              { id: "tasks-access-indicator", label: "Access", value: runtime.workspaceRole.label, tone: "neutral" },
            ]}
          />

          <PointsTasksTopPrioritySection
            route="tasks"
            pointsBalanceLabel={formatNumber(pointsBalance)}
            dailyClaimSurface={
              <DailyClaimCard
                surface="tasks"
                model={dailyClaim}
                scope={{
                  accountId: request.accountId,
                  ...(request.userId ? { userId: request.userId } : {}),
                  ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
                }}
                canOperate={canOperate}
                operateDeniedReason={operateDeniedReason}
              />
            }
          />

          <PointsTasksPortfolioInsightsCard
            model={insightsModel}
            selectedWindow={selectedInsightWindow}
            windowOptions={windowOptions}
          />

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Card title="Total tasks">
              <p style={{ margin: 0 }}>{summary.totalTasks}</p>
            </Card>
            <Card title="Completed tasks">
              <p style={{ margin: 0 }}>{summary.completedTasks}</p>
            </Card>
            <Card title="In progress tasks">
              <p style={{ margin: 0 }}>{summary.inProgressTasks}</p>
            </Card>
            <Card title="Overdue tasks">
              <p style={{ margin: 0 }}>{summary.overdueTasks}</p>
            </Card>
          </div>

          <TrustDisclosureCard
            title="Task progression trust notice"
            confirmationText="Task statuses represent the latest canonical task engine state for this account scope."
            retryText="Retry task loading only when the error module indicates retry is safe."
            processingText="Task progression timestamps may be partially unavailable and are labeled explicitly when absent."
          />

          {canOperate ? (
            <>
              <OperationTimelineCard
                title="Latest task progression timeline"
                state={taskTimelineStages.length > 0 ? "success" : "empty"}
                stages={taskTimelineStages}
                emptyMessage="No task timeline is available for the current scope."
              />

              <ComplianceEvidencePanel
                title="Latest task compliance evidence"
                summaryLabel="Details"
                sourceSystem="tasks_engine"
                retryable={resolveTaskRetryable(leadTask)}
                references={buildTaskEvidenceReferences(leadTask)}
                lastUpdated={leadTask?.updatedAt}
              />
            </>
          ) : (
            <Card title="Operational evidence">
              <p style={{ margin: 0 }}>{panelDeniedReason}</p>
            </Card>
          )}

          <PolicyLinksCard
            title="Tasks policy and help"
            description="Use these routes when validating task progression, scope, and diagnostics."
            links={[
              { href: "/status", label: "View Community Hub status diagnostics" },
              { href: "/points", label: "Open points ledger context" },
              { href: "/overview", label: "Open Community Hub operational overview" },
            ]}
          />

          <TasksTableClient items={taskList.items} pagination={taskList.pagination} currentUserId={runtime.sessionUserId} />

          {taskList.items.length === 0 ? (
            <EmptyState
              title="No tasks"
              description="No tasks were returned for the current scope and filter selection."
              actionLink={{ href: `/tasks?account_id=${encodeURIComponent(request.accountId)}`, label: "Clear to default view" }}
            />
          ) : null}
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePointsTasksPageError(runtime.logger, "/tasks", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Tasks" description="Canonical tasks view with scope and cursor pagination.">
          <ErrorState
            title="Unable to load tasks"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/tasks", label: "Retry tasks" }}
          />
        </Section>
      </section>
    );
  }
}
