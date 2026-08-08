import type { MarketsListRequest, PositionFilters } from "@ryvra/domain-markets";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { PositionsTableClient } from "../components/positions-table-client";
import {
  getFirstParam,
  parseDateRange,
  parsePage,
  parsePageSize,
  parsePositionRiskState,
  parsePositionSide,
  parseSortDirection,
  type RouteSearchParams,
} from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsPositionsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function buildPositionRequest(searchParams: RouteSearchParams): MarketsListRequest<PositionFilters> {
  const side = parsePositionSide(searchParams);
  const riskState = parsePositionRiskState(searchParams);
  const symbol = getFirstParam(searchParams, "symbol")?.trim();
  const search = getFirstParam(searchParams, "search")?.trim();
  const dateRange = parseDateRange(searchParams);
  const sortField = getFirstParam(searchParams, "sortField") ?? "updatedAt";

  const filters: PositionFilters = {
    ...(side ? { side } : {}),
    ...(riskState ? { riskState } : {}),
    ...(symbol ? { symbol } : {}),
    ...(search ? { search } : {}),
    ...(dateRange ? { dateRange } : {}),
  };

  return {
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    pagination: {
      page: parsePage(searchParams),
      pageSize: parsePageSize(searchParams, 20),
    },
    sort: {
      field: sortField,
      direction: parseSortDirection(searchParams),
    },
  };
}

export default async function MarketsPositionsPage({ searchParams }: MarketsPositionsPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:positions");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Positions" description="Access-controlled position and risk state view.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const request = buildPositionRequest(searchParams);
    const [positionList, summary] = await Promise.all([
      runtime.marketsClient.listPositions(request),
      runtime.marketsClient.getPositionSummary(request.filters),
    ]);

    runtime.logger.info("Loaded positions data", {
      mode: runtime.config.mode,
      positionCount: positionList.items.length,
      atRiskCount: summary.atRiskCount,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Positions" description="Position inventory with typed risk filters and exposure summaries.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Card title="Total positions">
              <p style={{ margin: 0 }}>{summary.totalCount}</p>
            </Card>
            <Card title="Net exposure band">
              <p style={{ margin: 0 }}>{summary.netExposureBand}</p>
            </Card>
            <Card title="At-risk count">
              <p style={{ margin: 0 }}>{summary.atRiskCount}</p>
            </Card>
          </div>

          <PositionsTableClient items={positionList.items} pagination={positionList.pagination} />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/positions", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Positions" description="Position inventory with typed risk filters and exposure summaries.">
          <ErrorState
            title="Unable to load positions"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/positions", label: "Retry positions" }}
          />
        </Section>
      </section>
    );
  }
}
