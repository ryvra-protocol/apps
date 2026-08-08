import type { PointsOverviewDto } from "@ryvra/domain-points";
import type { TasksOverviewDto } from "@ryvra/domain-tasks";
import type { RuntimeMode } from "@ryvra/config";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { formatDateTime, formatNumber, formatSignedPoints } from "../lib/format";
import { ModeBadge } from "./mode-badge";
import { StatusBadge } from "./status-badge";

interface PointsTasksOverviewContentProps {
  title: string;
  description: string;
  mode: RuntimeMode;
  baseUrl: string;
  accountId: string;
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
  const fromPoints: RecentActivityItem[] = pointsOverview.recentEntries.map((entry) => ({
    id: `point-${entry.id}`,
    happenedAt: entry.timestamp,
    label: `Point ${entry.type}: ${formatSignedPoints(entry.amount)} (${entry.source})`,
    status: entry.status,
  }));

  const fromTasks: RecentActivityItem[] = tasksOverview.recentTasks.map((task) => ({
    id: `task-${task.id}`,
    happenedAt: task.completedAt ?? task.updatedAt,
    label: `Task ${task.title} (${task.type}) • ${formatNumber(task.progressPercent, 0)}%`,
    status: task.status,
  }));

  return [...fromPoints, ...fromTasks]
    .sort((left, right) => (left.happenedAt < right.happenedAt ? 1 : -1))
    .slice(0, 10);
}

export function PointsTasksOverviewContent({
  title,
  description,
  mode,
  baseUrl,
  accountId,
  pointsOverview,
  tasksOverview,
}: PointsTasksOverviewContentProps) {
  const recentActivity = buildRecentActivity(pointsOverview, tasksOverview);

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <Section title={title} description={description}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
          <ModeBadge mode={mode} />
          <span style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>Base URL: {baseUrl}</span>
        </div>

        <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <Card title="Total points">
            <p style={{ margin: 0 }}>{formatNumber(pointsOverview.summary.totalPoints)}</p>
          </Card>
          <Card title="Earned points">
            <p style={{ margin: 0 }}>{formatNumber(pointsOverview.summary.earnedPoints)}</p>
          </Card>
          <Card title="Pending points">
            <p style={{ margin: 0 }}>{formatNumber(pointsOverview.summary.pendingPoints)}</p>
          </Card>
          <Card title="Adjusted points">
            <p style={{ margin: 0 }}>{formatNumber(pointsOverview.summary.adjustedPoints)}</p>
          </Card>
          <Card title="Open tasks">
            <p style={{ margin: 0 }}>{tasksOverview.summary.open}</p>
          </Card>
          <Card title="In-progress tasks">
            <p style={{ margin: 0 }}>{tasksOverview.summary.inProgress}</p>
          </Card>
          <Card title="Done tasks">
            <p style={{ margin: 0 }}>{tasksOverview.summary.done}</p>
          </Card>
          <Card title="Failed tasks">
            <p style={{ margin: 0 }}>{tasksOverview.summary.failed}</p>
          </Card>
        </div>

        <Card title="Runtime context">
          <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>
            Account: <strong>{accountId}</strong>
          </p>
          <p style={{ margin: 0 }}>Points as-of: {formatDateTime(pointsOverview.asOf)}</p>
          <p style={{ marginTop: themeTokens.spacing.xs, marginBottom: 0 }}>Tasks as-of: {formatDateTime(tasksOverview.asOf)}</p>
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
