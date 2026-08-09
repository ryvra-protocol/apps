import type { ReactNode } from "react";
import { Card, themeTokens } from "@ryvra/ui";

interface PointsTasksTopPrioritySectionProps {
  route: "points" | "tasks";
  pointsBalanceLabel: string;
  dailyClaimSurface: ReactNode;
}

export function PointsTasksTopPrioritySection({
  route,
  pointsBalanceLabel,
  dailyClaimSurface,
}: PointsTasksTopPrioritySectionProps) {
  return (
    <div
      data-testid={`${route}-top-priority-zone`}
      style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}
    >
      <div data-testid={`${route}-points-balance-top-card`}>
        <Card title="Points balance">
          <p style={{ margin: 0, fontSize: themeTokens.typography.size.xl, fontWeight: themeTokens.typography.weight.semibold }}>
            {pointsBalanceLabel}
          </p>
        </Card>
      </div>
      <div data-testid={`${route}-daily-claim-top-surface`}>{dailyClaimSurface}</div>
    </div>
  );
}
