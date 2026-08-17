import type {
  PointEntryFilters,
  PointsAccountScopedListRequest,
} from "@ryvra/domain-points";
import { canAccessWorkspaceCapability, describeWorkspaceCapabilityRequirement } from "@ryvra/auth";
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
import { EmptyState, ErrorState, UnauthorizedState } from "../components/page-states";
import { PointsTableClient } from "../components/points-table-client";
import { PointsTasksPortfolioInsightsCard } from "../components/points-tasks-portfolio-insights-card";
import { PointsTasksTopPrioritySection } from "../components/points-tasks-top-priority-section";
import { ModeBadge } from "../components/mode-badge";
import { formatNumber } from "../lib/format";
import { buildDailyClaimViewModel } from "../lib/daily-claim";
import {
  buildPointsTasksPortfolioInsights,
  buildPointsTasksWindowLinks,
  resolvePointsTasksInsightWindow,
} from "../lib/portfolio-insights";
import { buildPointsSummaryRequest, resolvePointsBalance } from "../lib/points-balance";
import { buildDailyClaimEvidenceReferences, buildDailyClaimTimelineStages } from "../lib/trust-compliance";
import {
  parseAccountId,
  parseCursor,
  parseLimit,
  parsePage,
  parsePointDateRange,
  parsePointEntrySource,
  parsePointEntryStatus,
  parsePointEntryType,
  parsePointSort,
  parsePointsWindow,
  parseUserId,
  parseWorkspaceId,
  type RouteSearchParams,
} from "../lib/search-params";
import { capturePointsTasksPageError, createPointsTasksRuntimeContext } from "../lib/runtime";

interface PointsPageProps {
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

function buildPointRequest(
  searchParams: RouteSearchParams,
  defaultAccountId: string | undefined,
): PointsAccountScopedListRequest<PointEntryFilters> {
  const entryStatus = parsePointEntryStatus(searchParams);
  const entryType = parsePointEntryType(searchParams);
  const entrySource = parsePointEntrySource(searchParams);
  const dateRange = parsePointDateRange(searchParams);
  const cursor = parseCursor(searchParams);
  const deprecatedPage = parsePage(searchParams);
  const accountId = parseAccountId(searchParams) ?? defaultAccountId ?? "";
  const userId = parseUserId(searchParams);
  const workspaceId = parseWorkspaceId(searchParams);

  const filters: PointEntryFilters = {
    ...(entryStatus ? { entryStatus } : {}),
    ...(entryType ? { entryType } : {}),
    ...(entrySource ? { entrySource } : {}),
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
      value: parsePointSort(searchParams),
    },
  };
}

export default async function PointsPage({ searchParams }: PointsPageProps) {
  const runtime = createPointsTasksRuntimeContext("points-tasks-web:points");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Points" description="Canonical points entries view with scope and cursor pagination.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const request = buildPointRequest(searchParams, runtime.defaultAccountId);

    if (!request.accountId) {
      return (
        <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
          <Section title="Points" description="Canonical points entries view with scope and cursor pagination.">
            <ErrorState
              title="Account scope is required"
              message="Set account_id in the URL or configure RYVRA_POINTS_TASKS_ACCOUNT_ID before requesting points data."
              source="runtime"
              retryable={false}
              retryLink={{ href: "/points", label: "Retry points" }}
            />
          </Section>
        </section>
      );
    }

    const window = parsePointsWindow(searchParams);
    const canOperate = canAccessWorkspaceCapability(runtime.workspaceRole, "operate");
    const operateDeniedReason = describeWorkspaceCapabilityRequirement("operate", runtime.workspaceRole, "Claim submission");
    const panelDeniedReason = describeWorkspaceCapabilityRequirement("operate", runtime.workspaceRole, "Operational evidence panels");
    const selectedInsightWindow = resolvePointsTasksInsightWindow(searchParams);
    const summaryRequest = buildPointsSummaryRequest({
      accountId: request.accountId,
      ...(request.userId ? { userId: request.userId } : {}),
      ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
      ...(request.filters?.dateRange ? { dateRange: request.filters.dateRange } : {}),
      ...(window ? { window } : {}),
    });

    const [pointsList, summary, dailyClaim, pointsOverviewResult, tasksOverviewResult] = await Promise.all([
      runtime.pointsTasksClient.listPointEntries(request),
      runtime.pointsTasksClient.getPointSummary(summaryRequest),
      runtime.pointsTasksClient
        .getDailyClaimStatus(summaryRequest)
        .then((claimState) =>
          buildDailyClaimViewModel({
            claimState,
            nowIso: new Date().toISOString(),
            claimStatusEndpointAvailable: true,
            expectedAccountId: request.accountId,
          }),
        )
        .catch((error) => {
          const uiError = capturePointsTasksPageError(runtime.logger, "/points/daily-claim", error);
          return buildDailyClaimViewModel({
            nowIso: new Date().toISOString(),
            claimStatusEndpointAvailable: false,
            expectedAccountId: request.accountId,
            endpointErrorMessage: uiError.message,
            endpointRetryable: uiError.retryable,
            retryHref: `/points?account_id=${encodeURIComponent(request.accountId)}`,
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

    const pointsBalance = resolvePointsBalance(summary);
    const dailyClaimObservedAt = new Date().toISOString();
    const dailyClaimTimeline = buildDailyClaimTimelineStages(dailyClaim, dailyClaimObservedAt);
    const insightErrors: string[] = [];
    const pointsOverview = pointsOverviewResult.ok
      ? pointsOverviewResult.value
      : (() => {
          const uiError = capturePointsTasksPageError(runtime.logger, "/points/insights-points-overview", pointsOverviewResult.error);
          insightErrors.push(uiError.message);
          return undefined;
        })();
    const tasksOverview = tasksOverviewResult.ok
      ? tasksOverviewResult.value
      : (() => {
          const uiError = capturePointsTasksPageError(runtime.logger, "/points/insights-tasks-overview", tasksOverviewResult.error);
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
      route: "/points",
      searchParams: windowLinkSearchParams,
    }).map((link) => ({
      window: link.window,
      href: link.href,
      label: link.window,
    }));

    runtime.logger.info("Loaded points ledger data", {
      mode: runtime.config.mode,
      accountId: request.accountId,
      workspaceId: request.workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      pointEntryCount: pointsList.items.length,
      totalPoints: summary.totalPoints,
      availablePoints: summary.availablePoints,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Points" description="Canonical points entries view with scope and cursor pagination.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <InlineStatusIndicators
            ariaLabel="Points route status indicators"
            items={[
              { id: "points-account-indicator", label: "Account", value: request.accountId, tone: "brand" },
              { id: "points-access-indicator", label: "Access", value: runtime.workspaceRole.label, tone: "neutral" },
            ]}
          />

          <PointsTasksTopPrioritySection
            route="points"
            pointsBalanceLabel={formatNumber(pointsBalance)}
            dailyClaimSurface={
              <DailyClaimCard
                surface="points"
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
            <Card title="Total points">
              <p style={{ margin: 0 }}>{formatNumber(summary.totalPoints)}</p>
            </Card>
            <Card title="Pending">
              <p style={{ margin: 0 }}>{formatNumber(summary.pendingPoints)}</p>
            </Card>
            <Card title="Reversed">
              <p style={{ margin: 0 }}>{formatNumber(summary.reversedPoints)}</p>
            </Card>
            <Card title="Entries">
              <p style={{ margin: 0 }}>{formatNumber(summary.entryCount, 0)}</p>
            </Card>
          </div>

          <TrustDisclosureCard
            title="Daily claim trust notice"
            confirmationText="Claim eligibility shown here is read-only status metadata from the points/tasks API."
            retryText="Retry only when the claim status module reports retryable guidance."
            processingText="If references are unavailable, they are explicitly marked as unavailable in this environment."
          />

          {canOperate ? (
            <>
              <OperationTimelineCard
                title="Daily claim operation timeline"
                state={dailyClaimTimeline.length > 0 ? "success" : "empty"}
                stages={dailyClaimTimeline}
                emptyMessage="Daily claim timeline data is unavailable."
              />

              <ComplianceEvidencePanel
                title="Daily claim compliance evidence"
                summaryLabel="Details"
                sourceSystem="points_tasks_api"
                retryable={dailyClaim.retryable}
                references={buildDailyClaimEvidenceReferences(request.accountId)}
                lastUpdated={dailyClaim.nextEligibleAt ?? dailyClaimObservedAt}
              />
            </>
          ) : (
            <Card title="Operational evidence">
              <p style={{ margin: 0 }}>{panelDeniedReason}</p>
            </Card>
          )}

          <PolicyLinksCard
            title="Points policy and help"
            description="Open diagnostics and scope context before retrying claim status checks."
            links={[
              { href: "/status", label: "View Community Hub status diagnostics" },
              { href: "/tasks", label: "Review related task progression" },
              { href: "/overview", label: "Open Community Hub operational overview" },
            ]}
          />

          <PointsTableClient items={pointsList.items} pagination={pointsList.pagination} currentUserId={runtime.sessionUserId} />

          {pointsList.items.length === 0 ? (
            <EmptyState
              title="No points entries"
              description="No point entries were returned for the current scope and filter selection."
              actionLink={{ href: `/points?account_id=${encodeURIComponent(request.accountId)}`, label: "Clear to default view" }}
            />
          ) : null}
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePointsTasksPageError(runtime.logger, "/points", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Points" description="Canonical points entries view with scope and cursor pagination.">
          <ErrorState
            title="Unable to load points"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/points", label: "Retry points" }}
          />
        </Section>
      </section>
    );
  }
}
