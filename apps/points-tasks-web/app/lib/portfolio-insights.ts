import {
  derivePortfolioAllocations,
  evaluatePortfolioWindowCoverage,
  normalizePortfolioInsightWindow,
  portfolioInsightWindows,
  resolvePortfolioInsightState,
  type PortfolioAllocationRow,
  type PortfolioInsightModuleState,
  type PortfolioInsightWindow,
} from "@ryvra/api-client";
import type { PointsOverviewDto } from "@ryvra/domain-points";
import type { TasksOverviewDto } from "@ryvra/domain-tasks";
import { formatInsightNumber } from "@ryvra/ui";
import type { RouteSearchParams } from "./search-params";

export interface InsightWindowLink {
  window: PortfolioInsightWindow;
  href: string;
}

export interface PointsTasksInsightKpi {
  id: string;
  label: string;
  value: string;
  tone: "positive" | "warning" | "neutral";
}

export interface PointsTasksTrendPoint {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
}

export interface PointsTasksPortfolioInsightsModel {
  state: PortfolioInsightModuleState;
  totalValueLabel: string;
  allocation: PortfolioAllocationRow[];
  trend: PointsTasksTrendPoint[];
  productivityKpis: PointsTasksInsightKpi[];
  fallbackMessage?: string;
  errorMessage?: string;
}

function getFirstParam(searchParams: RouteSearchParams, key: string): string | undefined {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function pickWindowCoverageMessage(input: {
  selectedWindow: PortfolioInsightWindow;
  pointsOverview?: PointsOverviewDto;
  tasksOverview?: TasksOverviewDto;
}): string | undefined {
  const messages: string[] = [];

  if (input.pointsOverview) {
    const coverage = evaluatePortfolioWindowCoverage({
      windowStart: input.pointsOverview.windowStart,
      windowEnd: input.pointsOverview.windowEnd,
      window: input.selectedWindow,
    });
    if (!coverage.covered && coverage.message) {
      messages.push(`Points: ${coverage.message}`);
    }
  }

  if (input.tasksOverview) {
    const coverage = evaluatePortfolioWindowCoverage({
      windowStart: input.tasksOverview.windowStart,
      windowEnd: input.tasksOverview.windowEnd,
      window: input.selectedWindow,
    });
    if (!coverage.covered && coverage.message) {
      messages.push(`Tasks: ${coverage.message}`);
    }
  }

  if (messages.length === 0) {
    return undefined;
  }

  return messages.join(" ");
}

function resolveKpiTone(value: number): PointsTasksInsightKpi["tone"] {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "warning";
  }

  return "neutral";
}

export function resolvePointsTasksInsightWindow(searchParams: RouteSearchParams): PortfolioInsightWindow {
  return normalizePortfolioInsightWindow(normalizeText(getFirstParam(searchParams, "window")));
}

export function buildPointsTasksWindowLinks(input: {
  route: "/points" | "/tasks";
  searchParams: RouteSearchParams;
}): InsightWindowLink[] {
  return portfolioInsightWindows.map((window) => ({
    window,
    href: buildPointsTasksWindowHref({
      route: input.route,
      searchParams: input.searchParams,
      window,
    }),
  }));
}

export function buildPointsTasksWindowHref(input: {
  route: "/points" | "/tasks";
  searchParams: RouteSearchParams;
  window: PortfolioInsightWindow;
}): string {
  const params = new URLSearchParams();
  if (input.searchParams) {
    for (const [key] of Object.entries(input.searchParams)) {
      const value = normalizeText(getFirstParam(input.searchParams, key));
      if (!value || key === "window") {
        continue;
      }

      params.set(key, value);
    }
  }

  params.set("window", input.window);
  return `${input.route}?${params.toString()}`;
}

export function buildPointsTasksPortfolioInsights(input: {
  selectedWindow: PortfolioInsightWindow;
  pointsOverview?: PointsOverviewDto;
  tasksOverview?: TasksOverviewDto;
  errorMessage?: string;
}): PointsTasksPortfolioInsightsModel {
  const hasData = Boolean(input.pointsOverview || input.tasksOverview);
  const state = resolvePortfolioInsightState({
    hasError: Boolean(input.errorMessage) && !hasData,
    hasData,
  });

  if (!hasData) {
    return {
      state,
      totalValueLabel: "Unavailable",
      allocation: [],
      trend: [],
      productivityKpis: [],
      ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    };
  }

  const pointsBalance = input.pointsOverview?.currentBalance ?? 0;
  const tasksCreated = input.tasksOverview?.tasksCreated ?? 0;
  const tasksCompleted = input.tasksOverview?.tasksCompleted ?? 0;
  const atRiskCount = input.tasksOverview?.atRisk.length ?? 0;
  const remainingTasks = Math.max(0, tasksCreated - tasksCompleted - atRiskCount);

  const allocation = derivePortfolioAllocations({
    rows: [
      {
        id: "tasks-completed",
        label: "Completed",
        value: tasksCompleted,
      },
      {
        id: "tasks-at-risk",
        label: "At-risk",
        value: atRiskCount,
      },
      {
        id: "tasks-remaining",
        label: "Remaining",
        value: remainingTasks,
      },
    ],
    totalValue: Math.max(1, tasksCreated),
    limit: 3,
  });

  const trend = (input.pointsOverview?.trend ?? []).slice(-6).map((bucket) => ({
    id: bucket.bucketStart,
    label: bucket.bucketStart.slice(5, 10),
    value: bucket.pointsEarned,
    valueLabel: `+${bucket.pointsEarned.toFixed(0)} pts`,
  }));

  const completionRate = input.tasksOverview?.completionRate ?? 0;
  const points24h = input.pointsOverview?.pointsLast24h ?? 0;
  const coverageFallbackMessage = pickWindowCoverageMessage({
    selectedWindow: input.selectedWindow,
    ...(input.pointsOverview ? { pointsOverview: input.pointsOverview } : {}),
    ...(input.tasksOverview ? { tasksOverview: input.tasksOverview } : {}),
  });
  const fallbackMessage = coverageFallbackMessage ?? (input.errorMessage ? "Some insight modules are unavailable for the selected scope." : undefined);

  return {
    state,
    totalValueLabel: `${formatInsightNumber(pointsBalance, 2)} PTS`,
    allocation,
    trend,
    productivityKpis: [
      {
        id: "points-24h",
        label: "Points (24h)",
        value: `${formatInsightNumber(points24h, 2)} pts`,
        tone: resolveKpiTone(points24h),
      },
      {
        id: "completion-rate",
        label: "Task completion",
        value: `${completionRate.toFixed(1)}%`,
        tone: resolveKpiTone(completionRate - 50),
      },
      {
        id: "tasks-completed",
        label: "Tasks completed",
        value: String(tasksCompleted),
        tone: resolveKpiTone(tasksCompleted),
      },
      {
        id: "at-risk-tasks",
        label: "At-risk tasks",
        value: String(atRiskCount),
        tone: atRiskCount > 0 ? "warning" : "positive",
      },
    ],
    ...(fallbackMessage ? { fallbackMessage } : {}),
    ...(input.errorMessage && hasData ? { errorMessage: input.errorMessage } : {}),
  };
}
