import type {
  PointEntryFilters,
  PointsAccountScopedListRequest,
} from "@ryvra/domain-points";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { EmptyState, ErrorState, UnauthorizedState } from "../components/page-states";
import { PointsTableClient } from "../components/points-table-client";
import { DailyClaimCard } from "../components/daily-claim-card";
import { ModeBadge } from "../components/mode-badge";
import { formatNumber } from "../lib/format";
import { buildDailyClaimViewModel } from "../lib/daily-claim";
import { buildPointsSummaryRequest, resolvePointsBalance } from "../lib/points-balance";
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
    const summaryRequest = buildPointsSummaryRequest({
      accountId: request.accountId,
      ...(request.userId ? { userId: request.userId } : {}),
      ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
      ...(request.filters?.dateRange ? { dateRange: request.filters.dateRange } : {}),
      ...(window ? { window } : {}),
    });

    const [pointsList, summary, dailyClaim] = await Promise.all([
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
    ]);

    const pointsBalance = resolvePointsBalance(summary);

    runtime.logger.info("Loaded points ledger data", {
      mode: runtime.config.mode,
      accountId: request.accountId,
      pointEntryCount: pointsList.items.length,
      totalPoints: summary.totalPoints,
      availablePoints: summary.availablePoints,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Points" description="Canonical points entries view with scope and cursor pagination.">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
            <ModeBadge mode={runtime.config.mode} />
            <span style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
              Base URL: {runtime.config.apiBaseUrl} • Account: {request.accountId}
            </span>
          </div>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Card title="Points balance">
              <p style={{ margin: 0 }}>{formatNumber(pointsBalance)}</p>
            </Card>
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

          <DailyClaimCard
            model={dailyClaim}
            scope={{
              accountId: request.accountId,
              ...(request.userId ? { userId: request.userId } : {}),
              ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
            }}
          />

          <PointsTableClient items={pointsList.items} pagination={pointsList.pagination} />

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
