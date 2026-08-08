import type { TaskFilters, TasksAccountScopedListRequest, TasksAccountScopedRequest } from "@ryvra/domain-tasks";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { EmptyState, ErrorState, UnauthorizedState } from "../components/page-states";
import { TasksTableClient } from "../components/tasks-table-client";
import { ModeBadge } from "../components/mode-badge";
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

    const [taskList, summary] = await Promise.all([
      runtime.pointsTasksClient.listTasks(request),
      runtime.pointsTasksClient.getTaskSummary(summaryRequest),
    ]);

    runtime.logger.info("Loaded tasks queue data", {
      mode: runtime.config.mode,
      accountId: request.accountId,
      taskCount: taskList.items.length,
      totalTasks: summary.totalTasks,
      completedTasks: summary.completedTasks,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Tasks" description="Canonical tasks view with scope and cursor pagination.">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
            <ModeBadge mode={runtime.config.mode} />
            <span style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
              Base URL: {runtime.config.apiBaseUrl} • Account: {request.accountId}
            </span>
          </div>

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

          <TasksTableClient items={taskList.items} pagination={taskList.pagination} />

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
