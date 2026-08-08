import type { InstrumentFilters, MarketsListRequest } from "@ryvra/domain-markets";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { InstrumentsTableClient } from "../components/instruments-table-client";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { getFirstParam, parseInstrumentClass, parseInstrumentStatus, parsePage, parsePageSize, parseSortDirection, type RouteSearchParams } from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsInstrumentsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function buildInstrumentRequest(searchParams: RouteSearchParams): MarketsListRequest<InstrumentFilters> {
  const status = parseInstrumentStatus(searchParams);
  const assetClass = parseInstrumentClass(searchParams);
  const search = getFirstParam(searchParams, "search")?.trim();
  const sortField = getFirstParam(searchParams, "sortField") ?? "symbol";

  const filters: InstrumentFilters = {
    ...(status ? { status } : {}),
    ...(assetClass ? { assetClass } : {}),
    ...(search ? { search } : {}),
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

export default async function MarketsInstrumentsPage({ searchParams }: MarketsInstrumentsPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:instruments");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Instruments" description="Access-controlled instrument catalog and market availability view.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const request = buildInstrumentRequest(searchParams);
    const [instrumentList, summary] = await Promise.all([
      runtime.marketsClient.listInstruments(request),
      runtime.marketsClient.getInstrumentSummary(request.filters),
    ]);

    runtime.logger.info("Loaded instruments data", {
      mode: runtime.config.mode,
      instrumentCount: instrumentList.items.length,
      totalInstruments: summary.totalCount,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Instruments" description="Instrument catalog with typed filters and status-aligned availability.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Card title="Total">
              <p style={{ margin: 0 }}>{summary.totalCount}</p>
            </Card>
            <Card title="Active">
              <p style={{ margin: 0 }}>{summary.activeCount}</p>
            </Card>
            <Card title="Halted">
              <p style={{ margin: 0 }}>{summary.haltedCount}</p>
            </Card>
            <Card title="Tradable">
              <p style={{ margin: 0 }}>{summary.tradableCount}</p>
            </Card>
          </div>

          <InstrumentsTableClient items={instrumentList.items} pagination={instrumentList.pagination} />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/instruments", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Instruments" description="Instrument catalog with typed filters and status-aligned availability.">
          <ErrorState
            title="Unable to load instruments"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/instruments", label: "Retry instruments" }}
          />
        </Section>
      </section>
    );
  }
}
