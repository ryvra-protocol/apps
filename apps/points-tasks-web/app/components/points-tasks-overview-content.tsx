import type { PointsOverviewDto } from "@ryvra/domain-points";
import type { TasksOverviewDto } from "@ryvra/domain-tasks";
import type { RuntimeMode } from "@ryvra/config";
import { Card, GettingStartedChecklist, Section, themeTokens } from "@ryvra/ui";
import { formatDateTime, formatNumber, formatSignedPoints } from "../lib/format";
import { ModeBadge } from "./mode-badge";
import { StatusBadge } from "./status-badge";

interface PointsTasksOverviewContentProps {
  title: string;
  description: string;
  route: string;
  mode: RuntimeMode;
  baseUrl: string;
  accountId: string;
  workspaceId?: string;
  roleLabel: string;
  pointsOverview: PointsOverviewDto;
  tasksOverview: TasksOverviewDto;
}

interface RecentActivityItem {
  id: string;
  happenedAt: string;
  label: string;
  status: string;
}

function buildRecentActivity(pointsOverview: PointsOverviewDto, tasksOverview: TasksOverviewDto): RecentActivityItem[] {
  const fromPoints: RecentActivityItem[] = pointsOverview.trend.map((bucket) => ({
    id: `point-${bucket.bucketStart}`,
    happenedAt: bucket.bucketEnd,
    label: `Points earned ${formatSignedPoints(bucket.pointsEarned)} across ${formatNumber(bucket.entries, 0)} entries`,
    status: bucket.pointsEarned > 0 ? "confirmed" : "pending",
  }));

  const fromCompletedTasks: RecentActivityItem[] = tasksOverview.recentlyCompleted.map((task) => ({
    id: `task-completed-${task.taskId}`,
    happenedAt: tasksOverview.windowEnd,
    label: `Completed task ${task.taskId} (${task.taskType}) • ${formatNumber(task.progressPercent, 0)}%`,
    status: task.taskStatus,
  }));

  const fromAtRiskTasks: RecentActivityItem[] = tasksOverview.atRisk.map((task) => ({
    id: `task-risk-${task.taskId}`,
    happenedAt: tasksOverview.windowEnd,
    label: `At-risk task ${task.taskId} (${task.taskType}) • ${formatNumber(task.progressPercent, 0)}%`,
    status: task.progressState,
  }));

  return [...fromPoints, ...fromCompletedTasks, ...fromAtRiskTasks]
    .sort((left, right) => (left.happenedAt < right.happenedAt ? 1 : -1))
    .slice(0, 10);
}

export function PointsTasksOverviewContent({
  title,
  description,
  route,
  mode,
  baseUrl,
  accountId,
  workspaceId,
  roleLabel,
  pointsOverview,
  tasksOverview,
}: PointsTasksOverviewContentProps) {
  const recentActivity = buildRecentActivity(pointsOverview, tasksOverview);
  const scopeSearchParams = new URLSearchParams({
    account_id: accountId,
    ...(workspaceId ? { workspace_id: workspaceId } : {}),
  });
  const scopeQuery = scopeSearchParams.toString();
  const withScope = (href: string): string => (scopeQuery.length > 0 ? `${href}?${scopeQuery}` : href);

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title={title} description={description}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
          <ModeBadge mode={mode} />
          <span style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>Base URL: {baseUrl}</span>
        </div>

        <div
          data-testid="points-tasks-top-priority-zone"
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}
        >
          <GettingStartedChecklist
            appId="points-tasks-web"
            route={route}
            scope={{
              accountId,
              ...(workspaceId ? { workspaceId } : {}),
            }}
            scopeHref={withScope(route)}
            unifiedBalanceHref={withScope(route)}
            firstActionHref={withScope("/points")}
            firstActionLabel="Complete first claim or task action"
            notificationsHref={withScope("/status")}
          />
        </div>

        <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Card title="Current points balance">
            <p style={{ margin: 0 }}>{formatNumber(pointsOverview.currentBalance)}</p>
          </Card>
          <Card title="Lifetime points">
            <p style={{ margin: 0 }}>{formatNumber(pointsOverview.lifetimePoints)}</p>
          </Card>
          <Card title="Entries (24h)">
            <p style={{ margin: 0 }}>{formatNumber(pointsOverview.entriesLast24h, 0)}</p>
          </Card>
          <Card title="Points earned (24h)">
            <p style={{ margin: 0 }}>{formatSignedPoints(pointsOverview.pointsLast24h)}</p>
          </Card>
          <Card title="Completion rate">
            <p style={{ margin: 0 }}>{formatNumber(tasksOverview.completionRate, 2)}%</p>
          </Card>
          <Card title="Tasks created">
            <p style={{ margin: 0 }}>{formatNumber(tasksOverview.tasksCreated, 0)}</p>
          </Card>
          <Card title="Tasks completed">
            <p style={{ margin: 0 }}>{formatNumber(tasksOverview.tasksCompleted, 0)}</p>
          </Card>
          <Card title="At-risk tasks">
            <p style={{ margin: 0 }}>{formatNumber(tasksOverview.atRisk.length, 0)}</p>
          </Card>
        </div>

        <Card title="Runtime context">
          <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>
            Account: <strong>{accountId}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Workspace: <strong>{workspaceId ?? "workspace-core-1"}</strong>
          </p>
          <p style={{ marginTop: themeTokens.spacing.xs, marginBottom: 0 }}>
            Role: <strong>{roleLabel}</strong>
          </p>
          <p style={{ margin: 0 }}>Points window: {formatDateTime(pointsOverview.windowStart)} → {formatDateTime(pointsOverview.windowEnd)}</p>
          <p style={{ marginTop: themeTokens.spacing.xs, marginBottom: 0 }}>
            Tasks window: {formatDateTime(tasksOverview.windowStart)} → {formatDateTime(tasksOverview.windowEnd)}
          </p>
        </Card>

        <Card title="Recent activity">
          {recentActivity.length === 0 ? (
            <p style={{ margin: 0 }}>No recent points/tasks activity available.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: themeTokens.spacing.sm }}>
              {recentActivity.map((item) => (
                <li key={item.id} style={{ display: "grid", gap: themeTokens.spacing.xs }}>
                  <div style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
                    <StatusBadge status={item.status} />
                    <span>{item.label}</span>
                  </div>
                  <span style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
                    {formatDateTime(item.happenedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>
    </section>
  );
}
