import type { MarketsAccountScopedListRequest, PositionFilters } from "@ryvra/domain-markets";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { EmptyState, ErrorState, UnauthorizedState } from "../components/page-states";
import { PositionsTableClient } from "../components/positions-table-client";
import {
  parseAccountId,
  parseCursor,
  getFirstParam,
  parseInstrumentClass,
  parseLimit,
  parsePage,
  parsePositionRiskFlags,
  parsePositionSide,
  parsePositionState,
  parseSortDirection,
  type RouteSearchParams,
} from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsPositionsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function buildPositionRequest(
  searchParams: RouteSearchParams,
  defaultAccountId: string | undefined,
): MarketsAccountScopedListRequest<PositionFilters> {
  const side = parsePositionSide(searchParams);
  const state = parsePositionState(searchParams);
  const assetClass = parseInstrumentClass(searchParams);
  const riskFlags = parsePositionRiskFlags(searchParams);
  const sortField = getFirstParam(searchParams, "sortBy") ?? getFirstParam(searchParams, "sortField") ?? "updated_at";
  const cursor = parseCursor(searchParams);
  const deprecatedPage = parsePage(searchParams);
  const accountId = parseAccountId(searchParams) ?? defaultAccountId ?? "";

  const filters: PositionFilters = {
    ...(side ? { side } : {}),
    ...(state ? { state } : {}),
    ...(assetClass ? { assetClass } : {}),
    ...(riskFlags ? { riskFlags } : {}),
  };

  return {
    accountId,
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    pagination: {
      limit: parseLimit(searchParams, 50),
      ...(cursor ? { cursor } : {}),
      ...(typeof deprecatedPage === "number" ? { page: deprecatedPage } : {}),
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
    const request = buildPositionRequest(searchParams, runtime.defaultAccountId);
    const [positionList, summary] = await Promise.all([
      runtime.marketsClient.listPositions(request),
      runtime.marketsClient.getPositionSummary({
        accountId: request.accountId,
        ...(request.filters ? { filters: request.filters } : {}),
      }),
    ]);

    runtime.logger.info("Loaded positions data", {
      mode: runtime.config.mode,
      positionCount: positionList.items.length,
      openPositions: summary.openPositions,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Positions" description="Position inventory with typed risk filters and exposure summaries.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Card title="Total positions">
              <p style={{ margin: 0 }}>{summary.totalPositions}</p>
            </Card>
            <Card title="Net exposure band">
              <p style={{ margin: 0 }}>{summary.netExposureBand}</p>
            </Card>
            <Card title="Open positions">
              <p style={{ margin: 0 }}>{summary.openPositions}</p>
            </Card>
          </div>

          <PositionsTableClient items={positionList.items} pagination={positionList.pagination} />

          {positionList.items.length === 0 ? (
            <EmptyState
              title="No positions"
              description="No positions matched the current account scope and filters."
              actionLink={{ href: "/positions", label: "Reset filters" }}
            />
          ) : null}
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
