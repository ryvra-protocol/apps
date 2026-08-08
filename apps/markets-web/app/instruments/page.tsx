import type { InstrumentFilters, MarketsListRequest } from "@ryvra/domain-markets";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { InstrumentsTableClient } from "../components/instruments-table-client";
import { ModeBadge } from "../components/mode-badge";
import { EmptyState, ErrorState, UnauthorizedState } from "../components/page-states";
import {
  getFirstParam,
  parseCursor,
  parseInstrumentAvailability,
  parseInstrumentClass,
  parseInstrumentStatus,
  parseLimit,
  parsePage,
  parseSortDirection,
  type RouteSearchParams,
} from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsInstrumentsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function buildInstrumentRequest(searchParams: RouteSearchParams): MarketsListRequest<InstrumentFilters> {
  const status = parseInstrumentStatus(searchParams);
  const assetClass = parseInstrumentClass(searchParams);
  const availability = parseInstrumentAvailability(searchParams);
  const q = getFirstParam(searchParams, "q")?.trim() ?? getFirstParam(searchParams, "search")?.trim();
  const sortField = getFirstParam(searchParams, "sortBy") ?? getFirstParam(searchParams, "sortField") ?? "updated_at";
  const cursor = parseCursor(searchParams);
  const deprecatedPage = parsePage(searchParams);

  const filters: InstrumentFilters = {
    ...(status ? { status } : {}),
    ...(assetClass ? { assetClass } : {}),
    ...(availability ? { availability } : {}),
    ...(q ? { q } : {}),
  };

  return {
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
      totalInstruments: summary.totalInstruments,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Instruments" description="Instrument catalog with typed filters and status-aligned availability.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Card title="Total">
              <p style={{ margin: 0 }}>{summary.totalInstruments}</p>
            </Card>
            <Card title="Tradable">
              <p style={{ margin: 0 }}>{summary.tradableInstruments}</p>
            </Card>
            <Card title="Halted">
              <p style={{ margin: 0 }}>{summary.haltedInstruments}</p>
            </Card>
          </div>

          <InstrumentsTableClient items={instrumentList.items} pagination={instrumentList.pagination} />

          {instrumentList.items.length === 0 ? (
            <EmptyState
              title="No instruments"
              description="No instruments matched the current filters."
              actionLink={{ href: "/instruments", label: "Reset filters" }}
            />
          ) : null}
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
